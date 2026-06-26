import { Controller, Post, Get, Patch, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { SourcingRequestsService } from './sourcing-requests.service';
import { CreateSourcingRequestDto } from './dto/create-sourcing-request.dto';
import { UpdateSourcingRequestDto } from './dto/update-sourcing-request.dto';
import { PaginationDto } from '../../shared/pagination/pagination.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../shared/types';

@Controller('sourcing-requests')
export class SourcingRequestsController {
  constructor(private readonly sourcingRequestsService: SourcingRequestsService) {}

  @Post()
  create(@Body() createSourcingRequestDto: CreateSourcingRequestDto, @Request() req: any) {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    return this.sourcingRequestsService.create(createSourcingRequestDto, ip, req.user?.id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  findAll(@Query() query: PaginationDto) {
    return this.sourcingRequestsService.findAll(query);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('trending')
  findTrending() {
    return this.sourcingRequestsService.findTrending();
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sourcingRequestsService.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSourcingRequestDto: UpdateSourcingRequestDto) {
    return this.sourcingRequestsService.update(id, updateSourcingRequestDto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post(':id/quote')
  setQuote(@Param('id') id: string, @Body('amount') amount: number) {
    return this.sourcingRequestsService.setQuote(id, amount);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/accept')
  acceptQuote(@Param('id') id: string, @Request() req: any) {
    return this.sourcingRequestsService.acceptQuote(id, req.user?.id);
  }
}
