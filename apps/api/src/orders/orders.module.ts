import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { SupabaseModule } from '../supabase/supabase.module';

import { CartModule } from '../cart/cart.module';

import { MailModule } from '../mail/mail.module';

@Module({
    imports: [SupabaseModule, CartModule, MailModule],
    controllers: [OrdersController],
    providers: [OrdersService],
    exports: [OrdersService], // Export for UsersModule
})
export class OrdersModule { }
