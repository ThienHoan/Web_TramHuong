import { UsersService } from './users.service';
import { SupabaseService } from '../supabase/supabase.service';

describe('profile updates', () => {
  it('does not pass privileged fields to the database', async () => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    const update = jest.fn().mockReturnValue({ eq });
    const supabase = { getClient: () => ({ from: () => ({ update }) }) };
    const service = new UsersService(supabase as unknown as SupabaseService);
    await service.updateProfile('customer-id', {
      full_name: 'Customer',
      role: 'ADMIN',
      is_banned: false,
    } as Parameters<UsersService['updateProfile']>[1]);
    expect(update).toHaveBeenCalledWith({ full_name: 'Customer' });
    expect(eq).toHaveBeenCalledWith('id', 'customer-id');
  });
});
