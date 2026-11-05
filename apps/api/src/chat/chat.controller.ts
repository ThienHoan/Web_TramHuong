import {
  Controller,
  Post,
  Body,
  Res,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';

// Validation constants
const MAX_MESSAGE_LENGTH = 500;
const MAX_HISTORY_LENGTH = 20;

// Helper to sanitize input
function sanitizeMessage(message: string): string {
  if (!message || typeof message !== 'string') return '';
  // Remove control characters except newlines
  // eslint-disable-next-line no-control-regex
  return message.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
}

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('message')
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute for chat
  async handleMessage(
    @Body()
    body: {
      message: string;
      history?: { role: string; content: string }[];
      locale?: 'vi' | 'en';
    },
  ) {
    // Sanitize and validate message
    const message = sanitizeMessage(body.message);
    if (!message) {
      throw new HttpException(
        'Tin nhắn không được để trống',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      throw new HttpException(
        `Tin nhắn quá dài(tối đa ${MAX_MESSAGE_LENGTH} ký tự)`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // Trim history to limit
    const history = Array.isArray(body.history)
      ? body.history.slice(-MAX_HISTORY_LENGTH)
      : [];

    if (body.locale !== undefined && !['vi', 'en'].includes(body.locale))
      throw new HttpException('Invalid locale', HttpStatus.BAD_REQUEST);
    return this.chatService.processMessage(
      message,
      history,
      body.locale ?? 'vi',
    );
  }

  @Post('stream')
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute for chat
  async handleStreamMessage(
    @Body()
    body: {
      message: string;
      history?: { role: string; content: string }[];
      locale?: 'vi' | 'en';
    },
    @Res() res: Response,
  ) {
    // Sanitize and validate message
    const message = sanitizeMessage(body.message);
    if (!message) {
      throw new HttpException(
        'Tin nhắn không được để trống',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      throw new HttpException(
        `Tin nhắn quá dài(tối đa ${MAX_MESSAGE_LENGTH} ký tự)`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // Trim history to limit
    const history = Array.isArray(body.history)
      ? body.history.slice(-MAX_HISTORY_LENGTH)
      : [];

    if (body.locale !== undefined && !['vi', 'en'].includes(body.locale))
      throw new HttpException('Invalid locale', HttpStatus.BAD_REQUEST);

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.flushHeaders();

    try {
      const streamGenerator = this.chatService.processMessageStream(
        message,
        history,
        body.locale ?? 'vi',
      );

      for await (const chunk of streamGenerator) {
        res.write(chunk);
      }
    } catch {
      res.write(
        `data: ${JSON.stringify({ type: 'error', content: 'Stream error' })} \n\n`,
      );
    } finally {
      res.end();
    }
  }
}
