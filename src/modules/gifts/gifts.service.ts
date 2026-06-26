import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import slugify from 'slugify';
import { Gift, GiftDocument } from './schemas/gift.schema';
import { CreateGiftDto } from './dto/create-gift.dto';
import { UpdateGiftDto } from './dto/update-gift.dto';
import { FilterGiftsDto } from './dto/filter-gifts.dto';
import { PaginationDto, createPaginatedResponse } from '../../shared/pagination/pagination.dto';
import { RedisCacheService } from '../../shared/cache/cache.service';

@Injectable()
export class GiftsService {
  constructor(
    @InjectModel(Gift.name) private giftModel: Model<GiftDocument>,
    private cacheService: RedisCacheService,
  ) {}

  async create(vendorId: string, dto: CreateGiftDto): Promise<GiftDocument> {
    let slug = slugify(dto.name, { lower: true, strict: true });
    const slugExists = await this.giftModel.findOne({ slug });
    if (slugExists) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const gift = new this.giftModel({
      ...dto,
      vendorId: new Types.ObjectId(vendorId),
      slug,
    });

    const saved = await gift.save();

    // Invalidate vendor product cache
    await this.cacheService.del(`vendor-products:${vendorId}`);
    await this.cacheService.delPattern('gift-pool:*');
    await this.cacheService.del('featured-gifts');

    return saved;
  }

