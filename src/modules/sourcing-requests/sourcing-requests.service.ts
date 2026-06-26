import { Injectable, NotFoundException, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SourcingRequest, SourcingRequestDocument, SourcingStatus } from './schemas/sourcing-request.schema';
import { CreateSourcingRequestDto } from './dto/create-sourcing-request.dto';
import { UpdateSourcingRequestDto } from './dto/update-sourcing-request.dto';
import { PaginationDto, createPaginatedResponse } from '../../shared/pagination/pagination.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { SettingsService } from '../settings/settings.service';
import { RedisCacheService } from '../../shared/cache/cache.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SourcingRequestsService {
  constructor(
    @InjectModel(SourcingRequest.name) private sourcingModel: Model<SourcingRequestDocument>,
    private notificationsService: NotificationsService,
    private settingsService: SettingsService,
    private readonly cacheService: RedisCacheService,
    private configService: ConfigService,
  ) {}

  async create(createDto: CreateSourcingRequestDto, ip: string, userId?: string) {
    // Rate Limiting: 5 requests per hour per IP
    const rateLimitKey = `sourcing_rate_limit:${ip}`;
    const count = await this.cacheService.increment(rateLimitKey, 3600);
    
    if (count > 5) {
      throw new HttpException('Too many sourcing requests from this IP. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const existingIdea = await this.sourcingModel.findOne({ 
      giftIdea: { $regex: new RegExp('^' + createDto.giftIdea + '$', 'i') } 
    });

    let requestCount = 1;
    let isTrending = false;
    const trendingThreshold = this.configService.get<number>('SOURCING_TRENDING_THRESHOLD') || 10;

    if (existingIdea) {
      requestCount = existingIdea.requestCount + 1;
      isTrending = requestCount >= trendingThreshold;
      
      await this.sourcingModel.updateMany(
        { giftIdea: existingIdea.giftIdea },
        { $set: { requestCount, isTrending } }
      );
    }

    const created = new this.sourcingModel({
      ...createDto,
      userId: userId ? new Types.ObjectId(userId) : undefined,
      requestCount,
      isTrending,
      status: SourcingStatus.PENDING,
    });

    return created.save();
  }

  async findAll(query: PaginationDto) {
    const { page, limit } = query;
    const [data, total] = await Promise.all([
      this.sourcingModel
        .find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('userId', 'firstName lastName email'),
      this.sourcingModel.countDocuments(),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async findTrending() {
    const trendingThreshold = this.configService.get<number>('SOURCING_TRENDING_THRESHOLD') || 10;
    return this.sourcingModel.aggregate([
      { $group: {
          _id: { $toLower: "$giftIdea" },
          giftIdea: { $first: "$giftIdea" },
          requestCount: { $max: "$requestCount" },
          isTrending: { $first: "$isTrending" },
          latestRequestAt: { $max: "$createdAt" }
      }},
      { $sort: { requestCount: -1 } },
      { $limit: 20 }
    ]);
  }

  async findOne(id: string) {
    const request = await this.sourcingModel
      .findById(id)
      .populate('userId', 'firstName lastName email');
    if (!request) {
      throw new NotFoundException(`Sourcing request #${id} not found`);
    }
    return request;
  }

  async update(id: string, updateDto: UpdateSourcingRequestDto) {
    const updateData: any = { ...updateDto };

    if (updateDto.vendorMatch) {
      updateData.vendorMatch = new Types.ObjectId(updateDto.vendorMatch);
    }

    const updated = await this.sourcingModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    if (!updated) {
      throw new NotFoundException(`Sourcing request #${id} not found`);
    }

    return updated;
  }

  async setQuote(id: string, amount: number) {
    const request = await this.findOne(id);
    
    // Fetch fee tiers
    const settings = await this.settingsService.getSettings();
    let feePercentage = 15; // default fallback
    
    for (const tier of settings.sourcingFeeTiers) {
      if (amount >= tier.minAmount && (!tier.maxAmount || amount <= tier.maxAmount)) {
        feePercentage = tier.percentage;
        break;
      }
    }

    const sourcingFee = Math.round(amount * (feePercentage / 100));
    const total = amount + sourcingFee;

    const updated = await this.sourcingModel.findByIdAndUpdate(
      id,
      {
        $set: {
          quote: {
            amount,
            sourcingFee,
            total,
            sentAt: new Date(),
            expiresAt: new Date(Date.now() + (this.configService.get<number>('SOURCING_QUOTE_EXPIRY_HOURS') || 48) * 3600000)
          },
          status: SourcingStatus.QUOTED,
        }
      },
      { new: true }
    );

    if (!updated) {
      throw new NotFoundException('Sourcing Request not found');
    }

    if (updated.userId) {
      await this.notificationsService.create({
        userId: updated.userId.toString(),
        type: 'SOURCING_QUOTE',
        title: 'Your Sourcing Request has been Quoted!',
        body: `We have found a match and generated a quote of ₦${(total / 100).toLocaleString()} for your request.`,
        metadata: {
          requestId: updated._id.toString()
        }
      });
      // TODO: queue send-quote-email BullMQ job
    }

    return updated;
  }

  async acceptQuote(id: string, userId: string) {
    const request = await this.findOne(id);
    if (request.status !== SourcingStatus.QUOTED) {
      throw new BadRequestException('Request is not in QUOTED status');
    }
    
    if (request.userId?.toString() !== userId) {
      throw new BadRequestException('You do not have permission to accept this quote');
    }

    if (request.quote?.expiresAt && new Date() > request.quote.expiresAt) {
      throw new BadRequestException('Quote has expired. Please request a new quote.');
    }

    const updated = await this.sourcingModel.findByIdAndUpdate(
      id,
      { $set: { quoteAcceptedAt: new Date() } },
      { new: true }
    );

    return updated;
  }
}
