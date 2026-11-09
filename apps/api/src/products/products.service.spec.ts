import { ProductsService } from './products.service';
import { SupabaseService } from '../supabase/supabase.service';
import { StorageService } from '../storage/storage.service';
import { UpdateProductDto } from './dto/product.dto';

describe('visible products need an image', () => {
  const setup = (products: { images: string[]; is_active: boolean }[]) => {
    const written: unknown[] = [];
    const db = {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: products[0], error: null }),
          }),
          in: () => Promise.resolve({ data: products, error: null }),
        }),
        update: (values: unknown) => {
          written.push(values);
          const done = Promise.resolve({ error: null });
          return { eq: () => done, in: () => done };
        },
      }),
    };
    const service = new ProductsService(
      { getClient: () => db } as unknown as SupabaseService,
      {} as StorageService,
    );
    return { service, written };
  };
  const body = (value: object) => value as UpdateProductDto;
  const photo = ['https://example.test/a.webp'];

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('refuses to activate a product without images', async () => {
    const { service, written } = setup([{ images: [], is_active: false }]);
    await expect(
      service.update('id', body({ is_active: true })),
    ).rejects.toThrow('ít nhất 1 ảnh');
    expect(written).toEqual([]);
  });
  it('activates a product once it has images', async () => {
    const { service, written } = setup([{ images: photo, is_active: false }]);
    await service.update('id', body({ is_active: true }));
    expect(written).toEqual([{ is_active: true }]);
  });
  it('lets a hidden product be saved while it still has no images', async () => {
    const { service, written } = setup([{ images: [], is_active: false }]);
    await service.update('id', body({ keep_images: '[]' }));
    expect(written).toEqual([{ images: [] }]);
  });
  it('refuses to remove the last image of a visible product', async () => {
    const { service, written } = setup([{ images: photo, is_active: true }]);
    await expect(
      service.update('id', body({ keep_images: '[]' })),
    ).rejects.toThrow('ít nhất 1 ảnh');
    expect(written).toEqual([]);
  });
  it('refuses a bulk show when a selected product has no images', async () => {
    const { service, written } = setup([
      { images: photo, is_active: false },
      { images: [], is_active: false },
    ]);
    await expect(service.bulkUpdate(['a', 'b'], 'restore')).rejects.toThrow(
      '1 sản phẩm chưa có ảnh',
    );
    expect(written).toEqual([]);
  });
  it('saves the style chosen in the edit form', async () => {
    const { service, written } = setup([{ images: photo, is_active: true }]);
    await service.update('id', body({ style: 'traditional' }));
    expect(written).toEqual([{ style: 'traditional' }]);
  });
  it('bulk shows products that all have images', async () => {
    const { service, written } = setup([{ images: photo, is_active: false }]);
    await service.bulkUpdate(['a'], 'restore');
    expect(written).toEqual([{ is_active: true }]);
  });
});
