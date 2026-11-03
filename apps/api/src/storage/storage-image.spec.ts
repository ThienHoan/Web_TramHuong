import sharp from 'sharp';
import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';

describe('optimized catalog images', () => {
  const setup = (failThumbnail = false, referenced = false) => {
    const uploaded: { path: string; buffer: Buffer; options: unknown }[] = [];
    const remove = jest.fn().mockResolvedValue({ error: null });
    const upload = jest.fn((path: string, buffer: Buffer, options: unknown) => {
      uploaded.push({ path, buffer, options });
      return Promise.resolve({
        error:
          failThumbnail && path.endsWith('-thumb.webp')
            ? { message: 'failed' }
            : null,
      });
    });
    const service = new StorageService({
      get: (key: string) =>
        key === 'SUPABASE_URL' ? 'https://example.supabase.co' : 'fixture-key',
    } as unknown as ConfigService);
    (service as unknown as { supabase: unknown }).supabase = {
      from: () => ({
        select: () => ({
          contains: () => ({
            limit: () =>
              Promise.resolve({
                data: referenced ? [{ id: 'in-use' }] : [],
                error: null,
              }),
          }),
        }),
      }),
      storage: {
        from: () => ({
          upload,
          remove,
          getPublicUrl: (path: string) => ({
            data: { publicUrl: 'https://example.supabase.co/' + path },
          }),
        }),
      },
    };
    return { service, uploaded, remove, upload };
  };
  it('writes bounded WebP main/thumbnail images and removes EXIF', async () => {
    const { service, uploaded } = setup();
    const image = await sharp({
      create: { width: 2400, height: 1800, channels: 3, background: '#60452f' },
    })
      .jpeg()
      .withMetadata()
      .toBuffer();
    const result = await service.storeOptimizedImage(image);
    expect(result.path).toMatch(/^products\/optimized\/.*\.webp$/);
    expect(uploaded).toHaveLength(2);
    const main = await sharp(uploaded[0].buffer).metadata();
    const thumb = await sharp(uploaded[1].buffer).metadata();
    expect(main.format).toBe('webp');
    expect(main.width).toBe(1600);
    expect(thumb.width).toBe(480);
    expect(main.exif).toBeUndefined();
  });
  it('rejects invalid image bytes without uploading', async () => {
    const { service, upload } = setup();
    await expect(
      service.storeOptimizedImage(Buffer.from('fake image')),
    ).rejects.toThrow();
    expect(upload).not.toHaveBeenCalled();
  });
  it('cleans the main image if its thumbnail cannot be stored', async () => {
    const { service, remove } = setup(true);
    const image = await sharp({
      create: { width: 2, height: 2, channels: 3, background: 'white' },
    })
      .png()
      .toBuffer();
    await expect(service.storeOptimizedImage(image)).rejects.toThrow('thu nhỏ');
    expect(remove).toHaveBeenCalled();
  });
  it('does not delete a file still referenced by a product', async () => {
    const { service, remove } = setup(false, true);
    await service.deleteProductImage('products/optimized/shared.webp');
    expect(remove).not.toHaveBeenCalled();
  });
  it('deletes an unreferenced image and its thumbnail together', async () => {
    const { service, remove } = setup();
    await service.deleteProductImage('products/optimized/unused.webp');
    expect(remove).toHaveBeenCalledWith([
      'products/optimized/unused.webp',
      'products/optimized/unused-thumb.webp',
    ]);
  });
});
