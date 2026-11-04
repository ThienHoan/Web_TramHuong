// No fetch, OAuth client or credentials. Only synthetic data can be queried.
export const MOCK_SEARCH_PROPERTY = 'sc-domain:mock.example.invalid';
export const SEARCH_DIMENSIONS = [
  'date',
  'query',
  'page',
  'device',
  'country',
] as const;
export interface SearchQuery {
  startDate: string;
  endDate: string;
  dimensions: typeof SEARCH_DIMENSIONS;
  type: 'web';
  dataState: 'final';
  rowLimit: 100;
  startRow: number;
}
export interface SearchRow {
  keys: [string, string, string, string, string];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}
export interface SearchConsoleMockAdapter {
  query(request: SearchQuery, signal: AbortSignal): Promise<unknown>;
}

export class MockSearchConsoleAdapter implements SearchConsoleMockAdapter {
  query(request: SearchQuery, signal: AbortSignal): Promise<unknown> {
    if (signal.aborted) return Promise.reject(new Error('ABORTED'));
    const day = Math.floor(Date.parse(request.startDate) / 86400000);
    // A missing day is deliberate: consumers must not turn it into zero traffic.
    if (day % 7 === 0) return Promise.resolve({});
    const samples = [
      ['trầm hương', '/vi/products/tram-mau', 'MOBILE', 8, 400],
      ['vòng trầm', '/vi/products/vong-mau', 'DESKTOP', 2, 800],
      ['agarwood', '/en/products/sample', 'MOBILE', 4, 300],
      ['nhang trầm', '/vi/products/nhang-mau', 'TABLET', 6, 250],
    ] as const;
    const rows: SearchRow[] = samples.map(
      ([query, path, device, base, impressions]) => {
        const clicks = base + (day % 5);
        return {
          keys: [
            request.startDate,
            query,
            'https://mock.example.invalid' + path,
            device,
            'vnm',
          ],
          clicks,
          impressions,
          ctr: clicks / impressions,
          position: 4 + (day % 9),
        };
      },
    );
    rows.sort((a, b) => b.clicks - a.clicks);
    return Promise.resolve({
      rows: rows.slice(request.startRow, request.startRow + request.rowLimit),
    });
  }
}