  async findAll(query: FilterGiftsDto) {
    const {
      page = 1,
      limit = 20,
      sort,
      order,
      category,
      occasion,
      recipientType,
      budgetTier,
      vendorId,
      minPrice,
      maxPrice,
      search,
      approved,
      featured,
    } = query;

    const filter: Record<string, unknown> = {
      isDeleted: false,
    };

    // Default to approved & available for public queries
    if (approved !== undefined) {
      filter.isApproved = approved === 'true';
    } else {
      filter.isApproved = true;
      filter.isAvailable = true;
    }

    if (category) filter.category = category;
    if (occasion) filter.occasions = { $in: [occasion] };
    if (recipientType) filter.recipientTypes = { $in: [recipientType] };
    if (budgetTier) filter.budgetTier = budgetTier;
    if (vendorId) filter.vendorId = new Types.ObjectId(vendorId);
    if (featured === 'true') filter.isFeatured = true;

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) (filter.price as Record<string, number>).$gte = Number(minPrice);
      if (maxPrice) (filter.price as Record<string, number>).$lte = Number(maxPrice);
    }

    if (search) {
      filter.$text = { $search: search };
    }

    const sortObj: Record<string, 1 | -1> = {};
    if (sort === 'price') {
      sortObj.price = order === 'asc' ? 1 : -1;
    } else if (sort === 'rating') {
      sortObj.rating = -1;
    } else if (sort === 'popular') {
      sortObj.reviewCount = -1;
    } else {
      sortObj.createdAt = order === 'asc' ? 1 : -1;
    }

    const [data, total] = await Promise.all([
      this.giftModel
        .find(filter)
        .populate('vendorId', 'businessName slug logo')
        .sort(sortObj)
        .skip((page - 1) * limit)
        .limit(limit),
      this.giftModel.countDocuments(filter),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async findBySlug(slug: string): Promise<GiftDocument> {
    const gift = await this.giftModel
      .findOne({ slug, isApproved: true, isDeleted: false })
      .populate('vendorId', 'businessName slug logo location rating');
    if (!gift) throw new NotFoundException('Gift not found');
    return gift;
  }

  async findById(id: string): Promise<GiftDocument> {
    const gift = await this.giftModel.findById(id).populate('vendorId', 'businessName slug logo');
    if (!gift) throw new NotFoundException('Gift not found');
    return gift;
  }

  async findByVendor(vendorId: string, query: PaginationDto) {
    const cacheKey = `vendor-products:${vendorId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const { page, limit } = query;
    const filter = { vendorId: new Types.ObjectId(vendorId), isDeleted: false };

    const [data, total] = await Promise.all([
      this.giftModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      this.giftModel.countDocuments(filter),
    ]);

    const result = createPaginatedResponse(data, total, page, limit);
    await this.cacheService.set(cacheKey, result, 300); // 5 min cache
    return result;
  }

  async update(id: string, dto: UpdateGiftDto): Promise<GiftDocument> {
    const gift = await this.giftModel.findByIdAndUpdate(id, { $set: dto }, { new: true });
    if (!gift) throw new NotFoundException('Gift not found');

    await this.cacheService.del(`vendor-products:${gift.vendorId}`);
    await this.cacheService.delPattern('gift-pool:*');

    return gift;
  }

  async softDelete(id: string): Promise<void> {
    const gift = await this.giftModel.findByIdAndUpdate(id, { isDeleted: true });
    if (!gift) throw new NotFoundException('Gift not found');
    await this.cacheService.del(`vendor-products:${gift.vendorId}`);
  }

  async approve(id: string): Promise<GiftDocument> {
    const gift = await this.giftModel.findByIdAndUpdate(id, { isApproved: true }, { new: true });
    if (!gift) throw new NotFoundException('Gift not found');
    await this.cacheService.delPattern('gift-pool:*');
    return gift;
  }

  async toggleFeatured(id: string): Promise<GiftDocument> {
    const gift = await this.giftModel.findById(id);
    if (!gift) throw new NotFoundException('Gift not found');
    gift.isFeatured = !gift.isFeatured;
    await gift.save();
    await this.cacheService.del('featured-gifts');
    return gift;
  }

  async getFeatured(): Promise<GiftDocument[]> {
    const cacheKey = 'featured-gifts';
    const cached = await this.cacheService.get<GiftDocument[]>(cacheKey);
    if (cached) return cached;

    const featured = await this.giftModel
      .find({ isFeatured: true, isApproved: true, isAvailable: true, isDeleted: false })
      .populate('vendorId', 'businessName slug logo')
      .limit(12);

    await this.cacheService.set(cacheKey, featured, 1800); // 30 min
    return featured;
  }

  async updateAiTags(id: string, aiTags: string[]): Promise<void> {
    await this.giftModel.findByIdAndUpdate(id, { aiTags });
  }

  async getProductPool(occasion: string, budgetMin: number, budgetMax: number): Promise<GiftDocument[]> {
    const budgetTier = this.getBudgetTier(budgetMax);
    const cacheKey = `gift-pool:${occasion}:${budgetTier}`;
    const cached = await this.cacheService.get<GiftDocument[]>(cacheKey);
    if (cached) return cached;

    const products = await this.giftModel
      .find({
        isApproved: true,
        isAvailable: true,
        isDeleted: false,
        stock: { $gt: 0 },
        occasions: { $in: [occasion] },
        price: { $gte: budgetMin, $lte: budgetMax },
      })
      .select('name category price tags occasions recipientTypes description images')
      .limit(50);

    await this.cacheService.set(cacheKey, products, 600); // 10 min
    return products;
  }

  async decrementStock(giftId: string, quantity: number): Promise<void> {
    await this.giftModel.findByIdAndUpdate(giftId, {
      $inc: { stock: -quantity },
    });
  }

  async incrementStock(giftId: string, quantity: number): Promise<void> {
    await this.giftModel.findByIdAndUpdate(giftId, {
      $inc: { stock: quantity },
    });
  }

  private getBudgetTier(maxPrice: number): string {
    if (maxPrice <= 20000) return 'BUDGET';
    if (maxPrice <= 50000) return 'MID';
    if (maxPrice <= 150000) return 'PREMIUM';
    return 'LUXURY';
  }

  async countActiveGifts(vendorId: string): Promise<number> {
    return this.giftModel.countDocuments({
      vendorId: new Types.ObjectId(vendorId),
      isActive: true,
      isApproved: true,
      isDeleted: false,
    });
  }
}
