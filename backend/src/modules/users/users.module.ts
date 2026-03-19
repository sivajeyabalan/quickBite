import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserAddressesController } from './user-addresses.controller';

@Module({
  imports: [PrismaModule],
  controllers: [UserAddressesController, UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
