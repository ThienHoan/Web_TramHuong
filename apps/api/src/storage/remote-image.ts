import { BadRequestException } from '@nestjs/common';
import { lookup } from 'node:dns/promises';
import { LookupAddress } from 'node:dns';
import { request } from 'node:https';
import * as ipaddr from 'ipaddr.js';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export function publicImageUrl(source: string): URL {
  let url: URL;
  try {
    url = new URL(source);
  } catch {
    throw new BadRequestException('Link ảnh không hợp lệ');
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    (url.port && url.port !== '443') ||
    url.hostname === 'localhost' ||
    !url.hostname.includes('.')
  ) {
    throw new BadRequestException('Chỉ nhận link ảnh HTTPS công khai');
  }
  if (url.hostname === 'drive.google.com') {
    const id =
      url.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1] ||
      url.searchParams.get('id');
    if (!id || !/^[a-zA-Z0-9_-]{10,150}$/.test(id))
      throw new BadRequestException(
        'Hãy dùng link chia sẻ một ảnh Google Drive, không dùng link thư mục',
      );
    const key = url.searchParams.get('resourcekey');
    url = new URL('https://drive.google.com/uc');
    url.searchParams.set('export', 'download');
    url.searchParams.set('id', id);
    if (key) url.searchParams.set('resourcekey', key);
  }
  return url;
}
export function isPublicAddress(address: string): boolean {
  try {
    const parsed = ipaddr.process(address);
    return parsed.range() === 'unicast';
  } catch {
    return false;
  }
}

// Pin the validated DNS answer to the TLS connection, including every redirect.
// No cookies, service credentials or authorization headers are forwarded.
export async function downloadPublicImage(
  source: string,
  redirects = 0,
  deadline = Date.now() + 20000,
): Promise<{ buffer: Buffer; mimetype: string }> {
  if (redirects > 4)
    throw new BadRequestException('Link ảnh chuyển hướng quá nhiều lần');
  const url = publicImageUrl(source);
  if (Date.now() >= deadline)
    throw new BadRequestException('Tải ảnh quá thời gian cho phép');
  const addresses = await new Promise<LookupAddress[]>((resolve) => {
    const timer = setTimeout(
      () => resolve([]),
      Math.max(1, Math.min(8000, deadline - Date.now())),
    );
    lookup(url.hostname, { all: true }).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve([]);
      },
    );
  });
  if (
    !addresses.length ||
    addresses.some((value) => !isPublicAddress(value.address))
  )
    throw new BadRequestException('Không thể tải ảnh từ địa chỉ mạng này');
  const target = addresses[0];
  const result = await new Promise<{
    buffer: Buffer;
    mimetype: string;
    location?: string;
  }>((resolve, reject) => {
    const req = request(
      url,
      {
        family: target.family,
        headers: {
          Accept: 'image/jpeg,image/png,image/webp,image/avif',
          'User-Agent': 'ThienPhuc-ImageImport/1.0',
        },
        lookup: (_hostname, _options, callback) =>
          callback(null, target.address, target.family),
      },
      (response) => {
        const status = response.statusCode || 0;
        if (
          [301, 302, 303, 307, 308].includes(status) &&
          response.headers.location
        ) {
          response.resume();
          resolve({
            buffer: Buffer.alloc(0),
            mimetype: '',
            location: new URL(response.headers.location, url).toString(),
          });
          return;
        }
        const mimetype = (response.headers['content-type'] || '')
          .split(';')[0]
          .trim()
          .toLowerCase();
        if (
          status !== 200 ||
          !['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(
            mimetype,
          )
        ) {
          response.resume();
          reject(
            new BadRequestException(
              'Link không trả về ảnh. Với Drive, hãy cho phép tải ảnh hoặc chọn file trực tiếp.',
            ),
          );
          return;
        }
        if (Number(response.headers['content-length']) > MAX_IMAGE_BYTES) {
          response.destroy();
          reject(new BadRequestException('Ảnh vượt quá 5 MB'));
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        response.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_IMAGE_BYTES) {
            response.destroy();
            reject(new BadRequestException('Ảnh vượt quá 5 MB'));
          } else chunks.push(chunk);
        });
        response.on('end', () =>
          resolve({ buffer: Buffer.concat(chunks), mimetype }),
        );
        response.on('error', reject);
      },
    );
    const timer = setTimeout(
      () => req.destroy(new Error('Image download timed out')),
      Math.max(1, Math.min(12000, deadline - Date.now())),
    );
    req.on('close', () => clearTimeout(timer));
    req.on('error', reject);
    req.end();
  });
  if (result.location)
    return downloadPublicImage(result.location, redirects + 1, deadline);
  return result;
}
