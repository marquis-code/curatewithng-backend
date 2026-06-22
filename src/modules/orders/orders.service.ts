import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Order, OrderDocument } from './schemas/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus, PaymentStatus, UserRole } from '../../shared/types';
import { PaginationDto, createPaginatedResponse } from '../../shared/pagination/pagination.dto';
import { GiftsService } from '../gifts/gifts.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private giftsService: GiftsService,
    private configService: ConfigService,
  ) {}

  async create(userId: string, dto: CreateOrderDto): Promise<OrderDocument> {
    const platformFeePercent = this.configService.get<number>('PLATFORM_FEE_PERCENT', 10);

    // Calculate totals
    let totalAmount = 0;
    const items = dto.items.map((item) => {
      const subtotal = item.unitPrice * item.quantity;
      totalAmount += subtotal;
      return {
        giftId: new Types.ObjectId(item.giftId),
        vendorId: new Types.ObjectId(item.vendorId),
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal,
      };
    });

    const platformFee = Math.round(totalAmount * (platformFeePercent / 100));
    const vendorAmount = totalAmount - platformFee;

    // Generate order number
    const orderNumber = await this.generateOrderNumber();

    const order = new this.orderModel({
      orderNumber,
      userId: new Types.ObjectId(userId),
      items,
      recipient: dto.recipient,
      totalAmount,
      platformFee,
      vendorAmount,
      curationSessionId: dto.curationSessionId,
      timeline: [{ status: OrderStatus.PENDING, timestamp: new Date(), note: 'Order created' }],
    });

    return order.save();
  }

  async findAll(query: PaginationDto & { status?: string; userId?: string; vendorId?: string }) {
    const { page, limit, status, userId, vendorId } = query;
    const filter: Record<string, unknown> = {};

    if (status) filter.status = status;
    if (userId) filter.userId = new Types.ObjectId(userId);
    if (vendorId) filter['items.vendorId'] = new Types.ObjectId(vendorId);

    const [data, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('userId', 'firstName lastName email')
        .populate('items.giftId', 'name slug images price'),
      this.orderModel.countDocuments(filter),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async findById(id: string): Promise<OrderDocument> {
    const order = await this.orderModel
      .findById(id)
      .populate('userId', 'firstName lastName email phone')
      .populate('items.giftId', 'name slug images price')
      .populate('items.vendorId', 'businessName slug');
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async findByOrderNumber(orderNumber: string): Promise<OrderDocument> {
    const order = await this.orderModel
      .findOne({ orderNumber })
      .populate('userId', 'firstName lastName email phone')
      .populate('items.giftId', 'name slug images price');
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async updateStatus(id: string, status: OrderStatus, note?: string): Promise<OrderDocument> {
    const order = await this.orderModel.findById(id);
    if (!order) throw new NotFoundException('Order not found');

    order.status = status;
    order.timeline.push({ status, timestamp: new Date(), note: note || '' });
    return order.save();
  }

  async updatePaymentStatus(reference: string, transactionId: string): Promise<OrderDocument> {
    const order = await this.orderModel.findOne({ paystackReference: reference });
    if (!order) throw new NotFoundException('Order not found for reference');

    order.paymentStatus = PaymentStatus.PAID;
    order.paystackTransactionId = transactionId;
    order.status = OrderStatus.CONFIRMED;
    order.timeline.push({
      status: OrderStatus.CONFIRMED,
      timestamp: new Date(),
      note: 'Payment confirmed',
    });

    // Decrement stock for each item
    for (const item of order.items) {
      await this.giftsService.decrementStock(item.giftId.toString(), item.quantity);
    }

    return order.save();
  }

  async setPaystackReference(orderId: string, reference: string): Promise<void> {
    await this.orderModel.findByIdAndUpdate(orderId, { paystackReference: reference });
  }

  async cancelOrder(id: string, userId: string): Promise<OrderDocument> {
    const order = await this.orderModel.findById(id);
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId.toString() !== userId) {
      throw new BadRequestException('You can only cancel your own orders');
    }

    // Check if order was placed within 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (order.createdAt < oneHourAgo) {
      throw new BadRequestException('Orders can only be cancelled within 1 hour of placement');
    }

    if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.CONFIRMED) {
      throw new BadRequestException('This order cannot be cancelled');
    }

    order.status = OrderStatus.CANCELLED;
    order.timeline.push({
      status: OrderStatus.CANCELLED,
      timestamp: new Date(),
      note: 'Cancelled by customer',
    });

    // Restore stock
    for (const item of order.items) {
      await this.giftsService.incrementStock(item.giftId.toString(), item.quantity);
    }

    return order.save();
  }

  async getStats(dateFrom?: Date, dateTo?: Date) {
    const filter: Record<string, unknown> = {};
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) (filter.createdAt as Record<string, Date>).$gte = dateFrom;
      if (dateTo) (filter.createdAt as Record<string, Date>).$lte = dateTo;
    }

    const [
      totalOrders,
      totalGMV,
      statusBreakdown,
      todayOrders,
    ] = await Promise.all([
      this.orderModel.countDocuments(filter),
      this.orderModel.aggregate([
        { $match: { ...filter, paymentStatus: PaymentStatus.PAID } },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, platformFees: { $sum: '$platformFee' } } },
      ]),
      this.orderModel.aggregate([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this.orderModel.countDocuments({
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      }),
    ]);

    return {
      totalOrders,
      todayOrders,
      gmv: totalGMV[0]?.total || 0,
      platformRevenue: totalGMV[0]?.platformFees || 0,
      statusBreakdown,
    };
  }

  async getVendorOrders(vendorId: string, query: PaginationDto & { status?: string }) {
    const { page, limit, status } = query;
    const filter: Record<string, unknown> = {
      'items.vendorId': new Types.ObjectId(vendorId),
    };
    if (status) filter.status = status;

    const [data, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('userId', 'firstName lastName email')
        .populate('items.giftId', 'name slug images price'),
      this.orderModel.countDocuments(filter),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async getVendorStats(vendorId: string) {
    const today = new Date(new Date().setHours(0, 0, 0, 0));
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const [todayOrders, monthRevenue] = await Promise.all([
      this.orderModel.countDocuments({
        'items.vendorId': new Types.ObjectId(vendorId),
        createdAt: { $gte: today },
      }),
      this.orderModel.aggregate([
        {
          $match: {
            'items.vendorId': new Types.ObjectId(vendorId),
            paymentStatus: PaymentStatus.PAID,
            createdAt: { $gte: monthStart },
          },
        },
        { $group: { _id: null, total: { $sum: '$vendorAmount' } } },
      ]),
    ]);

    return {
      todayOrders,
      monthRevenue: monthRevenue[0]?.total || 0,
    };
  }

  private async generateOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.orderModel.countDocuments();
    return `CWN-${year}-${String(count + 1).padStart(5, '0')}`;
  }
}
