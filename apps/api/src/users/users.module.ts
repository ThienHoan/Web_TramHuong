import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
    imports: [SupabaseModule, OrdersModule],
    controllers: [UsersController],
    providers: [UsersService],
})
export class UsersModule { }
