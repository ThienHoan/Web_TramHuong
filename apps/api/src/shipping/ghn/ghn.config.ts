export const GHN_CONFIG = Symbol('GHN_CONFIG');

export interface GhnConfig {
  readonly enabled: boolean;
  readonly environment: 'staging' | 'production';
  readonly origin: string;
  readonly token: string;
  readonly shopId: number;
  readonly timeoutMs: number;
  readonly readRetries: number;
}

// Only official origins are selectable; never accept a caller-supplied base URL.
export function loadGhnConfig(config: {
  get(key: string): unknown;
}): GhnConfig {
  const read = (key: string, fallback = ''): string => {
    const value = config.get(key);
    if (value === undefined) return fallback;
    if (
      typeof value !== 'string' &&
      typeof value !== 'number' &&
      typeof value !== 'boolean'
    ) {
      throw new Error(`${key} is invalid`);
    }
    return String(value).trim();
  };
  const enabled = read('GHN_ENABLED', 'false');
  if (!['true', 'false'].includes(enabled)) {
    throw new Error('GHN_ENABLED must be true or false');
  }
  const environment = read('GHN_ENV', 'staging');
  if (environment !== 'staging' && environment !== 'production') {
    throw new Error('GHN_ENV must be staging or production');
  }
  if (
    enabled === 'true' &&
    environment === 'production' &&
    read('NODE_ENV') !== 'production'
  ) {
    throw new Error('GHN production access is forbidden outside production');
  }
  const integer = (key: string, fallback: string, min: number, max: number) => {
    const raw = read(key, fallback);
    const value = Number(raw);
    if (
      !/^\d+$/.test(raw) ||
      !Number.isSafeInteger(value) ||
      value < min ||
      value > max
    ) {
      throw new Error(`${key} is invalid`);
    }
    return value;
  };
  const token = read('GHN_TOKEN');
  if (enabled === 'true' && (!token || /[\r\n]/.test(token))) {
    throw new Error('GHN_TOKEN is required and must be a valid header value');
  }
  const shopId =
    enabled === 'true'
      ? integer('GHN_SHOP_ID', '', 1, Number.MAX_SAFE_INTEGER)
      : 0;
  return Object.freeze({
    enabled: enabled === 'true',
    environment,
    origin:
      environment === 'staging'
        ? 'https://dev-online-gateway.ghn.vn'
        : 'https://online-gateway.ghn.vn',
    token,
    shopId,
    timeoutMs: integer('GHN_TIMEOUT_MS', '8000', 200, 30000),
    readRetries: integer('GHN_READ_RETRIES', '1', 0, 2),
  });
}
