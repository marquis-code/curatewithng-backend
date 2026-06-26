import { Controller, Post, Body, Headers, UseGuards, Param, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../shared/types';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initiate')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate Paystack payment' })
  async initiate(
    @Body('orderId') orderId: string,
    @CurrentUser('email') email: string,
  ) {
    return this.paymentsService.initiatePayment(orderId, email);
  }

  @Post('sourcing/:id/initiate')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate Paystack payment for sourcing quote' })
  async initiateSourcing(
    @Param('id') id: string,
    @CurrentUser('email') email: string,
  ) {
    return this.paymentsService.initiateSourcingPayment(id, email);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Handle Paystack webhook' })
  async webhook(
    @Headers('x-paystack-signature') signature: string,
    @Body() body: any,
  ) {
    return this.paymentsService.handleWebhook(signature, body);
  }

  @Post('payout/request')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request payout (vendor)' })
  async requestPayout(@CurrentUser('sub') userId: string) {
    // In production, look up vendorId from userId
    return this.paymentsService.requestPayout(userId);
  }

  @Post('payout/:vendorId/approve')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve payout (admin)' })
  async approvePayout(
    @Param('vendorId') vendorId: string,
    @Body('amount') amount: number,
  ) {
    return this.paymentsService.approvePayout(vendorId, amount);
  }
}
