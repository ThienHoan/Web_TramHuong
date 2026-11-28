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

describe('post URL handle', () => {
  const setup = (currentTitle = 'Trầm hương là gì?') => {
    const updates: Record<string, unknown>[] = [];
    const query: Record<string, jest.Mock> = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      update: jest.fn((values: Record<string, unknown>) => {
        updates.push(values);
        return query;
      }),
      single: jest
        .fn()
        .mockResolvedValue({ data: { title: currentTitle }, error: null }),
    };
    const service = new PostsService({
      getClient: () => ({ from: () => query }),
    } as unknown as SupabaseService);
    return { service, updates };
  };

  it('generates the handle from the new title when the field is left blank', async () => {
    const { service, updates } = setup();
    await service.update('id', {
      title: 'Trầm hương là gì? Nguồn gốc và giá trị',
      slug: '',
    });
    expect(updates[0].slug).toBe('tram-huong-la-gi-nguon-goc-va-gia-tri');
  });

  it('falls back to the saved title when only the handle is cleared', async () => {
    const { service, updates } = setup('Đốt nụ trầm đúng cách');
    await service.update('id', { slug: '   ' });
    expect(updates[0].slug).toBe('dot-nu-tram-dung-cach');
  });

  it('keeps a handle the editor typed', async () => {
    const { service, updates } = setup();
    await service.update('id', { slug: 'cach-dot-nu-tram' });
    expect(updates[0].slug).toBe('cach-dot-nu-tram');
  });
});

describe('post publishing metadata', () => {
  function setup(current: Record<string, unknown>) {
    const updates: Record<string, unknown>[] = [];
    const query: Record<string, jest.Mock> = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: current, error: null }),
      update: jest.fn((value: Record<string, unknown>) => {
        updates.push(value);
        return query;
      }),
    };
    const service = new PostsService({
      getClient: () => ({ from: () => query }),
    } as unknown as SupabaseService);
    return { service, updates };
  }
  it('preserves the original publication date when saving and republishing', async () => {
    const { service, updates } = setup({
      title: 'Story',
      slug: 'story',
      published_at: '2026-01-01T00:00:00Z',
    });
    await service.update('id', {
      status: 'published' as import('./dto/post.dto').PostStatus,
      title: 'Updated story',
    });
    expect(updates[0]).not.toHaveProperty('published_at');
    expect(updates[0]).toHaveProperty('updated_at');
  });
  it('sets the first publication date when a draft is published', async () => {
    const { service, updates } = setup({
      title: 'Story',
      slug: 'story',
      published_at: null,
    });
    await service.update('id', {
      status: 'published' as import('./dto/post.dto').PostStatus,
    });
    expect(Date.parse(updates[0].published_at as string)).not.toBeNaN();
  });
  it('rejects changing a URL that has already been published', async () => {
    const { service, updates } = setup({
      title: 'Story',
      slug: 'story',
      published_at: '2026-01-01T00:00:00Z',
    });
    await expect(service.update('id', { slug: 'new-story' })).rejects.toThrow(
      'Không thể đổi đường dẫn',
    );
    expect(updates).toHaveLength(0);
  });
});
