import { Module } from '@nestjs/common';
import { MerchantService } from './merchant.service';
import { MerchantController } from './merchant.controller';
import { ProductsModule } from '../products/products.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ProductsModule, ConfigModule],
  controllers: [MerchantController],
  providers: [MerchantService],
})
export class MerchantModule {}
