import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import slugify from 'slugify';
import { Vendor, VendorDocument } from './schemas/vendor.schema';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { PaginationDto, createPaginatedResponse } from '../../shared/pagination/pagination.dto';
import { EncryptionUtil } from '../../shared/utils/encryption.util';
import { UsersService } from '../users/users.service';
import { UserRole } from '../../shared/types';

@Injectable()
export class VendorsService {
  constructor(
    @InjectModel(Vendor.name) private vendorModel: Model<VendorDocument>,
    private usersService: UsersService,
  ) {}

  async create(userId: string, dto: CreateVendorDto): Promise<VendorDocument> {
    const existing = await this.vendorModel.findOne({ userId: new Types.ObjectId(userId) });
    if (existing) {
      throw new ConflictException('User already has a vendor profile');
    }

    let slug = slugify(dto.businessName, { lower: true, strict: true });
    const slugExists = await this.vendorModel.findOne({ slug });
    if (slugExists) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    // Encrypt bank account number
    const vendorData: Partial<Vendor> = {
      userId: new Types.ObjectId(userId),
      businessName: dto.businessName,
      slug,
      description: dto.description,
      logo: dto.logo,
      coverImage: dto.coverImage,
      categories: dto.categories,
      location: dto.location,
    };

    if (dto.bankDetails) {
      vendorData.bankDetails = {
        bankName: dto.bankDetails.bankName,
        accountNumber: EncryptionUtil.encrypt(dto.bankDetails.accountNumber),
        accountName: dto.bankDetails.accountName,
      };
    }

    const vendor = new this.vendorModel(vendorData);
    return vendor.save();
  }

  async findAll(query: PaginationDto & { category?: string; state?: string; search?: string; approved?: string }) {
    const { page, limit, sort, order, category, state, search, approved } = query;
    const filter: Record<string, unknown> = {};

    // Default to only approved & active vendors for public
    if (approved !== undefined) {
      filter.isApproved = approved === 'true';
    } else {
      filter.isApproved = true;
      filter.isActive = true;
    }

    if (category) filter.categories = { $in: [category] };
    if (state) filter['location.state'] = state;
    if (search) {
      filter.businessName = { $regex: search, $options: 'i' };
    }

    const sortObj: Record<string, 1 | -1> = {};
    sortObj[sort || 'createdAt'] = order === 'asc' ? 1 : -1;

    const [data, total] = await Promise.all([
      this.vendorModel
        .find(filter)
        .select('-bankDetails')
        .sort(sortObj)
        .skip((page - 1) * limit)
        .limit(limit),
      this.vendorModel.countDocuments(filter),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async findBySlug(slug: string): Promise<VendorDocument> {
    const vendor = await this.vendorModel.findOne({ slug, isApproved: true, isActive: true }).select('-bankDetails');
    if (!vendor) throw new NotFoundException('Vendor not found');
    return vendor;
  }

  async findById(id: string): Promise<VendorDocument> {
    const vendor = await this.vendorModel.findById(id);
    if (!vendor) throw new NotFoundException('Vendor not found');
    return vendor;
  }

  async findByUserId(userId: string): Promise<VendorDocument> {
    const vendor = await this.vendorModel.findOne({ userId: new Types.ObjectId(userId) });
    if (!vendor) throw new NotFoundException('Vendor profile not found');
    return vendor;
  }

  async update(id: string, dto: UpdateVendorDto): Promise<VendorDocument> {
    const updateData: Record<string, unknown> = { ...dto };

    if (dto.bankDetails) {
      updateData.bankDetails = {
        bankName: dto.bankDetails.bankName,
        accountNumber: EncryptionUtil.encrypt(dto.bankDetails.accountNumber),
        accountName: dto.bankDetails.accountName,
      };
    }

    const vendor = await this.vendorModel.findByIdAndUpdate(id, { $set: updateData }, { new: true });
    if (!vendor) throw new NotFoundException('Vendor not found');
    return vendor;
  }

  async approve(id: string): Promise<VendorDocument> {
    const vendor = await this.vendorModel.findByIdAndUpdate(
      id,
      { isApproved: true, approvedAt: new Date() },
      { new: true },
    );
    if (!vendor) throw new NotFoundException('Vendor not found');

    // Update user role to VENDOR
    await this.usersService.update(vendor.userId.toString(), { role: UserRole.VENDOR } as any);
    return vendor;
  }

  async reject(id: string): Promise<VendorDocument> {
    const vendor = await this.vendorModel.findByIdAndUpdate(
      id,
      { isApproved: false },
      { new: true },
    );
    if (!vendor) throw new NotFoundException('Vendor not found');
    return vendor;
  }

  async getStats() {
    const [total, approved, pending] = await Promise.all([
      this.vendorModel.countDocuments(),
      this.vendorModel.countDocuments({ isApproved: true }),
      this.vendorModel.countDocuments({ isApproved: false }),
    ]);
    return { total, approved, pending };
  }

  async updateEarnings(vendorId: string, amount: number) {
    return this.vendorModel.findByIdAndUpdate(
      vendorId,
      { $inc: { totalEarnings: amount, pendingPayout: amount } },
      { new: true },
    );
  }

  async processPayout(vendorId: string, amount: number) {
    return this.vendorModel.findByIdAndUpdate(
      vendorId,
      { $inc: { pendingPayout: -amount } },
      { new: true },
    );
  }
}
