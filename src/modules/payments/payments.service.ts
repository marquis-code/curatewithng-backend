import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { OrdersService } from '../orders/orders.service';
import { VendorsService } from '../vendors/vendors.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly paystackSecretKey: string;
  private readonly paystackBaseUrl = 'https://api.paystack.co';

  constructor(
    private configService: ConfigService,
    private ordersService: OrdersService,
    private vendorsService: VendorsService,
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

    // Save reference to order
    await this.ordersService.setPaystackReference(orderId, data.data.reference);

    return {
      authorizationUrl: data.data.authorization_url,
      reference: data.data.reference,
      accessCode: data.data.access_code,
    };
  }

  async handleWebhook(signature: string, body: any) {
    // Verify HMAC signature
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

    try {
      await this.ordersService.updatePaymentStatus(reference, transactionId);
      this.logger.log(`Payment confirmed for reference: ${reference}`);
    } catch (error) {
      this.logger.error(`Failed to process payment for ${reference}:`, error);
    }
  }

  async requestPayout(vendorId: string) {
    const vendor = await this.vendorsService.findById(vendorId);
    if (vendor.pendingPayout <= 0) {
      throw new BadRequestException('No pending payout available');
    }
    // In production, create a transfer request record and notify admin
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

    // In production, initiate Paystack transfer
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
