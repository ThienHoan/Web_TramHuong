import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { PostsService } from './posts.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('posts')
export class PostsController {
    constructor(private readonly postsService: PostsService) { }

    @Get()
    async findAll(
        @Query('page') page?: number,
        @Query('limit') limit?: number,
        @Query('category') category?: string,
        @Query('search') search?: string,
        @Query('status') status?: string,
    ) {
        return this.postsService.findAll({ page, limit, category, search, status });
    }

    @Get(':slug')
    async findOne(@Param('slug') slug: string) {
        return this.postsService.findOne(slug);
    }

    @Post()
    @UseGuards(AuthGuard)
    async create(@Body() body: any) {
        return this.postsService.create(body);
    }

    @Patch(':id')
    @UseGuards(AuthGuard)
    async update(@Param('id') id: string, @Body() body: any) {
        return this.postsService.update(id, body);
    }

    @Delete(':id')
    @UseGuards(AuthGuard)
    async delete(@Param('id') id: string) {
        return this.postsService.delete(id);
    }
}
