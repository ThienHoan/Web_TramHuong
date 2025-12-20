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

        this.logger.log(`Initializing Supabase Client... URL: ${supabaseUrl}`);
        this.logger.log(`Service Role Key Present: ${!!supabaseKey}`);
        if (supabaseKey) {
            this.logger.log(`Key length: ${supabaseKey.length}, Starts with: ${supabaseKey.substring(0, 5)}...`);
        }

        if (!supabaseUrl || !supabaseKey) {
            this.logger.error('Supabase URL or Key is missing!');
            return;
        }

        this.clientInstance = createClient(supabaseUrl, supabaseKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });
        this.logger.log('Supabase client initialized');
    }

    getClient(): SupabaseClient {
        return this.clientInstance;
    }
}
