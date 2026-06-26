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
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../shared/pagination/pagination.dto';
import { UserRole, OrderStatus } from '../../shared/types';

import { VendorsService } from '../vendors/vendors.service';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly vendorsService: VendorsService,
  ) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new order' })
  async create(@CurrentUser('sub') userId: string, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(userId, dto);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List orders (user: own, vendor: vendor orders, admin: all)' })
  async findAll(
    @CurrentUser() user: any,
    @Query() query: PaginationDto & { status?: string },
  ) {
    if (user.role === UserRole.ADMIN) {
      return this.ordersService.findAll(query);
    }
    return this.ordersService.findAll({ ...query, userId: user.sub });
  }

  @Get('stats')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get order stats (admin)' })
  async getStats() {
    return this.ordersService.getStats();
  }

  @Get('vendor/me/stats')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get dashboard stats for my vendor profile' })
  async getVendorStats(
    @CurrentUser('sub') userId: string,
  ) {
    const vendor = await this.vendorsService.findByUserId(userId);
    return this.ordersService.getVendorStats(vendor._id.toString());
  }

  @Get('vendor/me')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get orders for my vendor profile' })
  async getVendorOrders(
    @CurrentUser('sub') userId: string,
    @Query() query: PaginationDto & { status?: string },
  ) {
    const vendor = await this.vendorsService.findByUserId(userId);
    return this.ordersService.getVendorOrders(vendor._id.toString(), query);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get order by ID' })
  async findOne(@Param('id') id: string) {
    return this.ordersService.findById(id);
  }

  @Patch(':id/status')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update order status' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: OrderStatus,
    @Body('note') note: string,
  ) {
    return this.ordersService.updateStatus(id, status, note);
  }

  @Post(':id/cancel')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel order (within 1 hour)' })
  async cancel(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.ordersService.cancelOrder(id, userId);
  }
}
