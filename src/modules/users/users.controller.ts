import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Post,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto } from '../../shared/pagination/pagination.dto';
import { UserRole } from '../../shared/types';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser('sub') userId: string) {
    return this.usersService.findById(userId);
  }

  @Patch('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  async updateProfile(
    @CurrentUser('sub') userId: string,
    @Body() updateData: UpdateUserDto,
  ) {
    return this.usersService.update(userId, updateData);
  }

  @Post('me/recipients')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a recipient' })
  async addRecipient(
    @CurrentUser('sub') userId: string,
    @Body() recipient: { name: string; relationship: string; birthday?: Date; interests?: string[]; notes?: string },
  ) {
    return this.usersService.addRecipient(userId, recipient as any);
  }

  @Delete('me/recipients/:index')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a recipient' })
  async removeRecipient(
    @CurrentUser('sub') userId: string,
    @Param('index') index: number,
  ) {
    return this.usersService.removeRecipient(userId, index);
  }

  @Patch('me/preferences')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user preferences' })
  async updatePreferences(
    @CurrentUser('sub') userId: string,
    @Body() preferences: { occasions?: string[]; budgetRange?: { min: number; max: number }; interests?: string[] },
  ) {
    return this.usersService.updatePreferences(userId, preferences as any);
  }

  // Admin routes
  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all users (admin)' })
  async findAll(@Query() query: PaginationDto & { role?: string; search?: string }) {
    return this.usersService.findAll(query);
  }

  @Get('stats')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user count by role (admin)' })
  async getStats() {
    return this.usersService.countByRole();
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user by ID (admin)' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id/toggle-active')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activate/deactivate user (admin)' })
  async toggleActive(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.usersService.toggleActive(id, isActive);
  }
}
