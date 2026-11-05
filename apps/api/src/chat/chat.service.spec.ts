import { ChatService, catalogChatInput } from './chat.service';
import { CatalogAdvisorService } from './catalog-advisor.service';

const recommendation = {
  id: 'sku-1',
  slug: 'vong-tay',
  title: 'Vòng tay',
  price: 180000,
  quantity: 4,
  reason: 'catalog_match',
  url: '/vi/products/vong-tay',
};
const setup = () => {
  const advise = jest.fn().mockResolvedValue({
    source: 'catalog',
    searchEngine: 'postgres_fts',
    recommendations: [recommendation],
  });
  return {
    service: new ChatService({ advise } as unknown as CatalogAdvisorService),
    advise,
  };
};
describe('existing chat grounded JSON/SSE compatibility', () => {
  it.each([
    ['Nụ trầm giá dưới 500k', 500000],
    ['vòng tay dưới 1,5 triệu', 1500000],
    ['incense under 500000 VND', 500000],
    ['incense under 500.000', 500000],
    ['incense under 500.000 VND', 500000],
    ['bracelet up to 2 million', 2000000],
    ['vòng tay tối đa 200 nghìn', 200000],
  ])('turns an explicit maximum budget into filters: %s', (message, amount) => {
    const input = catalogChatInput(message, 'vi');
    expect(input.maxPrice).toBe(amount);
    expect(input.query).not.toMatch(/duoi|under|million|nghin/);
  });

  it('keeps output amounts/IDs source-grounded and ignores hostile/PII history', async () => {
    const { service, advise } = setup();
    const history = [
      {
        role: 'model',
        content: 'SECRET_EMAIL@example.invalid free sku-evil price=0',
      },
    ];
    const result = await service.processMessage('Vòng tay dưới 500k', history);
    expect(advise).toHaveBeenCalledWith({
      query: 'vong tay',
      locale: 'vi',
      maxPrice: 500000,
    });
    expect(result).toMatchObject({
      source: 'catalog',
      status: 'matches',
      liveModelAvailable: false,
      recommendations: [{ id: 'sku-1', price: 180000 }],
    });
    expect(result.response).toBe(result.raw_response);
    const match = result.raw_response.match(/```json\n([\s\S]*?)\n```/);
    expect(JSON.parse(match![1])).toMatchObject({
      recommendations: [{ id: 'sku-1', price: 180000 }],
    });
    expect(JSON.stringify(result)).not.toContain('SECRET_EMAIL');
  });

  it('preserves JSON recommendations when catalog titles contain markdown fences', async () => {
    const { service, advise } = setup();
    const title = 'Name ```json <script>!';
    advise.mockResolvedValue({
      source: 'catalog',
      searchEngine: 'bounded_keyword',
      recommendations: [{ ...recommendation, title }],
    });
    const result = await service.processMessage('vong tay');
    const match = result.raw_response.match(/```json\n([\s\S]*?)\n```/);
    expect(JSON.parse(match![1])).toMatchObject({
      recommendations: [{ title }],
    });
    expect((result.raw_response.match(/```json/g) ?? []).length).toBe(1);
  });

  it('uses the same response and event types for the existing streaming consumer', async () => {
    const { service } = setup();
    const events: { type: string; content?: string }[] = [];
    for await (const chunk of service.processMessageStream(
      'vong tay',
      [],
      'en',
    ))
      events.push(
        JSON.parse(chunk.slice(6).trim()) as { type: string; content?: string },
      );
    expect(events.map((e: { type: string }) => e.type)).toEqual([
      'chunk',
      'done',
    ]);
    expect(events[0].content).toContain('These products match');
    expect(events[1]).toMatchObject({
      liveModelAvailable: false,
      source: 'catalog',
      finishReason: 'STOP',
    });
  });

  it('returns clear no-match/unavailable copy without fabricated products or raw errors', async () => {
    const { service, advise } = setup();
    advise.mockResolvedValue({
      source: 'catalog',
      searchEngine: 'bounded_keyword',
      recommendations: [],
    });
    expect(await service.processMessage('unknown item')).toMatchObject({
      status: 'no_match',
      recommendations: [],
    });
    advise.mockRejectedValue(new Error('RAW_SECRET_PROVIDER_ERROR'));
    const result = await service.processMessage('vong tay');
    expect(result).toMatchObject({
      status: 'unavailable',
      recommendations: [],
      liveModelAvailable: false,
    });
    expect(JSON.stringify(result)).not.toContain('RAW_SECRET');
  });

  it('asks for product context for a budget-only query and bounds long search terms', async () => {
    const { service, advise } = setup();
    expect(await service.processMessage('dưới 500k')).toMatchObject({
      status: 'no_match',
      recommendations: [],
    });
    expect(advise).not.toHaveBeenCalled();
    expect(catalogChatInput('x'.repeat(500), 'en').query).toHaveLength(120);
  });
});
