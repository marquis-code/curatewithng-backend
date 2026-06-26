import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';

@ApiTags('Health')
@Controller()
export class AppController {
  @Get()
  @SkipThrottle()
  @ApiOperation({ summary: 'Health check' })
  getHealth() {
    return {
      status: 'ok',
      service: 'CurateWithNG API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}
