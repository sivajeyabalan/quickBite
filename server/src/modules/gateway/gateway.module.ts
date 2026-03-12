import { Module } from '@nestjs/common';
import { kitchenGateway } from './gateway.gateway';

@Module({
  providers: [kitchenGateway],
  exports: [kitchenGateway], // Export so OrdersService can inject it
})
export class GatewayModule {}