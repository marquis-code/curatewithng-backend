import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto, createPaginatedResponse } from '../../shared/pagination/pagination.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id).select('-passwordHash');
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() });
  }

  async findByGoogleId(googleId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ googleId });
  }

  async create(data: Partial<User>): Promise<UserDocument> {
    const user = new this.userModel(data);
    return user.save();
  }

  async update(id: string, updateData: UpdateUserDto): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(id, { $set: updateData }, { new: true })
      .select('-passwordHash');
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findAll(query: PaginationDto & { role?: string; search?: string }) {
    const { page, limit, sort, order, role, search } = query;
    const filter: Record<string, unknown> = {};

    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const sortObj: Record<string, 1 | -1> = {};
    sortObj[sort || 'createdAt'] = order === 'asc' ? 1 : -1;

    const [data, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select('-passwordHash')
        .sort(sortObj)
        .skip((page - 1) * limit)
        .limit(limit),
      this.userModel.countDocuments(filter),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async addRecipient(userId: string, recipient: User['recipients'][0]) {
    return this.userModel.findByIdAndUpdate(
      userId,
      { $push: { recipients: recipient } },
      { new: true },
    ).select('-passwordHash');
  }

  async removeRecipient(userId: string, recipientIndex: number) {
    const user = await this.findById(userId);
    user.recipients.splice(recipientIndex, 1);
    return user.save();
  }

  async updatePreferences(userId: string, preferences: User['preferences']) {
    return this.userModel.findByIdAndUpdate(
      userId,
      { $set: { preferences } },
      { new: true },
    ).select('-passwordHash');
  }

  async toggleActive(id: string, isActive: boolean) {
    return this.userModel.findByIdAndUpdate(id, { isActive }, { new: true }).select('-passwordHash');
  }

  async setVerified(id: string) {
    return this.userModel.findByIdAndUpdate(id, { isVerified: true }, { new: true });
  }

  async countByRole() {
    return this.userModel.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]);
  }
}
