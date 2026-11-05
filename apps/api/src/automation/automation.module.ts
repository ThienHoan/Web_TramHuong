import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from '../supabase/supabase.module';
import { AutomationGuard } from './automation.guard';
import { AutomationController } from './automation.controller';
import { AutomationRepository } from './automation.repository';

@Module({
  imports: [ConfigModule, SupabaseModule],
  controllers: [AutomationController],
  providers: [AutomationGuard, AutomationRepository],
})
export class AutomationModule {}
