import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PlatformSettings, PlatformSettingsDocument } from './schemas/platform-settings.schema';
import { RedisCacheService } from '../../shared/cache/cache.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService implements OnModuleInit {
  private readonly CACHE_KEY = 'platform-settings:default';

  constructor(
    @InjectModel(PlatformSettings.name) private settingsModel: Model<PlatformSettingsDocument>,
    private readonly cacheService: RedisCacheService,
  ) {}

  async onModuleInit() {
    await this.initializeSettings();
  }

  private async initializeSettings() {
    const settings = await this.settingsModel.findOne({ key: 'default' });
    if (!settings) {
      await this.settingsModel.create({
        key: 'default',
        sourcingFeeTiers: [
          { minAmount: 0, maxAmount: 50000, percentage: 15 },
          { minAmount: 50001, maxAmount: 200000, percentage: 12 },
          { minAmount: 200001, maxAmount: 500000, percentage: 10 },
          { minAmount: 500001, percentage: 8 },
        ],
      });
    }
  }

  async getSettings(): Promise<PlatformSettings> {
    const cached = await this.cacheService.get<PlatformSettings>(this.CACHE_KEY);
    if (cached) {
      return cached;
    }

    const settings = await this.settingsModel.findOne({ key: 'default' }).lean();
    if (settings) {
      // Cache for 1 hour
      await this.cacheService.set(this.CACHE_KEY, settings, 3600);
      return settings as PlatformSettings;
    }
    
    throw new Error('Settings not initialized');
  }

  async updateSettings(updateDto: UpdateSettingsDto): Promise<PlatformSettings> {
    const settings = await this.settingsModel.findOneAndUpdate(
      { key: 'default' },
      { $set: updateDto },
      { new: true, upsert: true }
    ).lean();

    // Invalidate and set cache immediately
    await this.cacheService.set(this.CACHE_KEY, settings, 3600);

    return settings as PlatformSettings;
  }
}
