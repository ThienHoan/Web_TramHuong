import sharp from 'sharp';
import { ShippingEvidenceService } from './evidence.service';
import { ShippingOperationsService } from './operations.service';
import { LogisticsRepository } from './logistics.repository';
import { SupabaseService } from '../supabase/supabase.service';

describe('private shipping evidence boundary', () => {
  let service: ShippingEvidenceService,
    owned: jest.Mock,
    upload: jest.Mock,
    remove: jest.Mock,
    write: jest.Mock,
    sign: jest.Mock;
  let attachments: string[], isPublic: boolean;
  const actor = { id: 'owner', role: 'CUSTOMER' };
  beforeEach(() => {
    attachments = [];
    isPublic = false;
    owned = jest.fn().mockResolvedValue({});
    upload = jest.fn().mockResolvedValue({ error: null });
    remove = jest.fn().mockResolvedValue({ error: null });
    write = jest.fn().mockResolvedValue({});
    sign = jest.fn().mockResolvedValue({
      data: { signedUrl: 'https://fixture.invalid/private' },
      error: null,
    });
    service = new ShippingEvidenceService(
      { write } as unknown as LogisticsRepository,
      {
        record: () =>
          Promise.resolve({
            id: 'ticket',
            key: 'ticket:key',
            state: 'OPEN',
            order_id: 'order',
            data: { attachments },
          }),
        owned,
      } as unknown as ShippingOperationsService,
      {
        getClient: () => ({
          storage: {
            getBucket: () =>
              Promise.resolve({
                data: { public: isPublic },
                error: null,
              }),
            from: () => ({ upload, remove, createSignedUrl: sign }),
          },
        }),
      } as unknown as SupabaseService,
    );
  });
  const file = (buffer: Buffer, mimetype = 'image/png') =>
    ({ buffer, mimetype }) as Express.Multer.File;
  it('checks ownership before reading or writing evidence', async () => {
    owned.mockRejectedValue(new Error('SHIPMENT_NOT_FOUND'));
    await expect(
      service.upload('ticket', actor, [file(Buffer.from('invalid'))]),
    ).rejects.toThrow('NOT_FOUND');
    await expect(service.url('ticket', actor, 0)).rejects.toThrow('NOT_FOUND');
    expect(upload).not.toHaveBeenCalled();
    expect(sign).not.toHaveBeenCalled();
  });
  it('refuses a public bucket and unsupported file types', async () => {
    isPublic = true;
    await expect(
      service.upload('ticket', actor, [file(Buffer.from('invalid'))]),
    ).rejects.toThrow('PRIVATE');
    isPublic = false;
    await expect(
      service.upload('ticket', actor, [
        file(Buffer.from('invalid'), 'image/svg+xml'),
      ]),
    ).rejects.toThrow('JPEG_PNG');
    expect(upload).not.toHaveBeenCalled();
  });
  it('stores stripped JPEG with random private path and signs it only briefly', async () => {
    const bytes = await sharp({
      create: { width: 20, height: 20, channels: 3, background: '#abcdef' },
    })
      .png()
      .toBuffer();
    await service.upload('ticket', actor, [file(bytes)]);
    const [path, stored, options] = upload.mock.calls[0] as [
      string,
      Buffer,
      { contentType: string },
    ];
    expect(path).toMatch(/^tickets\/ticket\/[a-f0-9-]+\.jpg$/);
    expect(options.contentType).toBe('image/jpeg');
    expect((await sharp(stored).metadata()).format).toBe('jpeg');
    attachments = [path];
    await service.url('ticket', actor, 0);
    expect(sign).toHaveBeenCalledWith(path, 60);
  });
  it('removes only newly uploaded paths if the record write conflicts', async () => {
    const bytes = await sharp({
      create: { width: 2, height: 2, channels: 3, background: '#abcdef' },
    })
      .png()
      .toBuffer();
    write.mockRejectedValue(new Error('SHIPPING_CONFLICT'));
    await expect(
      service.upload('ticket', actor, [file(bytes)]),
    ).rejects.toThrow('CONFLICT');
    const [uploadedPath] = upload.mock.calls[0] as [string];
    expect(remove).toHaveBeenCalledWith([uploadedPath]);
  });
  it('rejects another ticket path and limits total evidence count', async () => {
    attachments = ['tickets/other/secret.jpg'];
    await expect(service.url('ticket', actor, 0)).rejects.toThrow('NOT_FOUND');
    expect(sign).not.toHaveBeenCalled();
    attachments = Array(6).fill('tickets/ticket/a.jpg') as string[];
    await expect(
      service.upload('ticket', actor, [file(Buffer.from('invalid'))]),
    ).rejects.toThrow('MAX_6');
  });
});
