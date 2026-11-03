import { isPublicAddress, publicImageUrl } from './remote-image';
describe('remote image URLs', () => {
  it.each([
    '127.0.0.1',
    '10.0.0.1',
    '169.254.169.254',
    '172.16.1.1',
    '192.168.1.1',
    '::1',
    '::ffff:127.0.0.1',
    'fc00::1',
    'fe80::1',
    '0.0.0.0',
    '224.0.0.1',
  ])('blocks non-public address %s', (address) =>
    expect(isPublicAddress(address)).toBe(false),
  );
  it('allows public addresses', () => {
    expect(isPublicAddress('8.8.8.8')).toBe(true);
    expect(isPublicAddress('2606:4700:4700::1111')).toBe(true);
  });
  it.each([
    'http://example.com/image.jpg',
    'https://user:pass@example.com/image.jpg',
    'https://example.com:8443/image.jpg',
    'https://localhost/image.jpg',
  ])('rejects unsafe source %s', (source) =>
    expect(() => publicImageUrl(source)).toThrow(),
  );
  it('converts a single Drive file link into a download request', () => {
    const url = publicImageUrl(
      'https://drive.google.com/file/d/abcdefghijk123456/view?resourcekey=example',
    );
    expect(url.pathname).toBe('/uc');
    expect(url.searchParams.get('id')).toBe('abcdefghijk123456');
    expect(url.searchParams.get('resourcekey')).toBe('example');
  });
  it('rejects Drive folder links', () =>
    expect(() =>
      publicImageUrl('https://drive.google.com/drive/folders/abcdefghijk'),
    ).toThrow());
});
