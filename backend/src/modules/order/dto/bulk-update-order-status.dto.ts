import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus, OrderType } from '@prisma/client';
import { ArrayMinSize, IsArray, IsEnum, IsString, IsUUID } from 'class-validator';

export class BulkUpdateOrderStatusDto {
  @ApiProperty({ type: [String], example: ['a1b2c3d4-e5f6-7890-abcd-ef1234567890'] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(undefined, { each: true })
  orderIds: string[];

  @ApiProperty({ enum: OrderStatus, example: OrderStatus.PENDING })
  @IsEnum(OrderStatus)
  fromStatus: OrderStatus;

  @ApiProperty({ enum: OrderStatus, example: OrderStatus.CONFIRMED })
  @IsEnum(OrderStatus)
  toStatus: OrderStatus;

  @ApiProperty({ enum: OrderType, example: OrderType.PICKUP })
  @IsEnum(OrderType)
  orderType: OrderType;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsString()
  @IsUUID()
  userId: string;
}

