import { Controller, Post, Body, Get, Query, Req, UseGuards } from '@nestjs/common';
import { UserEventsService } from './user-events.service';
import { CreateUserEventDto } from './dto/create-user-event.dto';
import { AuthGuard } from '../auth/auth.guard';
import { OptionalAuthGuard } from '../auth/optional-auth.guard';
import { Request } from 'express';

@Controller('user-events')
export class UserEventsController {
    constructor(private readonly userEventsService: UserEventsService) { }

    @Post()
    @UseGuards(OptionalAuthGuard) // Extract user if token present, allow guests
    async create(@Req() req: Request & { user?: { id: string } }, @Body() dto: CreateUserEventDto) {
        // OptionalAuthGuard populates req.user if valid token is present
        const userId = req.user?.id || null;
        return this.userEventsService.create(userId, dto);
    }

    @Get('history')
    @UseGuards(AuthGuard)
    async getHistory(@Req() req: Request & { user: { id: string } }, @Query('limit') limit?: number) {
        return this.userEventsService.getHistory(req.user.id, limit ? Number(limit) : 50);
    }
}
