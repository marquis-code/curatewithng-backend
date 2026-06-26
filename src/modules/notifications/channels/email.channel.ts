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

  private baseTemplate(content: string) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>CurateWithNG</title>
        <style>
          body { margin: 0; padding: 0; background-color: #fcfcfc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
          .container { max-width: 480px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01); border: 1px solid #f1f5f9; }
          .header { padding: 32px 40px; text-align: center; border-bottom: 1px solid #f8fafc; }
          .logo { color: #6B21A8; font-size: 20px; font-weight: 700; text-decoration: none; letter-spacing: -0.5px; }
          .content { padding: 40px; color: #475569; line-height: 1.65; font-size: 15px; }
          .content h1 { color: #0f172a; font-size: 22px; font-weight: 600; margin-top: 0; margin-bottom: 20px; letter-spacing: -0.4px; }
          .content p { margin: 0 0 18px; }
          .button { display: inline-block; background-color: #6B21A8; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 14px; margin-top: 8px; transition: background-color 0.2s; }
          .footer { padding: 32px 40px; text-align: center; background-color: #fafafa; color: #94a3b8; font-size: 13px; }
          .footer p { margin: 0 0 6px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <a href="https://curatewithng.com" class="logo">CurateWithNG</a>
          </div>
          <div class="content">
            ${content}
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} CurateWithNG. All rights reserved.</p>
            <p>Made with ❤️ in Lagos, Nigeria</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendWelcome(to: string, name: string) {
    const content = `
      <h1>Welcome to the family, ${name}. ✨</h1>
      <p>We built CurateWithNG because we believe that gifting is one of the most profound ways to say "I see you, and I care about you."</p>
      <p>Finding the perfect gift shouldn't be stressful—it should be a beautiful expression of love. Whether you're celebrating a milestone or just sending a thoughtful, out-of-the-blue surprise, we are here to help you curate unforgettable moments.</p>
      <p>Thank you for letting us be a part of your story. We can't wait to see the smiles you create.</p>
      <div style="text-align: left; margin-top: 32px;">
        <a href="https://curatewithng.com/curate" class="button">Curate Your First Gift</a>
      </div>
    `;
    return this.send(to, 'Welcome to CurateWithNG ✨', this.baseTemplate(content));
  }

  async sendOrderConfirmation(to: string, name: string, order: any) {
    const itemsHtml = order.items.map((item: any) => `
      <tr>
        <td style="padding: 16px 0; border-bottom: 1px solid #f1f5f9;">
          <div style="font-weight: 600; color: #0f172a;">${item.giftId.name}</div>
          <div style="color: #64748b; font-size: 13px; margin-top: 4px;">Qty: ${item.quantity} × ₦${(item.unitPrice / 100).toLocaleString()}</div>
        </td>
        <td style="padding: 16px 0; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: 600; color: #0f172a;">
          ₦${(item.subtotal / 100).toLocaleString()}
        </td>
      </tr>
    `).join('');

    const content = `
      <h1>Your Order is Confirmed! 🎉</h1>
      <p>Hi ${name},</p>
      <p>Thank you for choosing CurateWithNG to send something beautiful. We've received your order and our vendors are already preparing it with care.</p>
      
      <div style="background-color: #f8fafc; padding: 24px; border-radius: 12px; margin: 32px 0;">
        <div style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0;">
          <h3 style="margin: 0 0 4px 0; color: #0f172a; font-size: 16px;">Order Summary</h3>
          <p style="margin: 0; color: #64748b; font-size: 13px;">Order #${order.orderNumber} • Placed on ${new Date(order.createdAt).toLocaleDateString()}</p>
        </div>
        
        <table style="width: 100%; border-collapse: collapse;">
          ${itemsHtml}
          <tr>
            <td style="padding: 16px 0 8px 0; color: #64748b;">Subtotal</td>
            <td style="padding: 16px 0 8px 0; text-align: right; color: #0f172a; font-weight: 500;">₦${((order.totalAmount - order.platformFee) / 100).toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Service Fee</td>
            <td style="padding: 8px 0; text-align: right; color: #0f172a; font-weight: 500;">₦${(order.platformFee / 100).toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding: 16px 0 0 0; border-top: 1px solid #e2e8f0; font-weight: 700; color: #0f172a; font-size: 16px;">Total Paid</td>
            <td style="padding: 16px 0 0 0; border-top: 1px solid #e2e8f0; text-align: right; font-weight: 700; color: #6B21A8; font-size: 16px;">₦${(order.totalAmount / 100).toLocaleString()}</td>
          </tr>
        </table>
      </div>

      <div style="margin: 32px 0;">
        <h3 style="margin: 0 0 12px 0; color: #0f172a; font-size: 16px;">Delivery Details</h3>
        <div style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px;">
          <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Recipient:</strong> ${order.recipient.name}</p>
          <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Address:</strong> ${order.recipient.address}</p>
          <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Phone:</strong> ${order.recipient.phone}</p>
          ${order.recipient.deliveryDate ? `<p style="margin: 0; font-size: 14px;"><strong>Preferred Date:</strong> ${new Date(order.recipient.deliveryDate).toLocaleDateString()}</p>` : ''}
        </div>
      </div>

      <p>We'll notify you the moment your gift is out for delivery. If you have any questions, reply to this email.</p>
      <div style="text-align: center; margin-top: 32px;">
        <a href="https://curatewithng.com/dashboard/orders" class="button">View Order Details</a>
      </div>
    `;
    return this.send(to, `Order Confirmed: ${order.orderNumber}`, this.baseTemplate(content));
  }

  async sendVendorApproval(to: string, businessName: string) {
    const content = `
      <h1>Welcome to the CurateWithNG Marketplace</h1>
      <p>Congratulations. Your application for <strong>${businessName}</strong> has been carefully reviewed and approved.</p>
      <p>We're thrilled to partner with you in delivering premium, high-quality gifts to people across the country. You can now access your dashboard and begin listing your exquisite products.</p>
      <div style="text-align: left; margin-top: 24px;">
        <a href="https://vendors.curatewithng.com/dashboard/products/new" class="button">Go to Dashboard</a>
      </div>
    `;
    return this.send(to, `${businessName} — Vendor Account Approved`, this.baseTemplate(content));
  }

  async sendVendorRejection(to: string, businessName: string, reason: string) {
    const content = `
      <h1>Application Update</h1>
      <p>Thank you for your interest in partnering with us at CurateWithNG.</p>
      <p>After a careful review of your application for <strong>${businessName}</strong>, we are unable to approve your vendor profile at this time.</p>
      ${reason ? `<div style="background-color: #fef2f2; padding: 16px; border-radius: 8px; margin: 24px 0; color: #991b1b; font-size: 14px;"><strong>Note:</strong> ${reason}</div>` : ''}
      <p>You are welcome to update your profile ensuring it meets our marketplace standards and resubmit for review.</p>
    `;
    return this.send(to, `${businessName} — Application Status`, this.baseTemplate(content));
  }

  async sendPasswordReset(to: string, name: string, resetLink: string) {
    const content = `
      <h1>Password Reset Request</h1>
      <p>Hi ${name},</p>
      <p>We received a request to reset the password for your CurateWithNG account. Click the button below to securely set a new password.</p>
      <div style="text-align: left; margin: 24px 0;">
        <a href="${resetLink}" class="button">Reset Password</a>
      </div>
      <p style="color: #64748b; font-size: 13px;">If you did not request this, you can safely ignore this email. This link will expire in 1 hour.</p>
    `;
    return this.send(to, 'Reset your password', this.baseTemplate(content));
  }

  async sendLoginAlert(to: string, name: string, time: string, device: string) {
    const content = `
      <h1>New sign-in detected</h1>
      <p>Hi ${name},</p>
      <p>We noticed a new sign-in to your CurateWithNG account. If this was you, there is nothing you need to do.</p>
      <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin: 24px 0;">
        <p style="margin: 0; font-size: 14px;"><strong>Time:</strong> ${time}</p>
        <p style="margin: 6px 0 0 0; font-size: 14px;"><strong>Device:</strong> ${device}</p>
      </div>
      <p>If you don't recognize this activity, please secure your account immediately by resetting your password.</p>
      <div style="text-align: left; margin-top: 24px;">
        <a href="https://curatewithng.com/auth/reset-password" class="button" style="background-color: #f1f5f9; color: #0f172a !important;">Secure My Account</a>
      </div>
    `;
    return this.send(to, 'Security Alert: New sign-in detected', this.baseTemplate(content));
  }

  async sendAdminOtp(to: string, name: string, otpCode: string) {
    const content = `
      <h1>Admin Security Code</h1>
      <p>Hi ${name},</p>
      <p>A sign-in attempt requires further verification. Use the following 6-digit security code to access the CurateWithNG command center.</p>
      <div style="background-color: #f8fafc; padding: 24px; border-radius: 8px; margin: 24px 0; text-align: center;">
        <p style="margin: 0; font-size: 32px; font-family: monospace; font-weight: bold; letter-spacing: 8px; color: #0f172a;">${otpCode}</p>
      </div>
      <p style="color: #64748b; font-size: 13px;">This code will expire in 10 minutes. If you did not request this, please secure your account immediately.</p>
    `;
    return this.send(to, 'Your Admin Verification Code', this.baseTemplate(content));
  }
}
