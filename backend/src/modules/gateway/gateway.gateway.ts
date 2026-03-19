import { WebSocketGateway, SubscribeMessage, MessageBody, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, WebSocketServer, ConnectedSocket } from '@nestjs/websockets';
import { GatewayService } from './gateway.service';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';


@WebSocketGateway({
  cors : {
    origin: '*',
  },
  namespace: '/kitchen'
})
export class kitchenGateway implements OnGatewayInit , OnGatewayConnection , OnGatewayDisconnect{
  
  @WebSocketServer()
  server : Server

  private logger = new Logger('KitchenGateway')
  afterInit() {
    this.logger.log('Kitchen WebSocket Gateway initialised')
  }

  handleConnection(client: Socket) {
    this.logger.log(`client Connected : ${client.id}`)
  }
  handleDisconnect(client: Socket) {
    this.logger.log(`Client Disconnected : ${client.id}`)
  }
  
  emitNewOrder(order : any){
    this.logger.log(`Emitting order:new -> ${order.id}`)
    this.server.emit('order:new', order)
  }

  emitStatusUpdate(order : any){
    this.logger.log(`Emitting order : statusUpdated -> ${order.id} -> ${order.status}`)
    this.server.emit('order:statusUpdated',order)
  }

  emitPaymentConfirmed(data: {
    orderId: string;
    orderNumber: string;
    amount: number;
  }) {
    this.logger.log(`Emitting payment:confirmed -> ${data.orderNumber}`)
    this.server.emit('payment:confirmed', data)
  }

  emitPaymentFailed(data: {
    orderId: string;
    orderNumber: string;
  }) {
    this.logger.log(`Emitting payment:failed -> ${data.orderNumber}`)
    this.server.emit('payment:failed', data)
  }

  emitPaymentProcessing(data: {
    orderId: string;
    orderNumber: string;
    message: string;
  }) {
    this.logger.log(`Emitting payment:processing -> ${data.orderNumber}`)
    this.server.emit('payment:processing', data)
  }

  emitCashPaymentSelected(data: {
    orderId: string;
    orderNumber: string;
    orderType: string;
    message: string;
  }) {
    this.logger.log(`Emitting payment:cashSelected -> ${data.orderNumber}`)
    this.server.emit('payment:cashSelected', data)
  }

  emitPaymentRefundPending(data: {
    orderId: string;
    orderNumber: string;
    amount: number;
    message: string;
  }) {
    this.logger.log(`Emitting payment:refundPending -> ${data.orderNumber}`)
    this.server.emit('payment:refundPending', data)
  }

  emitPaymentRefunded(data: {
    orderId: string;
    orderNumber: string;
    amount: number;
    refundRef?: string;
  }) {
    this.logger.log(`Emitting payment:refunded -> ${data.orderNumber}`)
    this.server.emit('payment:refunded', data)
  }

  @SubscribeMessage('join:kitchen')
  handleJoinKitchen(@ConnectedSocket() client : Socket){
    client.join('kitchen-room')
    this.logger.log(`Client ${client.id} joined kitchen room`)
    client.emit('joined', {message : 'You are now in the Kitchen room'})
  }
}
