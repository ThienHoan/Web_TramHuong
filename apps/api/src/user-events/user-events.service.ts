import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateUserEventDto } from './dto/create-user-event.dto';

@Injectable()
export class UserEventsService {
    private readonly logger = new Logger(UserEventsService.name);

    constructor(private readonly supabase: SupabaseService) { }

    async create(userId: string | null, dto: CreateUserEventDto) {
        const { data, error } = await this.supabase.getClient()
            .from('user_events')
            .insert({
                user_id: userId,
                session_id: dto.sessionId,
                event_type: dto.eventType,
                product_id: dto.productId,
                metadata: dto.metadata,
            })
            .select()
            .single();

        if (error) {
            this.logger.error(`Failed to create user event: ${error.message}`, error);
            // We don't throw error here to avoid blocking client/frontend flow for tracking
            return null;
        }

        return data;
    }

    async getHistory(userId: string, limit = 50) {
        const { data, error } = await this.supabase.getClient()
            .from('user_events')
            .select('*, product:products(slug, price, translation:product_translations(title, description))') // Join for product details
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            this.logger.error(`Failed to get user history: ${error.message}`, error);
            return [];
        }

        return data;
    }
}
