import { StorageModule } from '../storage/storage.module';
import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { SupabaseModule } from '../supabase/supabase.module';
import { ConfigModule } from '@nestjs/config';
import { CatalogSearchRepository } from './catalog-search.repository';

@Module({
  imports: [SupabaseModule, StorageModule, ConfigModule],
  controllers: [ProductsController],
  providers: [ProductsService, CatalogSearchRepository],
  exports: [ProductsService, CatalogSearchRepository],
})
export class ProductsModule {}
