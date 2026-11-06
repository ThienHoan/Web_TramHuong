// Express "trust proxy" value. Default trusts only loopback and private networks
// (the Caddy/nginx container on the Docker network). "true" is refused: it would
// let any visitor choose their own IP with an X-Forwarded-For header.
const DEFAULT = 'loopback, linklocal, uniquelocal';

export function trustProxySetting(
  raw: string | undefined,
): string | number | false {
  const value = (raw ?? '').trim();
  if (!value) return DEFAULT;
  if (/^(false|0|off|none)$/i.test(value)) return false;
  if (/^[1-9]$/.test(value)) return Number(value);
  if (/^(true|\*|all)$/i.test(value)) return DEFAULT;
  return value;
}
