import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ProductsModule } from '../products/products.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ProductsModule, ConfigModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
