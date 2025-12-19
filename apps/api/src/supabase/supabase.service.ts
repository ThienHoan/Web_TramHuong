import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
    private readonly logger = new Logger(SupabaseService.name);
    private clientInstance: SupabaseClient;

    constructor(private readonly configService: ConfigService) {
        this.initClient();
    }

    private initClient() {
        const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
        const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !supabaseKey) {
            this.logger.error('Supabase URL or Key is missing!');
            return;
        }

        this.clientInstance = createClient(supabaseUrl, supabaseKey);
        this.logger.log('Supabase client initialized');
    }

    getClient(): SupabaseClient {
        return this.clientInstance;
    }
}
