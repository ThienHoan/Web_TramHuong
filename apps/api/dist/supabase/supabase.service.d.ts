import { ConfigService } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';
export declare class SupabaseService {
    private readonly configService;
    private readonly logger;
    private clientInstance;
    constructor(configService: ConfigService);
    private initClient;
    getClient(): SupabaseClient;
}
