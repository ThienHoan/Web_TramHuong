import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../common/types/database.types';
import { VouchersService } from './vouchers.service';

describe('VouchersService.deleteVoucher', () => {
  const makeService = (result: {
    data: { id: string } | null;
    error: { message: string } | null;
  }) => {
    const maybeSingle = jest.fn().mockResolvedValue(result);
    const select = jest.fn().mockReturnValue({ maybeSingle });
    const eq = jest.fn().mockReturnValue({ select });
    const remove = jest.fn().mockReturnValue({ eq });
    const from = jest.fn().mockReturnValue({ delete: remove });
    const service = new VouchersService({
      from,
    } as unknown as SupabaseClient<Database>);
    return { service, from, eq };
  };

  it('deletes the requested voucher', async () => {
    const { service, from, eq } = makeService({
      data: { id: 'voucher-1' },
      error: null,
    });
    await expect(service.deleteVoucher('voucher-1')).resolves.toEqual({
      success: true,
    });
    expect(from).toHaveBeenCalledWith('vouchers');
    expect(eq).toHaveBeenCalledWith('id', 'voucher-1');
  });

  it('reports a missing voucher', async () => {
    const { service } = makeService({ data: null, error: null });
    await expect(service.deleteVoucher('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('reports database errors', async () => {
    const { service } = makeService({
      data: null,
      error: { message: 'constraint violation' },
    });
    await expect(service.deleteVoucher('voucher-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
