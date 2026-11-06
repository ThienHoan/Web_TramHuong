import { pagination } from '../common/pagination';
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class UsersService {
  constructor(private readonly supabase: SupabaseService) {}

  async findAll(options: {
    page: number;
    limit: number;
    search?: string;
    role?: string;
  }) {
    const { page, limit } = pagination(options.page, options.limit);
    const client = this.supabase.getClient();
    let query = client.from('users').select('*', { count: 'exact' });

    if (options.role) {
      query = query.eq('role', options.role);
    }

    if (options.search) {
      const search = options.search
        .toLowerCase()
        .replace(/[,().%_]/g, ' ')
        .trim();
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
    }

    query = query.order('created_at', { ascending: false });

    const from = (page - 1) * limit;
    const to = from + limit - 1;
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
        page,
        limit,
        last_page: Math.max(1, Math.ceil((count || 0) / limit)),
      },
    };
  }

  async findOne(id: string) {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) throw new NotFoundException('User not found');
    return data;
  }

  async updateUserRole(id: string, role: string) {
    if (!['ADMIN', 'STAFF', 'CUSTOMER'].includes(role))
      throw new BadRequestException('Invalid role');
    await this.findOne(id);
    const client = this.supabase.getClient();
    const { error } = await client.from('users').update({ role }).eq('id', id);
    if (error) throw new BadRequestException(error.message);
    return { success: true };
  }

  async toggleBan(id: string, isBanned: boolean) {
    if (typeof isBanned !== 'boolean')
      throw new BadRequestException('is_banned must be boolean');
    await this.findOne(id);
    const client = this.supabase.getClient();
    const { error } = await client
      .from('users')
      .update({ is_banned: isBanned })
      .eq('id', id);
    if (error) throw new BadRequestException(error.message);

    // Optionally: Revoke Supabase Auth sessions if possible via admin API
    // For now, just updating the public table flag. AuthGuard should check this.

    return { success: true };
  }

  async updateProfile(
    id: string,
    data: {
      full_name?: string;
      phone_number?: string;
      province?: string;
      district?: string;
      ward?: string;
      street_address?: string;
      avatar_url?: string;
    },
  ) {
    const client = this.supabase.getClient();
    const {
      full_name,
      phone_number,
      province,
      district,
      ward,
      street_address,
      avatar_url,
    } = data;
    const safeData = Object.fromEntries(
      Object.entries({
        full_name,
        phone_number,
        province,
        district,
        ward,
        street_address,
        avatar_url,
      }).filter(([, value]) => value !== undefined),
    );
    const { error } = await client.from('users').update(safeData).eq('id', id);

    if (error) {
      console.error('Update Profile Error:', error);
      throw new BadRequestException(error.message);
    }

    return { success: true };
  }
}
