import { Injectable } from '@nestjs/common';
import { CatalogAdvisorService } from './catalog-advisor.service';

export function catalogChatInput(message: string, locale: 'vi' | 'en') {
  let query = message
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/g, 'd');
  const budget = query.match(
    /\b(?:duoi|toi da|under|up to)\s*(\d+(?:[.,]\d+)*)\s*(trieu|million|nghin|ngan|vnd|dong|k)?\b/,
  );
  let maxPrice: number | undefined;
  if (budget) {
    const unit = budget[2] ?? '';
    const numeric =
      ['', 'vnd', 'dong'].includes(unit) &&
      /^\d{1,3}(?:[.,]\d{3})+$/.test(budget[1])
        ? budget[1].replace(/[.,]/g, '')
        : budget[1].replace(',', '.');
    const multiplier = ['trieu', 'million'].includes(unit)
      ? 1000000
      : ['k', 'ngan', 'nghin'].includes(unit)
        ? 1000
        : 1;
    const amount = Number(numeric) * multiplier;
    if (Number.isSafeInteger(amount) && amount >= 0 && amount <= 1e12) {
      maxPrice = amount;
      query = query
        .replace(budget[0], ' ')
        .replace(/\b(?:gia|price|budget)\b/g, ' ');
    }
  }
  return {
    query: query.replace(/\s+/g, ' ').trim().slice(0, 120),
    locale,
    ...(maxPrice !== undefined ? { maxPrice } : {}),
  };
}

const escapeMarkdown = (value: string) =>
  value.replace(/[\\`*_{}[\]()#+.!|<>]/g, '\\$&');

@Injectable()
export class ChatService {
  constructor(private readonly advisor: CatalogAdvisorService) {}

  async processMessage(
    message: string,
    _history: unknown[] = [],
    locale: 'vi' | 'en' = 'vi',
  ) {
    // Retain the old argument for API compatibility; it is never sent to a model.
    void _history;
    const en = locale === 'en';
    const t = (vi: string, english: string) => (en ? english : vi);
    const input = catalogChatInput(message, locale);
    let text = t(
      'Bạn muốn tìm sản phẩm nào? Hãy cho mình tên sản phẩm và mức giá tối đa nếu có.',
      'Which product are you looking for? Share its name and an optional maximum price.',
    );
    let recommendations: {
      id: string;
      slug: string;
      title: string;
      price: number;
      reason: string;
    }[] = [];
    let source = 'catalog',
      searchEngine: string | null = null,
      liveModelAvailable = false;
    let status: 'matches' | 'no_match' | 'unavailable' = 'no_match';
    if (input.query.length >= 2) {
      try {
        const result = await this.advisor.advise(input);
        source = result.source;
        searchEngine = result.searchEngine;
        liveModelAvailable = result.liveModelAvailable === true;
        recommendations = result.recommendations.map((p) => ({
          id: p.id,
          slug: p.slug,
          title: p.title,
          price: p.price,
          reason: t(
            'Giá và tồn kho lấy từ danh mục tại thời điểm tra cứu.',
            'Price and stock come from the current catalog.',
          ),
        }));
        status = recommendations.length ? 'matches' : 'no_match';
        text = recommendations.length
          ? t(
              'Mình tìm thấy các sản phẩm sau trong danh mục:',
              'These products match the current catalog:',
            ) +
            '\n\n' +
            recommendations
              .map(
                (p) =>
                  `- ${escapeMarkdown(p.title)}: ${p.price.toLocaleString(en ? 'en-US' : 'vi-VN')} VND`,
              )
              .join('\n') +
            '\n\n' +
            t(
              'Giá và tồn kho được kiểm tra lại khi đặt hàng.',
              'Price and stock are checked again at checkout.',
            )
          : t(
              'Chưa tìm thấy sản phẩm phù hợp trong danh mục được tra cứu. Bạn thử tên sản phẩm ngắn hơn hoặc đổi mức giá nhé.',
              'No matching product was found in the searched catalog. Try a shorter product name or a different budget.',
            );
      } catch {
        status = 'unavailable';
        text = t(
          'Hiện chưa đọc được danh mục sản phẩm. Bạn vui lòng thử lại sau hoặc liên hệ cửa hàng.',
          'The product catalog is temporarily unavailable. Please retry later or contact the store.',
        );
      }
    }
    const json = JSON.stringify({ recommendations })
      .replace(/`/g, '\\u0060')
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e');
    const response = recommendations.length
      ? `${text}\n\n\`\`\`json\n${json}\n\`\`\``
      : text;
    return {
      response,
      raw_response: response,
      text,
      recommendations,
      source,
      status,
      searchEngine,
      liveModelAvailable,
    };
  }

  async *processMessageStream(
    message: string,
    history: unknown[] = [],
    locale: 'vi' | 'en' = 'vi',
  ): AsyncGenerator<string> {
    const result = await this.processMessage(message, history, locale);
    yield `data: ${JSON.stringify({ type: 'chunk', content: result.raw_response })}\n\n`;
    yield `data: ${JSON.stringify({ type: 'done', finishReason: 'STOP', source: result.source, searchEngine: result.searchEngine, liveModelAvailable: result.liveModelAvailable === true })}\n\n`;
  }
}
