import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));

describe('Supabase initialization logging privacy', () => {
  afterEach(() => jest.restoreAllMocks());

  it('passes credentials to the client but never logs the key, prefix or URL', () => {
    const url = 'https://synthetic-project.example.invalid';
    const secret = 'synthetic-service-role-secret';
    const client = {};
    jest
      .mocked(createClient)
      .mockReturnValue(client as ReturnType<typeof createClient>);
    const log = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => {});
    const error = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {});
    const config = {
      get: (key: string) => (key === 'SUPABASE_URL' ? url : secret),
    } as unknown as ConfigService;
    const service = new SupabaseService(config);
    expect(service.getClient()).toBe(client);
    expect(createClient).toHaveBeenCalledWith(url, secret, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    expect(log.mock.calls).toEqual([['Supabase client initialized']]);
    expect(error).not.toHaveBeenCalled();
  });
});
