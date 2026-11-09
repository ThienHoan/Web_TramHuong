import {
  Controller,
  Get,
  Param,
  Query,
  Post,
  Body,
  Patch,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // Not cached here: the web app caches this and clears it when an admin changes the catalog.
  @Get()
  async findAll(
    @Query('locale') locale: string,
    @Query('include_inactive') include_inactive?: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('category_id') category_id?: string,
    @Query('sort') sort?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('stock_status') stock_status?: string,
    @Query('min_price') min_price?: string,
    @Query('max_price') max_price?: string,
  ) {
    const validLocale = locale === 'vi' ? 'vi' : 'en';
    return this.productsService.findAll(validLocale, {
      include_inactive: false,
      search,
      category,
      category_id,
      sort,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      stock_status,
      min_price: min_price ? Number(min_price) : undefined,
      max_price: max_price ? Number(max_price) : undefined,
    });
  }

  @Get('admin/list')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  async adminList(@Query() query: Record<string, string>) {
    return this.productsService.findAll(query.locale === 'vi' ? 'vi' : 'en', {
      include_inactive: query.include_inactive === 'true',
      search: query.search,
      category: query.category,
      sort: query.sort,
      page: Number(query.page || 1),
      limit: Math.min(Number(query.limit || 20), 500),
      stock_status: query.stock_status,
    });
  }

  @Get(':slug')
  async findOne(@Param('slug') slug: string, @Query('locale') locale: string) {
    const validLocale = locale === 'vi' ? 'vi' : 'en';
    return this.productsService.findOne(slug, validLocale);
  }

  @Get('admin/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  async findAdminOne(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  @UseInterceptors(
    FilesInterceptor('files', 5, {
      limits: { fileSize: 5 * 1024 * 1024, files: 5 },
    }),
  )
  async create(
    @Body() body: CreateProductDto,
    @UploadedFiles() files?: Array<Express.Multer.File>,
  ) {
    // Support both workflows:
    // 1. JSON with pre-uploaded images URLs (body.images)
    // 2. FormData with file uploads (files parameter)
    return this.productsService.create(body, files || []);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  @UseInterceptors(
    FilesInterceptor('files', 5, {
      limits: { fileSize: 5 * 1024 * 1024, files: 5 },
    }),
  )
  async update(
    @Param('id') id: string,
    @Body() body: UpdateProductDto,
    @UploadedFiles() files?: Array<Express.Multer.File>,
  ) {
    return this.productsService.update(id, body, files);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  async remove(@Param('id') id: string) {
    return this.productsService.softDelete(id);
  }

  @Patch('bulk/update')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  async bulkUpdate(
    @Body()
    body: {
      ids: string[];
      action: 'delete' | 'archive' | 'restore' | 'update_category';
      payload?: any;
    },
  ) {
    return this.productsService.bulkUpdate(body.ids, body.action, body.payload);
  }

  @Get('data/export')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  async exportData(
    @Query('locale') locale: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('stock_status') stock_status?: string,
    @Query('include_inactive') include_inactive?: string,
  ) {
    const validLocale = locale === 'vi' ? 'vi' : 'en';
    const csv = await this.productsService.exportProducts(validLocale, {
      search,
      category,
      stock_status,
      include_inactive: include_inactive === 'true',
    });
    return { csv };
  }
}
