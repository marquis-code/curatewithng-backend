import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsChannel {
  private readonly logger = new Logger(SmsChannel.name);
  private readonly apiKey: string;
  private readonly senderId: string;
  private readonly baseUrl = 'https://api.ng.termii.com/api';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('TERMII_API_KEY') || '';
    this.senderId = this.configService.get<string>('TERMII_SENDER_ID', 'CurateNG');
  }

  async sendSms(to: string, message: string) {
    try {
      const response = await fetch(`${this.baseUrl}/sms/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: this.apiKey,
          to,
          from: this.senderId,
          sms: message,
          type: 'plain',
          channel: 'generic',
        }),
      });

      const data = await response.json();
      this.logger.log(`SMS sent to ${to}`);
      return data;
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${to}:`, error);
      throw error;
    }
  }

  async sendOtp(to: string) {
    try {
      const response = await fetch(`${this.baseUrl}/sms/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: this.apiKey,
          message_type: 'NUMERIC',
          to,
          from: this.senderId,
          channel: 'generic',
          pin_attempts: 3,
          pin_time_limit: 5,
          pin_length: 6,
          pin_placeholder: '< 1234 >',
          message_text: 'Your CurateWithNG verification code is < 1234 >. Valid for 5 minutes.',
          pin_type: 'NUMERIC',
        }),
      });

      const data = await response.json();
      this.logger.log(`OTP sent to ${to}`);
      return data;
    } catch (error) {
      this.logger.error(`Failed to send OTP to ${to}:`, error);
      throw error;
    }
  }

  async verifyOtp(pinId: string, pin: string) {
    try {
      const response = await fetch(`${this.baseUrl}/sms/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: this.apiKey,
          pin_id: pinId,
          pin,
        }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      this.logger.error('OTP verification failed:', error);
      throw error;
    }
  }
}
