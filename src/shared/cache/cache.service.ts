import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisCacheService {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return data as unknown as T;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    if (ttlSeconds) {
      await this.redis.setex(key, ttlSeconds, serialized);
    } else {
      await this.redis.set(key, serialized);
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async delPattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  async increment(key: string, ttlSeconds?: number): Promise<number> {
    const result = await this.redis.incr(key);
    if (ttlSeconds && result === 1) {
      await this.redis.expire(key, ttlSeconds);
    }
    return result;
  }

  async getCount(key: string): Promise<number> {
    const count = await this.redis.get(key);
    return count ? parseInt(count, 10) : 0;
  }
}
