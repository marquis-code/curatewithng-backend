import { Controller, Post, Get, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AiCuratorService } from './ai-curator.service';
import { GenerateCurationDto } from './dto/generate-curation.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../shared/pagination/pagination.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../shared/types';

@ApiTags('AI Curator')
@Controller('ai-curator')
export class AiCuratorController {
  constructor(private readonly aiCuratorService: AiCuratorService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate AI gift recommendations' })
  async generate(@Body() dto: GenerateCurationDto, @Req() req: any) {
    const userId = req.user?.sub || undefined;
    return this.aiCuratorService.generate(dto, userId);
  }

  @Get('sessions')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List my curation sessions' })
  async getMySessions(@CurrentUser('sub') userId: string, @Query() query: PaginationDto) {
    return this.aiCuratorService.getUserSessions(userId, query);
  }

  @Get('sessions/all')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all curation sessions (admin)' })
  async getAllSessions(@Query() query: PaginationDto) {
    return this.aiCuratorService.getAllSessions(query);
  }

  @Get('stats')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get curation conversion stats (admin)' })
  async getStats() {
    return this.aiCuratorService.getConversionStats();
  }

  @Get('sessions/:id')
  @ApiOperation({ summary: 'Get a specific curation session' })
  async getSession(@Param('id') id: string) {
    return this.aiCuratorService.getSession(id);
  }
}
