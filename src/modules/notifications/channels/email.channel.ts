import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailChannel {
  private readonly logger = new Logger(EmailChannel.name);
  private resend: Resend;
  private fromEmail: string;

  constructor(private configService: ConfigService) {
    this.resend = new Resend(this.configService.get<string>('RESEND_API_KEY'));
    this.fromEmail = this.configService.get<string>('RESEND_FROM_EMAIL', 'hello@curatewithng.com');
  }

  async send(to: string, subject: string, html: string) {
    try {
      const result = await this.resend.emails.send({
        from: `CurateWithNG <${this.fromEmail}>`,
        to,
        subject,
        html,
      });
      this.logger.log(`Email sent to ${to}: ${subject}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);
      throw error;
    }
  }

  // Pre-built email templates
  async sendWelcome(to: string, name: string) {
    const html = `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #6B21A8; font-size: 28px; margin: 0;">Welcome to CurateWithNG! 🎁</h1>
        </div>
        <p style="color: #334155; font-size: 16px; line-height: 1.6;">Hi ${name},</p>
        <p style="color: #334155; font-size: 16px; line-height: 1.6;">Welcome to CurateWithNG — Nigeria's smartest gifting platform! We're excited to help you find the perfect gifts for your loved ones.</p>
        <p style="color: #334155; font-size: 16px; line-height: 1.6;">Try our AI Gift Curator to get personalized recommendations based on who you're buying for.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://curatewithng.com/curate" style="background: #6B21A8; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Start Curating Gifts ✨</a>
        </div>
        <p style="color: #94a3b8; font-size: 14px; text-align: center;">— The CurateWithNG Team</p>
      </div>
    `;
    return this.send(to, 'Welcome to CurateWithNG! 🎁', html);
  }

  async sendOrderConfirmation(to: string, name: string, orderNumber: string, totalAmount: number) {
    const html = `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #6B21A8;">Order Confirmed! 🎉</h1>
        <p>Hi ${name},</p>
        <p>Your order <strong>${orderNumber}</strong> has been confirmed.</p>
        <p>Total: <strong>₦${(totalAmount / 100).toLocaleString()}</strong></p>
        <p>We'll notify you when your gift is on its way!</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://curatewithng.com/dashboard/orders" style="background: #6B21A8; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">Track Your Order</a>
        </div>
      </div>
    `;
    return this.send(to, `Order Confirmed: ${orderNumber}`, html);
  }

  async sendVendorApproval(to: string, businessName: string) {
    const html = `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #059669;">You're Approved! 🎊</h1>
        <p>Congratulations! Your vendor profile for <strong>${businessName}</strong> has been approved.</p>
        <p>You can now start listing your products on CurateWithNG.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://vendors.curatewithng.com/dashboard/products/new" style="background: #6B21A8; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">Add Your First Product</a>
        </div>
      </div>
    `;
    return this.send(to, `${businessName} — Vendor Approved!`, html);
  }

  async sendVendorRejection(to: string, businessName: string, reason: string) {
    const html = `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #DC2626;">Application Update</h1>
        <p>Unfortunately, your vendor application for <strong>${businessName}</strong> was not approved at this time.</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        <p>You may update your profile and resubmit for review.</p>
      </div>
    `;
    return this.send(to, `${businessName} — Vendor Application Update`, html);
  }

  async sendPasswordReset(to: string, name: string, resetLink: string) {
    const html = `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #6B21A8;">Reset Your Password</h1>
        <p>Hi ${name},</p>
        <p>You requested a password reset. Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background: #6B21A8; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">Reset Password</a>
        </div>
        <p style="color: #94a3b8; font-size: 14px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
      </div>
    `;
    return this.send(to, 'Reset Your Password — CurateWithNG', html);
  }
}
