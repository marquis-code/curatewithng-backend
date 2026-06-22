import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisCacheService } from './cache.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: async (configService: ConfigService) => {
        const Redis = (await import('ioredis')).default;
        return new Redis({
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          username: configService.get<string>('REDIS_USERNAME'),
          password: configService.get<string>('REDIS_PASSWORD'),
        });
      },
      inject: [ConfigService],
    },
    RedisCacheService,
  ],
  exports: ['REDIS_CLIENT', RedisCacheService],
})
export class CacheModule {}
