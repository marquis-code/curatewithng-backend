import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { OrdersService } from '../orders/orders.service';
import { VendorsService } from '../vendors/vendors.service';
import { EmailChannel } from '../notifications/channels/email.channel';
import { NotificationsService } from '../notifications/notifications.service';
import { SourcingRequestsService } from '../sourcing-requests/sourcing-requests.service';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { SourcingStatus } from '../sourcing-requests/schemas/sourcing-request.schema';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly paystackSecretKey: string;
  private readonly paystackBaseUrl = 'https://api.paystack.co';

  constructor(
    private configService: ConfigService,
    private ordersService: OrdersService,
    private vendorsService: VendorsService,
    private emailChannel: EmailChannel,
    private notificationsService: NotificationsService,
    private sourcingRequestsService: SourcingRequestsService,
    @InjectQueue('sourcing-queue') private sourcingQueue: Queue,
  ) {
    this.paystackSecretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY') || '';
  }

  async initiatePayment(orderId: string, email: string) {
    const order = await this.ordersService.findById(orderId);

    const response = await fetch(`${this.paystackBaseUrl}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: order.totalAmount, // Already in kobo
        reference: `CWN-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        metadata: {
          type: 'ORDER',
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
        },
        callback_url: `${this.configService.get('FRONTEND_URL')}/orders/${order._id}`,
      }),
    });

    const data = await response.json();
    if (!data.status) {
      throw new BadRequestException('Payment initialization failed');
    }

    await this.ordersService.setPaystackReference(orderId, data.data.reference);

    return {
      authorizationUrl: data.data.authorization_url,
      reference: data.data.reference,
      accessCode: data.data.access_code,
    };
  }

  async initiateSourcingPayment(requestId: string, email: string) {
    const request = await this.sourcingRequestsService.findOne(requestId);

    if (request.status !== SourcingStatus.QUOTED) {
      throw new BadRequestException('Request is not in QUOTED status or quote has not been accepted');
    }
    if (!request.quote?.total) {
      throw new BadRequestException('Quote total is missing');
    }

    const response = await fetch(`${this.paystackBaseUrl}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: request.quote.total, // In kobo
        reference: `SRC-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        metadata: {
          type: 'SOURCING',
          requestId: request._id.toString(),
        },
        callback_url: `${this.configService.get('FRONTEND_URL')}/dashboard/requests`,
      }),
    });

    const data = await response.json();
    if (!data.status) {
      throw new BadRequestException('Sourcing payment initialization failed');
    }

    await this.sourcingRequestsService.update(requestId, {
      paymentReference: data.data.reference
    } as any);

    return {
      authorizationUrl: data.data.authorization_url,
      reference: data.data.reference,
      accessCode: data.data.access_code,
    };
  }

  async handleWebhook(signature: string, body: any) {
    const hash = crypto
      .createHmac('sha512', this.paystackSecretKey)
      .update(JSON.stringify(body))
      .digest('hex');

    if (hash !== signature) {
      this.logger.warn('Invalid Paystack webhook signature');
      throw new BadRequestException('Invalid signature');
    }

    const event = body.event;
    const data = body.data;

    switch (event) {
      case 'charge.success':
        await this.handleChargeSuccess(data);
        break;
      case 'transfer.success':
        this.logger.log(`Transfer successful: ${data.reference}`);
        break;
      case 'refund.processed':
        this.logger.log(`Refund processed: ${data.reference}`);
        break;
      default:
        this.logger.log(`Unhandled event: ${event}`);
    }

    return { received: true };
  }

  private async handleChargeSuccess(data: any) {
    const reference = data.reference;
    const transactionId = data.id?.toString();
    const type = data.metadata?.type || 'ORDER';

    try {
      if (type === 'SOURCING') {
        const requestId = data.metadata.requestId;
        const request = await this.sourcingRequestsService.findOne(requestId);
        
        // Explicit verify exact amount
        if (data.amount !== request.quote?.total) {
          this.logger.error(`Sourcing payment amount mismatch. Expected ${request.quote?.total}, got ${data.amount}`);
          throw new BadRequestException('Amount mismatch for sourcing quote');
        }

        await this.sourcingRequestsService.update(requestId, {
          status: SourcingStatus.PAYMENT_RECEIVED,
          paymentReceivedAt: new Date(),
        } as any);

        this.logger.log(`Sourcing Payment confirmed for reference: ${reference}`);

        await this.sourcingQueue.add('process-sourcing-payment', { requestId });
        
      } else {
        const order = await this.ordersService.updatePaymentStatus(reference, transactionId);
        this.logger.log(`Payment confirmed for reference: ${reference}`);
        
        const populatedOrder = await this.ordersService.findById(order._id.toString());
        await this.emailChannel.sendOrderConfirmation(
          (populatedOrder.userId as any).email,
          (populatedOrder.userId as any).firstName,
          populatedOrder
        );
        
        await this.notificationsService.create({
          userId: populatedOrder.userId._id.toString(),
          type: 'ORDER_CONFIRMED',
          title: 'Order Confirmed! 🎉',
          body: `Your order #${populatedOrder.orderNumber} has been received and confirmed.`,
          metadata: {
            orderId: populatedOrder._id.toString(),
            orderNumber: populatedOrder.orderNumber,
          }
        });
        
        for (const item of populatedOrder.items) {
          if ((item.giftId as any).vendorId) {
            await this.notificationsService.create({
              userId: (item.giftId as any).vendorId.userId?.toString(),
              type: 'NEW_ORDER',
              title: 'New Order Received',
              body: `You have a new order for ${(item.giftId as any).name}`,
              metadata: {
                orderId: populatedOrder._id.toString()
              }
            });
          }
        }
      }
    } catch (error) {
      this.logger.error(`Failed to process payment for ${reference}:`, error);
    }
  }

  async requestPayout(vendorId: string) {
    const vendor = await this.vendorsService.findById(vendorId);
    if (vendor.pendingPayout <= 0) {
      throw new BadRequestException('No pending payout available');
    }
    return {
      vendorId,
      amount: vendor.pendingPayout,
      status: 'pending_approval',
      message: 'Payout request submitted for admin approval',
    };
  }

  async approvePayout(vendorId: string, amount: number) {
    const vendor = await this.vendorsService.findById(vendorId);
    if (!vendor.paystackSubaccountCode) {
      throw new BadRequestException('Vendor does not have a Paystack subaccount');
    }

    const response = await fetch(`${this.paystackBaseUrl}/transfer`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'balance',
        amount: amount,
        recipient: vendor.paystackSubaccountCode,
        reason: `CurateWithNG payout for ${vendor.businessName}`,
      }),
    });

    const data = await response.json();

    if (data.status) {
      await this.vendorsService.processPayout(vendorId, amount);
    }

    return data;
  }
}
