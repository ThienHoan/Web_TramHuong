import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { CatalogImportController } from './catalog-import.controller';
import { CatalogImportService } from './catalog-import.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [AdminController, CatalogImportController],
  providers: [AdminService, CatalogImportService],
})
export class AdminModule {}
