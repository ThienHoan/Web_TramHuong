export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Expected object');
  return value as Record<string, unknown>;
}

export function list<T>(
  value: unknown,
  decode: (row: Record<string, unknown>) => T,
): T[] {
  if (!Array.isArray(value)) throw new Error('Expected list');
  return value.map((row) => decode(object(row)));
}

export function integer(
  value: unknown,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
): number {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < min ||
    value > max
  )
    throw new Error('Expected bounded integer');
  return value;
}

export function string(value: unknown): string {
  if (typeof value !== 'string' || !value.trim())
    throw new Error('Expected nonempty string');
  return value;
}

export function isoDate(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  const raw = string(value);
  if (!/^\d{4}-\d{2}-\d{2}T/.test(raw) || !Number.isFinite(Date.parse(raw)))
    throw new Error('Expected ISO date');
  return new Date(raw).toISOString();
}
