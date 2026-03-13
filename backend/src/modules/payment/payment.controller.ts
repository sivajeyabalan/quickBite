import { Controller, Get, Post, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PaymentsService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Roles } from '../auth/decorators/roles.decorators';

@ApiTags('Payments')
@ApiBearerAuth('access-token')
@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @ApiOperation({ summary: 'Submit payment for an order' })
  @ApiResponse({ status: 201, description: 'Payment recorded successfully' })
  @Post()
  create(@Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(dto);
  }

  @ApiOperation({ summary: 'Get all payments (admin only)' })
  @Get()
  @Roles('ADMIN')
  findAll() {
    return this.paymentsService.findAll();
  }

  @ApiOperation({ summary: 'Get payment for a specific order' })
  @ApiParam({ name: 'orderId', type: String, description: 'Order UUID' })
  @Get(':orderId')
  findByOrder(@Param('orderId') orderId: string) {
    return this.paymentsService.findByOrder(orderId);
  }
}