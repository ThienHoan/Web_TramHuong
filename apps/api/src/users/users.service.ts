import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class UsersService {
    constructor(private readonly supabase: SupabaseService) { }

    async findAll(options: { page: number; limit: number; search?: string; role?: string }) {
        const client = this.supabase.getClient();
        let query = client.from('users').select('*', { count: 'exact' });

        if (options.role) {
            query = query.eq('role', options.role);
        }

        if (options.search) {
            const search = options.search.toLowerCase();
            query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
        }

        query = query.order('created_at', { ascending: false });

        const from = (options.page - 1) * options.limit;
        const to = from + options.limit - 1;
        query = query.range(from, to);

        const { data, count, error } = await query;
        if (error) {
            console.error('UsersService findAll Error:', error);
            throw new BadRequestException(error.message);
        }

        return {
            data,
            meta: {
                total: count,
                page: options.page,
                limit: options.limit,
                last_page: Math.ceil((count || 0) / options.limit)
            }
        };
    }

    async findOne(id: string) {
        const client = this.supabase.getClient();
        const { data, error } = await client.from('users').select('*').eq('id', id).single();
        if (error || !data) throw new NotFoundException('User not found');
        return data;
    }

    async updateUserRole(id: string, role: string) {
        const client = this.supabase.getClient();
        const { error } = await client.from('users').update({ role }).eq('id', id);
        if (error) throw new BadRequestException(error.message);
        return { success: true };
    }

    async toggleBan(id: string, isBanned: boolean) {
        const client = this.supabase.getClient();
        const { error } = await client.from('users').update({ is_banned: isBanned }).eq('id', id);
        if (error) throw new BadRequestException(error.message);

        // Optionally: Revoke Supabase Auth sessions if possible via admin API
        // For now, just updating the public table flag. AuthGuard should check this.

        return { success: true };
    }

    async updateProfile(id: string, data: {
        full_name?: string;
        phone_number?: string;
        province?: string;
        district?: string;
        ward?: string;
        street_address?: string;
        avatar_url?: string;
    }) {
        const client = this.supabase.getClient();
        const { error } = await client
            .from('users')
            .update(data)
            .eq('id', id);

        if (error) {
            console.error('Update Profile Error:', error);
            throw new BadRequestException(error.message);
        }

        return { success: true };
    }
}
