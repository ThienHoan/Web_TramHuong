import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { PostsService } from './posts.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import { CreatePostDto, UpdatePostDto } from './dto/post.dto';

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
    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.STAFF)
    @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
    async create(@Body() body: CreatePostDto) {
        return this.postsService.create(body);
    }

    @Patch(':id')
    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.STAFF)
    @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
    async update(@Param('id') id: string, @Body() body: UpdatePostDto) {
        return this.postsService.update(id, body);
    }

    @Delete(':id')
    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.STAFF)
    async delete(@Param('id') id: string) {
        return this.postsService.delete(id);
    }
}


