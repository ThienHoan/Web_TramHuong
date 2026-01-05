import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ProductsService } from '../products/products.service';

@Injectable()
export class ChatService {
    private readonly logger = new Logger(ChatService.name);
    private genAI: GoogleGenerativeAI;
    private model: any;

    // Simple in-memory cache for product context
    private productContextCache: { data: string; timestamp: number } | null = null;
    private readonly CACHE_TTL = 60 * 1000; // 60 seconds
    private readonly MAX_PRODUCTS_IN_CONTEXT = 20; // Limit products to save tokens

    constructor(
        private configService: ConfigService,
        private productsService: ProductsService,
    ) {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');
        if (apiKey) {
            this.genAI = new GoogleGenerativeAI(apiKey);
            this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
        } else {
            this.logger.warn('GEMINI_API_KEY not found');
        }
    }

    async getProductContext(): Promise<string> {
        const now = Date.now();
        if (this.productContextCache && (now - this.productContextCache.timestamp < this.CACHE_TTL)) {
            return this.productContextCache.data;
        }

        const products = await this.productsService.getProductsForAI();

        // Limit to MAX_PRODUCTS_IN_CONTEXT to save token budget for output
        const limitedProducts = products.slice(0, this.MAX_PRODUCTS_IN_CONTEXT);

        // Format as simplified text
        const textContext = limitedProducts.map(p => {
            return `ID: ${p.id} | ${p.title} | ${p.price} VND | /${p.slug}`;
        }).join('\n');

        this.productContextCache = { data: textContext, timestamp: now };
        return textContext;
    }

    async processMessage(userMessage: string, history: any[]) {
        if (!this.model) {
            return { text: "Xin lỗi, hệ thống tư vấn đang bảo trì. Vui lòng thử lại sau.", recommendations: [] };
        }

        try {
            const context = await this.getProductContext();

            const systemPrompt = `Bạn là chuyên gia tư vấn Trầm Hương Thiên Phúc. Phong cách: lịch sự, hiểu biết, Zen. Ngôn ngữ: Tiếng Việt.

SẢN PHẨM HIỆN CÓ:
${context}

QUY TẮC:
1. CHỈ gợi ý sản phẩm trong danh sách trên.
2. Nếu khách hỏi chung chung, hỏi lại MỤC ĐÍCH (xông nhà/quà tặng) hoặc NGÂN SÁCH.
3. Khi gợi ý cụ thể, kèm JSON block:
\`\`\`json
{"recommendations":[{"id":"...","slug":"...","title":"...","price":0,"reason":"lý do ngắn"}]}
\`\`\`
4. Từ chối câu hỏi ngoài chủ đề lịch sự.
`;

            const chat = this.model.startChat({
                history: history.map(h => ({
                    role: h.role === 'user' ? 'user' : 'model',
                    parts: [{ text: h.content }]
                })),
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 4096, // Increased to 4096 to prevent truncation
                },
                systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] }
            });

            const result = await chat.sendMessage(userMessage);
            const response = await result.response;
            const text = response.text();

            // Log finish reason for monitoring truncation
            const finishReason = response.candidates?.[0]?.finishReason;
            const promptTokens = response.usageMetadata?.promptTokenCount || 0;
            const outputTokens = response.usageMetadata?.candidatesTokenCount || 0;

            if (finishReason === 'MAX_TOKENS') {
                this.logger.warn(`⚠️ Response truncated! Finish: ${finishReason}, Prompt: ${promptTokens}, Output: ${outputTokens}`);
            } else {
                this.logger.log(`✅ Gemini response. Finish: ${finishReason}, Prompt: ${promptTokens}, Output: ${outputTokens}`);
            }

            return {
                raw_response: text,
            };

        } catch (e) {
            this.logger.error('Gemini API Error', e);
            return { text: "Xin lỗi, tôi đang gặp chút khó khăn khi kết nối. Bạn chờ một lát nhé." };
        }
    }

    /**
     * Streaming version of processMessage using sendMessageStream()
     * Yields SSE-formatted events for each chunk
     */
    async *processMessageStream(userMessage: string, history: any[]): AsyncGenerator<string> {
        if (!this.model) {
            yield `data: ${JSON.stringify({ type: 'error', content: 'Hệ thống tư vấn đang bảo trì.' })}\n\n`;
            return;
        }

        try {
            const context = await this.getProductContext();

            const systemPrompt = `Bạn là chuyên gia tư vấn Trầm Hương Thiên Phúc. Phong cách: lịch sự, hiểu biết, Zen. Ngôn ngữ: Tiếng Việt.

SẢN PHẨM HIỆN CÓ:
${context}

QUY TẮC:
1. CHỈ gợi ý sản phẩm trong danh sách trên.
2. Nếu khách hỏi chung chung, hỏi lại MỤC ĐÍCH (xông nhà/quà tặng) hoặc NGÂN SÁCH.
3. Khi gợi ý cụ thể, kèm JSON block:
\`\`\`json
{"recommendations":[{"id":"...","slug":"...","title":"...","price":0,"reason":"lý do ngắn"}]}
\`\`\`
4. Từ chối câu hỏi ngoài chủ đề lịch sự.
`;

            const chat = this.model.startChat({
                history: history.map(h => ({
                    role: h.role === 'user' ? 'user' : 'model',
                    parts: [{ text: h.content }]
                })),
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 4096,
                },
                systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] }
            });

            this.logger.log('🚀 Starting stream...');
            const result = await chat.sendMessageStream(userMessage);

            let totalChunks = 0;
            for await (const chunk of result.stream) {
                const chunkText = chunk.text();
                if (chunkText) {
                    totalChunks++;
                    yield `data: ${JSON.stringify({ type: 'chunk', content: chunkText })}\n\n`;
                }
            }

            // Get final response for metadata
            const response = await result.response;
            const finishReason = response.candidates?.[0]?.finishReason;
            const promptTokens = response.usageMetadata?.promptTokenCount || 0;
            const outputTokens = response.usageMetadata?.candidatesTokenCount || 0;

            this.logger.log(`✅ Stream complete. Chunks: ${totalChunks}, Finish: ${finishReason}, Prompt: ${promptTokens}, Output: ${outputTokens}`);

            // Send warning if truncated
            if (finishReason === 'MAX_TOKENS') {
                this.logger.warn(`⚠️ Stream truncated!`);
                yield `data: ${JSON.stringify({ type: 'warning', content: 'Câu trả lời có thể bị rút gọn do giới hạn độ dài.' })}\n\n`;
            }

            // Send done event
            yield `data: ${JSON.stringify({ type: 'done', finishReason })}\n\n`;

        } catch (e) {
            this.logger.error('Gemini Stream Error', e);
            yield `data: ${JSON.stringify({ type: 'error', content: 'Xin lỗi, có lỗi xảy ra khi kết nối.' })}\n\n`;
        }
    }
}
