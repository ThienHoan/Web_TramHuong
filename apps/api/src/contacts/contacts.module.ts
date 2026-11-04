import { Module } from '@nestjs/common';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [SupabaseModule, IntegrationsModule],
  controllers: [ContactsController],
  providers: [ContactsService],
})
export class ContactsModule {}
