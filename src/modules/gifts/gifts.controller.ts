import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GiftsService } from './gifts.service';
import { CreateGiftDto } from './dto/create-gift.dto';
import { UpdateGiftDto } from './dto/update-gift.dto';
import { FilterGiftsDto } from './dto/filter-gifts.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../shared/pagination/pagination.dto';
import { UserRole } from '../../shared/types';

@ApiTags('Gifts')
@Controller('gifts')
export class GiftsController {
  constructor(private readonly giftsService: GiftsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a gift listing (vendor)' })
  async create(@CurrentUser('sub') userId: string, @Body() dto: CreateGiftDto) {
    // In a real scenario, we'd look up the vendor by userId
    // For now, we pass vendorId via a separate mechanism
    return this.giftsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List approved gifts (public)' })
  async findAll(@Query() query: FilterGiftsDto) {
    return this.giftsService.findAll(query);
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured gifts (public)' })
  async getFeatured() {
    return this.giftsService.getFeatured();
  }

  @Get('vendor/:vendorId')
  @ApiOperation({ summary: 'Get gifts by vendor (public)' })
  async findByVendor(@Param('vendorId') vendorId: string, @Query() query: PaginationDto) {
    return this.giftsService.findByVendor(vendorId, query);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get gift by slug (public)' })
  async findBySlug(@Param('slug') slug: string) {
    return this.giftsService.findBySlug(slug);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a gift (vendor or admin)' })
  async update(@Param('id') id: string, @Body() dto: UpdateGiftDto) {
    return this.giftsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft delete a gift' })
  async remove(@Param('id') id: string) {
    await this.giftsService.softDelete(id);
    return { message: 'Gift deleted' };
  }

  @Post(':id/approve')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a gift listing (admin)' })
  async approve(@Param('id') id: string) {
    return this.giftsService.approve(id);
  }

  @Post(':id/feature')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle featured status (admin)' })
  async toggleFeatured(@Param('id') id: string) {
    return this.giftsService.toggleFeatured(id);
  }
}
