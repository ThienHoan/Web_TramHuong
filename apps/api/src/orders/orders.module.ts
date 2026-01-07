import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderCleanupService } from './order-cleanup.service';
import { SupabaseModule } from '../supabase/supabase.module';

import { CartModule } from '../cart/cart.module';

import { MailModule } from '../mail/mail.module';
import { VouchersModule } from '../vouchers/vouchers.module';

@Module({
  imports: [SupabaseModule, CartModule, MailModule, VouchersModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrderCleanupService],
  exports: [OrdersService], // Export for UsersModule
})
export class OrdersModule {}
