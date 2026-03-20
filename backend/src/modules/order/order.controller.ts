import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { OrderStatus, OrderType, Role } from '@prisma/client';
import { OrdersService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order.dto';
import { BulkUpdateOrderStatusDto } from './dto/bulk-update-order-status.dto';
import { CurrentUser } from '../auth/decorators/current.decorators';
import { Roles } from '../auth/decorators/roles.decorators';

@ApiTags('Orders')
@ApiBearerAuth('access-token')
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrdersService) {}

  @ApiOperation({ summary: 'Place a new order' })
  @Post()
  create(
    @Body() createOrderDto: CreateOrderDto,
    @CurrentUser() user: any,
  ) {
    return this.orderService.create(createOrderDto, user.id);
  }

  @ApiOperation({ summary: 'Get all orders (customers see their own; staff/admin see all)' })
  @ApiQuery({ name: 'status', enum: OrderStatus, required: false })
  @ApiQuery({ name: 'orderType', enum: OrderType, required: false })
  @ApiQuery({ name: 'date', type: String, required: false, example: '2026-03-12' })
  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('status') status?: OrderStatus,
    @Query('orderType') orderType?: OrderType,
    @Query('date') date?: string,
  ) {
    return this.orderService.findAll(user.id, user.role, { status, orderType, date });
  }

  @ApiOperation({ summary: 'Get order by ID' })
  @ApiParam({ name: 'id', type: String })
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.orderService.findOne(id, user.id, user.role);
  }

  @ApiOperation({ summary: 'Update order status (staff/admin only)' })
  @ApiParam({ name: 'id', type: String })
  @Roles(Role.STAFF, Role.ADMIN)
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.orderService.updateStatus(id, dto, user.role);
  }

  @ApiOperation({ summary: 'Bulk update status for grouped orders (staff/admin only)' })
  @Roles(Role.STAFF, Role.ADMIN)
  @Patch('bulk-status')
  bulkUpdateStatus(
    @Body() dto: BulkUpdateOrderStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.orderService.bulkUpdateStatus(dto, user.role);
  }

  @ApiOperation({ summary: 'Cancel an order' })
  @ApiParam({ name: 'id', type: String })
  @Delete(':id/cancel')
  cancel(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.orderService.cancel(id, user.id, user.role);
  }
}
