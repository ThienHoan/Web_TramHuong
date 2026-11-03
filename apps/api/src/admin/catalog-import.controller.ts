import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Request,
  StreamableFile,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { Request as ExpressRequest } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '../auth/role.enum';
import { Roles } from '../auth/roles.decorator';
import { resourceType } from './catalog-import-format';
import { CatalogImportService } from './catalog-import.service';

function json(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    throw new BadRequestException('Dữ liệu nhập không hợp lệ');
  }
}
@Controller('admin/import')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class CatalogImportController {
  constructor(private readonly importer: CatalogImportService) {}
  @Get(':resource/template')
  @Header('Cache-Control', 'no-store')
  async template(@Param('resource') resource: string) {
    const type = resourceType(resource);
    return new StreamableFile(await this.importer.template(type), {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="thien-phuc-${type}.xlsx"`,
    });
  }
  @Post(':resource/preview')
  @UseInterceptors(
    FileInterceptor('workbook', {
      limits: {
        fileSize: 2 * 1024 * 1024,
        files: 1,
        fields: 3,
        fieldSize: 300000,
      },
    }),
  )
  async preview(
    @Param('resource') resource: string,
    @UploadedFile() workbook: Express.Multer.File,
    @Body('mode') mode: string,
    @Body('filenames') filenames: string,
  ) {
    if (!workbook || !workbook.originalname.toLowerCase().endsWith('.xlsx'))
      throw new BadRequestException('Chọn file Excel .xlsx');
    return this.importer.preview(
      resourceType(resource),
      workbook.buffer,
      mode || 'skip',
      json(filenames || '[]'),
    );
  }
  @Post(':resource/row')
  @Throttle({ default: { limit: 300, ttl: 60000 } })
  @UseInterceptors(
    FilesInterceptor('images', 5, {
      limits: {
        fileSize: 5 * 1024 * 1024,
        files: 5,
        fields: 4,
        fieldSize: 100000,
      },
    }),
  )
  async row(
    @Param('resource') resource: string,
    @Body('row') row: string,
    @Body('mode') mode: string,
    @Body('request_id') requestId: string,
    @UploadedFiles() images: Express.Multer.File[],
    @Request() request: ExpressRequest & { user: { id: string } },
  ) {
    return this.importer.commit(
      resourceType(resource),
      json(row),
      mode || 'skip',
      requestId,
      request.user.id,
      images || [],
    );
  }
}
