import { Type } from 'class-transformer';
import {
  IsArray, IsInt, IsOptional,
  IsString, IsUUID, Min,
  ValidateNested, ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderItemDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsUUID()
  menuItemId: string;

  @ApiProperty({ example: 2, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ example: { extras: ['cheese'] } })
  @IsOptional()
  customisations?: object;
}

export class CreateOrderDto {
  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiPropertyOptional({ example: '12' })
  @IsOptional()
  @IsString()
  tableNumber?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}