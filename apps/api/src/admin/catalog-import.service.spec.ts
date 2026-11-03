import { Workbook } from 'exceljs';
import { catalogTemplate } from './catalog-import-format';
import { CatalogImportService } from './catalog-import.service';
import { SupabaseService } from '../supabase/supabase.service';
import { StorageService } from '../storage/storage.service';
import { randomUUID } from 'node:crypto';

describe('catalog row import retries and cleanup', () => {
  it('loads every current category page when generating a template', async () => {
    const rows = Array.from({ length: 501 }, (_, index) => ({
      slug: `category-${index}`,
      is_active: true,
      translations: [{ locale: 'vi', name: `Danh mục ${index}` }],
    }));
    const range = jest.fn((start: number, end: number) => ({
      returns: () =>
        Promise.resolve({ data: rows.slice(start, end + 1), error: null }),
    }));
    const query = { select: () => query, order: () => query, range };
    const service = new CatalogImportService(
      {
        getClient: () => ({ from: () => query }),
      } as unknown as SupabaseService,
      {} as StorageService,
    );
    const buffer = await service.template('products');
    const workbook = new Workbook();
    await workbook.xlsx.load(
      buffer as unknown as Parameters<typeof workbook.xlsx.load>[0],
    );
    expect(workbook.getWorksheet('Danh muc hien co')!.rowCount).toBe(502);
    expect(range).toHaveBeenCalledTimes(2);
  });
  it('reports category loading failure instead of returning a misleading static template', async () => {
    const query = {
      select: () => query,
      order: () => query,
      range: () => ({
        returns: () =>
          Promise.resolve({ data: null, error: { message: 'offline' } }),
      }),
    };
    const service = new CatalogImportService(
      {
        getClient: () => ({ from: () => query }),
      } as unknown as SupabaseService,
      {} as StorageService,
    );
    await expect(service.template('products')).rejects.toThrow(
      'Không thể tải danh mục',
    );
  });
  const actor = randomUUID();
  const row = {
    slug: 'vong-tram',
    name: 'Vòng trầm',
    category: 'vong',
    price: 100,
    quantity: 2,
    images: ['vong.jpg'],
  };
  const file = {
    originalname: 'vong.jpg',
    mimetype: 'image/jpeg',
    buffer: Buffer.from('fixture'),
    size: 7,
  } as Express.Multer.File;
  const setup = (
    error: { code: string; message: string } | null = null,
    replayed = false,
  ) => {
    const state: { receipt: unknown } = { receipt: null };
    const rpc = jest.fn().mockResolvedValue({
      data: {
        id: 'product-id',
        slug: 'vong-tram',
        action: 'created',
        replayed,
      },
      error,
    });
    const db = {
      from: (table: string) => {
        const q = {
          select: () => q,
          eq: () => q,
          maybeSingle: () =>
            Promise.resolve({
              data:
                table === 'admin_catalog_imports'
                  ? state.receipt
                  : table === 'categories'
                    ? { id: 'category-id' }
                    : null,
              error: null,
            }),
        };
        return q;
      },
      rpc,
    };
    const storage = {
      uploadProductImage: jest.fn().mockResolvedValue({
        url: 'https://example.test/new.webp',
        path: 'products/optimized/new.webp',
      }),
      deleteProductImage: jest.fn().mockResolvedValue(undefined),
    };
    const service = new CatalogImportService(
      { getClient: () => db } as unknown as SupabaseService,
      storage as unknown as StorageService,
    );
    return { service, storage, rpc, state };
  };
  it.each(['PGRST202', '22023'])(
    'validates migration readiness using a rejected probe (%s)',
    async (code) => {
      const query = {
        select: () => query,
        in: () => Promise.resolve({ data: [], error: null }),
      };
      const rpc = jest.fn().mockResolvedValue({ data: null, error: { code } });
      const db = { from: () => query, rpc };
      const service = new CatalogImportService(
        { getClient: () => db } as unknown as SupabaseService,
        {} as StorageService,
      );
      const result = await service.preview(
        'categories',
        await catalogTemplate('categories'),
        'skip',
        [],
      );
      expect(result.configured).toBe(code === '22023');
      expect(rpc).toHaveBeenCalledWith(
        'admin_import_catalog_row',
        expect.objectContaining({ p_resource: '__configuration_probe__' }),
      );
    },
  );
  it('cleans new images after a definite SQL rollback', async () => {
    const { service, storage } = setup({
      code: '23505',
      message: 'constraint',
    });
    await expect(
      service.commit('products', row, 'skip', randomUUID(), actor, [file]),
    ).rejects.toThrow();
    expect(storage.deleteProductImage).toHaveBeenCalledWith(
      'products/optimized/new.webp',
    );
  });
  it('preserves images on an ambiguous transport failure after submission', async () => {
    const { service, storage } = setup({ code: '', message: 'fetch failed' });
    await expect(
      service.commit('products', row, 'skip', randomUUID(), actor, [file]),
    ).rejects.toThrow();
    expect(storage.deleteProductImage).not.toHaveBeenCalled();
  });
  it('returns a saved receipt without re-uploading images on retry', async () => {
    const { service, storage, rpc, state } = setup();
    const requestId = randomUUID();
    const first = await service.commit(
      'products',
      row,
      'skip',
      requestId,
      actor,
      [file],
    );
    const calls = rpc.mock.calls as unknown as [string, { p_hash: string }][];
    const args = calls[0][1];
    state.receipt = {
      actor_id: actor,
      payload_hash: args.p_hash,
      result: first,
    };
    const replay = await service.commit(
      'products',
      row,
      'skip',
      requestId,
      actor,
      [file],
    );
    expect(replay.replayed).toBe(true);
    expect(storage.uploadProductImage).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledTimes(1);
  });
  it('cleans redundant images if a concurrent retry has already committed', async () => {
    const { service, storage } = setup(null, true);
    await service.commit('products', row, 'skip', randomUUID(), actor, [file]);
    expect(storage.deleteProductImage).toHaveBeenCalledWith(
      'products/optimized/new.webp',
    );
  });
});
