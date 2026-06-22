import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { OrdersService } from '../modules/orders/orders.service';
import { OrderStatus } from '../shared/types';

@Processor('order-queue')
export class OrderProcessor {
  private readonly logger = new Logger(OrderProcessor.name);

  constructor(private ordersService: OrdersService) {}

  @Process('process-order')
  async handleProcessOrder(job: Job<{ orderId: string; reference: string; transactionId: string }>) {
    this.logger.log(`Processing order: ${job.data.orderId}`);
    try {
      await this.ordersService.updatePaymentStatus(job.data.reference, job.data.transactionId);
      this.logger.log(`Order ${job.data.orderId} processed successfully`);
    } catch (error) {
      this.logger.error(`Failed to process order ${job.data.orderId}:`, error);
      throw error;
    }
  }

  @Process('auto-cancel-unpaid')
  async handleAutoCancelUnpaid(job: Job<{ orderId: string }>) {
    this.logger.log(`Checking unpaid order: ${job.data.orderId}`);
    try {
      const order = await this.ordersService.findById(job.data.orderId);
      if (order.status === OrderStatus.PENDING && order.paymentStatus === 'UNPAID') {
        await this.ordersService.updateStatus(job.data.orderId, OrderStatus.CANCELLED, 'Auto-cancelled: payment not received within 30 minutes');
        this.logger.log(`Order ${job.data.orderId} auto-cancelled`);
      }
    } catch (error) {
      this.logger.error(`Failed to auto-cancel order ${job.data.orderId}:`, error);
    }
  }
}
