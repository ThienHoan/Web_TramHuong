import { Controller, Post, Body, Req, Res, HttpException, HttpStatus } from '@nestjs/common';
import { ChatService } from './chat.service';
import type { Response } from 'express';

@Controller('chat')
export class ChatController {
    constructor(private readonly chatService: ChatService) { }

    @Post('message')
    async handleMessage(@Body() body: { message: string; history?: any[] }, @Req() req: any) {
        // Basic Rate Limiting check could go here or via Guard
        if (!body.message) {
            throw new HttpException('Message cannot be empty', HttpStatus.BAD_REQUEST);
        }
        return this.chatService.processMessage(body.message, body.history || []);
    }

    @Post('stream')
    async handleStreamMessage(
        @Body() body: { message: string; history?: any[] },
        @Res() res: Response,
    ) {
        if (!body.message) {
            throw new HttpException('Message cannot be empty', HttpStatus.BAD_REQUEST);
        }

        // Set SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
        res.flushHeaders();

        try {
            const streamGenerator = this.chatService.processMessageStream(
                body.message,
                body.history || []
            );

            for await (const chunk of streamGenerator) {
                res.write(chunk);
            }
        } catch (error) {
            res.write(`data: ${JSON.stringify({ type: 'error', content: 'Stream error' })}\n\n`);
        } finally {
            res.end();
        }
    }
}
