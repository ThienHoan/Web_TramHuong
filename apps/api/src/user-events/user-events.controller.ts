import { Controller, Post, Body, Get, Query, Req, UseGuards } from '@nestjs/common';
import { UserEventsService } from './user-events.service';
import { CreateUserEventDto } from './dto/create-user-event.dto';
import { AuthGuard } from '../auth/auth.guard';
import { Request } from 'express';

@Controller('user-events')
export class UserEventsController {
    constructor(private readonly userEventsService: UserEventsService) { }

    @Post()
    async create(@Req() req: Request & { user?: { id: string } }, @Body() dto: CreateUserEventDto) {
        // AuthGuard might be optional here if we want to track guests
        // But usually we extract user from token if available. 
        // If not using AuthGuard globally, we can checking req.headers manually or use a specific Guard.
        // For now, let's assume if token is present, we get user.

        // Check for user from request (populated by AuthGuard/Middleware)
        // To support optional auth, we might need a custom decorator or check headers/middleware.
        // Assuming backend validates token if Authorization header is set.

        const userId = (req as any).user?.id || null;
        return this.userEventsService.create(userId, dto);
    }

    @Get('history')
    @UseGuards(AuthGuard)
    async getHistory(@Req() req: Request & { user: { id: string } }, @Query('limit') limit?: number) {
        return this.userEventsService.getHistory(req.user.id, limit ? Number(limit) : 50);
    }
}
