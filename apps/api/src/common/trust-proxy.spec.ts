import express from 'express';
import type { AddressInfo } from 'node:net';
import { trustProxySetting } from './trust-proxy';

describe('trustProxySetting', () => {
  it('defaults to private hops only and refuses "trust everyone"', () => {
    expect(trustProxySetting(undefined)).toBe(
      'loopback, linklocal, uniquelocal',
    );
    expect(trustProxySetting('true')).toBe('loopback, linklocal, uniquelocal');
    expect(trustProxySetting('*')).toBe('loopback, linklocal, uniquelocal');
    expect(trustProxySetting('false')).toBe(false);
    expect(trustProxySetting('2')).toBe(2);
    expect(trustProxySetting('10.0.0.0/8')).toBe('10.0.0.0/8');
  });

  it('gives each visitor their own IP behind a local proxy', async () => {
    const app = express();
    app.set('trust proxy', trustProxySetting(undefined));
    app.get('/', (req, res) => {
      res.json({ ip: req.ip });
    });
    const server = app.listen(0, '127.0.0.1');
    await new Promise((r) => server.once('listening', r));
    const port = (server.address() as AddressInfo).port;
    const ipFor = async (xff?: string) => {
      const res = await fetch(`http://127.0.0.1:${port}/`, {
        headers: xff ? { 'x-forwarded-for': xff } : {},
      });
      return ((await res.json()) as { ip: string }).ip;
    };
    try {
      // The proxy (loopback here) appends the real client address.
      expect(await ipFor('203.0.113.7')).toBe('203.0.113.7');
      expect(await ipFor('198.51.100.9')).toBe('198.51.100.9');
      // A spoofed left-most value is ignored: the right-most public hop wins.
      expect(await ipFor('1.2.3.4, 203.0.113.7')).toBe('203.0.113.7');
    } finally {
      server.close();
    }
  });
});
