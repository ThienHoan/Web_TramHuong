import { Module } from '@nestjs/common';
import { VouchersService } from './vouchers.service';
import { VouchersController } from './vouchers.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

@Module({
  imports: [ConfigModule],
  controllers: [VouchersController],
  providers: [
    VouchersService,
    {
      provide: 'SUPABASE_CLIENT',
      useFactory: (configService: ConfigService) => {
        return createClient(
          configService.get<string>('SUPABASE_URL')!,
          configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')!,
        );
      },
      inject: [ConfigService],
    },
  ],
  exports: [VouchersService],
})
export class VouchersModule {}
