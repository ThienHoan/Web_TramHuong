export { strictFlag } from '../integrations/strict-flag';

// Shared by the opt-in durable MOCK stores (Search Console, PageSpeed).
// Matches the fixed CHECK lists in the TEST DB migrations; never raw provider text.
export const STORE_ERROR_CODES: readonly string[] = Object.freeze([
  'INVALID_RESPONSE',
  'UNAVAILABLE',
  'RATE_LIMITED',
  'QUOTA_EXCEEDED',
  'TIMEOUT',
  'REJECTED',
  'CIRCUIT_OPEN',
  'CONCURRENCY_LIMIT',
  'STORAGE_UNAVAILABLE',
  'BLOCKED',
]);
export const STORE_UUID =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

export function storeObject(value: unknown, code = 'INVALID_MOCK_STORE') {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(code);
  return value as Record<string, unknown>;
}

/** PostgreSQL timestamptz JSON (microseconds/offset) → ISO, or null. */
export function storeTimestamp(value: unknown): string | null {
  if (value === null) return null;
  if (
    typeof value !== 'string' ||
    value.length > 40 ||
    !Number.isFinite(Date.parse(value))
  )
    throw new Error('INVALID_MOCK_STORE_TIME');
  return new Date(value).toISOString();
}
