// Jest safety net: unit/HTTP tests must never reach the internet. Any fetch to a
// non-loopback host throws before a socket opens. Tests that need a provider
// response inject a fake transport (e.g. TURNSTILE_TRANSPORT) instead.
const realFetch = globalThis.fetch;
const LOOPBACK = new Set(['127.0.0.1', 'localhost', '[::1]', '::1']);
function guardedFetch(input, init) {
  let host = '';
  try {
    host = new URL(typeof input === 'string' || input instanceof URL ? String(input) : input.url).hostname;
  } catch {
    return Promise.reject(new Error('TEST_FETCH_INVALID_URL'));
  }
  if (!LOOPBACK.has(host)) return Promise.reject(new Error('TEST_EXTERNAL_FETCH_BLOCKED:' + host));
  return realFetch(input, init);
}
Object.defineProperty(globalThis, 'fetch', { value: guardedFetch, writable: true, configurable: true });
