import { PostsService } from './posts.service';
import { SupabaseService } from '../supabase/supabase.service';

describe('post visibility', () => {
  const setup = () => {
    const query = {
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({ data: [], count: 0, error: null }),
      single: jest.fn().mockResolvedValue({ data: {}, error: null }),
    };
    const service = new PostsService({
      getClient: () => ({ from: () => query }),
    } as unknown as SupabaseService);
    return { query, service };
  };
  it('ignores public requests to list drafts', async () => {
    const { service, query } = setup();
    await service.findAll({ status: 'all' });
    expect(query.eq).toHaveBeenCalledWith('status', 'published');
  });
  it('filters public direct reads to published posts', async () => {
    const { service, query } = setup();
    await service.findOne('story');
    expect(query.eq).toHaveBeenCalledWith('status', 'published');
  });
  it('allows the guarded admin list to include drafts', async () => {
    const { service, query } = setup();
    await service.findAll({ status: 'all' }, true);
    expect(query.eq).not.toHaveBeenCalledWith('status', 'published');
  });
});
