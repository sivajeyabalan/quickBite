import { Module } from '@nestjs/common';
import { kitchenGateway } from './gateway.gateway';

@Module({
  providers: [kitchenGateway],
  exports: [kitchenGateway], 
})
export class GatewayModule {}