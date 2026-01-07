import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { CategoriesService } from './categories.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';

@Controller('categories')
export class CategoriesController {
    constructor(private readonly categoriesService: CategoriesService) { }

    @Get()
    @UseInterceptors(CacheInterceptor)
    @CacheTTL(300000) // 5 minutes cache for categories (rarely changes)
    async findAll(
        @Query('locale') locale: string,
        @Query('include_inactive') include_inactive?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string
    ) {
        const validLocale = locale === 'vi' ? 'vi' : 'en';
        return this.categoriesService.findAll(validLocale, {
            include_inactive: include_inactive === 'true',
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20
        });
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.categoriesService.findOne(id);
    }

    @Post()
    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.STAFF)
    async create(@Body() body: any) {
        return this.categoriesService.create(body);
    }

    @Patch(':id')
    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.STAFF)
    async update(@Param('id') id: string, @Body() body: any) {
        return this.categoriesService.update(id, body);
    }

    @Delete(':id')
    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.STAFF)
    async remove(@Param('id') id: string) {
        return this.categoriesService.delete(id);
    }
}
