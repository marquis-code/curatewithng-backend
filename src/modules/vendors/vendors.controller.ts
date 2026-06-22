import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { VendorsService } from './vendors.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../shared/pagination/pagination.dto';
import { UserRole } from '../../shared/types';

@ApiTags('Vendors')
@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create vendor profile (onboarding)' })
  async create(@CurrentUser('sub') userId: string, @Body() dto: CreateVendorDto) {
    return this.vendorsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List approved vendors (public)' })
  async findAll(@Query() query: PaginationDto & { category?: string; state?: string; search?: string }) {
    return this.vendorsService.findAll(query);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get own vendor profile' })
  async getMyProfile(@CurrentUser('sub') userId: string) {
    return this.vendorsService.findByUserId(userId);
  }

  @Get('stats')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get vendor stats (admin)' })
  async getStats() {
    return this.vendorsService.getStats();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get vendor by slug (public)' })
  async findBySlug(@Param('slug') slug: string) {
    return this.vendorsService.findBySlug(slug);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update vendor profile' })
  async update(@Param('id') id: string, @Body() dto: UpdateVendorDto) {
    return this.vendorsService.update(id, dto);
  }

  @Post(':id/approve')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve vendor (admin)' })
  async approve(@Param('id') id: string) {
    return this.vendorsService.approve(id);
  }

  @Post(':id/reject')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject vendor (admin)' })
  async reject(@Param('id') id: string, @Body('reason') reason: string) {
    return this.vendorsService.reject(id);
  }

  // Admin: list all vendors including unapproved
  @Get('admin/all')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all vendors including unapproved (admin)' })
  async findAllAdmin(@Query() query: PaginationDto & { category?: string; state?: string; search?: string; approved?: string }) {
    return this.vendorsService.findAll(query);
  }
}
