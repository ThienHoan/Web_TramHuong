import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { SupabaseService } from '../supabase/supabase.service';
import { StorageService } from '../storage/storage.service';
import {
  CatalogRow,
  catalogTemplate,
  TemplateCategory,
  fileKey,
  ImportResource,
  normalizeCatalogRow,
  parseCatalogWorkbook,
  uploadedFilename,
} from './catalog-import-format';
import { Json } from '../common/types/database.types';

type ImportResult = {
  id: string;
  slug: string;
  action: 'created' | 'updated' | 'skipped';
  replayed: boolean;
};
const configurationError = () =>
  new BadRequestException(
    'Chức năng nhập chưa được cấu hình trên database. Hãy áp dụng admin-catalog-import.sql.',
  );
@Injectable()
export class CatalogImportService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly storage: StorageService,
  ) {}
  private get db() {
    return this.supabase.getClient();
  }
  async template(resource: ImportResource): Promise<Buffer> {
    const categories: TemplateCategory[] = [];
    for (let offset = 0; ; offset += 500) {
      const result = await this.db
        .from('categories')
        .select(
          'slug,is_active,translations:category_translations(locale,name)',
        )
        .order('slug', { ascending: true })
        .range(offset, offset + 499)
        .returns<
          {
            slug: string;
            is_active: boolean;
            translations: { locale: string; name: string }[];
          }[]
        >();
      if (result.error)
        throw new BadRequestException(
          'Không thể tải danh mục từ website để tạo file mẫu. Hãy thử lại.',
        );
      for (const category of result.data || []) {
        categories.push({
          slug: category.slug,
          is_active: category.is_active,
          name:
            category.translations.find(
              (translation) => translation.locale === 'vi',
            )?.name ||
            category.translations[0]?.name ||
            category.slug,
        });
      }
      if ((result.data?.length || 0) < 500) break;
    }
    categories.sort(
      (a, b) =>
        Number(b.is_active) - Number(a.is_active) ||
        a.name.localeCompare(b.name, 'vi') ||
        a.slug.localeCompare(b.slug),
    );
    return catalogTemplate(resource, categories);
  }
  mode(value: string) {
    if (!['skip', 'update'].includes(value))
      throw new BadRequestException('Chọn bỏ qua hoặc cập nhật bản ghi trùng');
    return value as 'skip' | 'update';
  }
  async preview(
    resource: ImportResource,
    buffer: Buffer,
    mode: string,
    filenames: unknown,
  ) {
    this.mode(mode);
    if (
      !Array.isArray(filenames) ||
      filenames.length > 1000 ||
      filenames.some((name) => typeof name !== 'string' || name.length > 255)
    )
      throw new BadRequestException('Danh sách tên ảnh không hợp lệ');
    const names = filenames as string[];
    const unique = new Set(names.map(fileKey));
    if (unique.size !== names.length)
      throw new BadRequestException(
        'Có nhiều ảnh trùng tên. Hãy đổi tên trước khi nhập.',
      );
    const rows = await parseCatalogWorkbook(buffer, resource);
    const existing = await this.db
      .from(resource)
      .select('id,slug')
      .in(
        'slug',
        rows.map((row) => row.data.slug),
      );
    if (existing.error)
      throw new BadRequestException('Không thể kiểm tra bản ghi đã có');
    const slugs = new Set(existing.data.map((row) => row.slug));
    const categorySlugs = [
      ...new Set(
        rows
          .map((row) => row.data.category)
          .filter((value): value is string => !!value),
      ),
    ];
    const categories = categorySlugs.length
      ? await this.db
          .from('categories')
          .select('slug,is_active')
          .in('slug', categorySlugs)
      : { data: [], error: null };
    if (categories.error)
      throw new BadRequestException('Không thể kiểm tra danh mục');
    const categoryRows: { slug: string; is_active: boolean }[] =
      categories.data || [];
    const available = new Set(categoryRows.map((row) => row.slug));
    for (const row of rows) {
      if (slugs.has(row.data.slug))
        row.action = mode === 'skip' ? 'skip' : 'update';
      if (row.action === 'skip') {
        row.errors = [];
        row.warnings.push('Bản ghi đã có; sẽ bỏ qua');
        continue;
      }
      if (resource === 'products') {
        if (
          categoryRows.some(
            (category) =>
              category.slug === row.data.category && !category.is_active,
          )
        )
          row.warnings.push('Danh mục đang ẩn trên website');
        if (!available.has(row.data.category || ''))
          row.errors.push('Danh mục chưa tồn tại. Hãy nhập danh mục trước.');
        if (row.action === 'create' && !row.data.images.length)
          row.errors.push('Sản phẩm mới cần ít nhất một ảnh');
        if (row.action === 'update' && !row.data.images.length)
          row.warnings.push('Giữ nguyên ảnh hiện tại');
        for (const source of row.data.images) {
          if (!source.startsWith('https://') && !unique.has(fileKey(source)))
            row.errors.push(`Chưa chọn ảnh: ${source}`);
          if (source.includes('drive.google.com'))
            row.warnings.push(
              'Ảnh Drive cần quyền tải công khai; ảnh sẽ được kiểm tra khi nhập',
            );
        }
      }
    }
    const ready = await this.db.rpc('admin_import_catalog_row', {
      p_resource: '__configuration_probe__',
      p_row: {},
      p_mode: 'skip',
      p_request_id: '00000000-0000-0000-0000-000000000000',
      p_actor_id: '00000000-0000-0000-0000-000000000000',
      p_hash: 'a'.repeat(64),
    });
    const configured = ready.error?.code === '22023';
    return {
      rows,
      configured,
      configurationMessage: configured
        ? undefined
        : ready.error?.code === 'PGRST202'
          ? 'Cần áp dụng file SQL nhập danh mục trước khi xác nhận.'
          : 'Chưa xác minh được cấu hình nhập. Kiểm tra kết nối và thử xem trước lại.',
      summary: {
        total: rows.length,
        valid: rows.filter((row) => !row.errors.length && row.action !== 'skip')
          .length,
        invalid: rows.filter((row) => row.errors.length).length,
        skipped: rows.filter((row) => row.action === 'skip').length,
      },
    };
  }
  async commit(
    resource: ImportResource,
    raw: unknown,
    mode: string,
    requestId: string,
    actorId: string,
    files: Express.Multer.File[],
  ): Promise<ImportResult> {
    this.mode(mode);
    files = files.map((file) => ({
      ...file,
      originalname: uploadedFilename(file.originalname),
    }));
    if (
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
        requestId || '',
      )
    )
      throw new BadRequestException('Thiếu mã yêu cầu nhập');
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
      throw new BadRequestException('Dòng nhập không hợp lệ');
    const { data, errors } = normalizeCatalogRow(
      resource,
      raw as Record<string, unknown>,
    );
    if (errors.length) throw new BadRequestException(errors.join('; '));
    const attachments = new Map(
      files.map((file) => [fileKey(file.originalname), file]),
    );
    if (attachments.size !== files.length)
      throw new BadRequestException('Ảnh đính kèm bị trùng tên');
    for (const source of data.images)
      if (!source.startsWith('https://') && !attachments.has(fileKey(source)))
        throw new BadRequestException(`Thiếu file ảnh: ${source}`);
    const payloadHash = createHash('sha256')
      .update(
        JSON.stringify({
          resource,
          mode,
          data,
          assets: files
            .map((file) => ({
              name: fileKey(file.originalname),
              hash: createHash('sha256').update(file.buffer).digest('hex'),
            }))
            .sort((a, b) => a.name.localeCompare(b.name)),
        }),
      )
      .digest('hex');
    const receipt = await this.db
      .from('admin_catalog_imports')
      .select('actor_id,payload_hash,result')
      .eq('request_id', requestId)
      .maybeSingle();
    if (receipt.error) throw configurationError();
    if (receipt.data) {
      if (
        receipt.data.actor_id !== actorId ||
        receipt.data.payload_hash !== payloadHash
      )
        throw new BadRequestException(
          'Mã yêu cầu đã được dùng cho dữ liệu khác',
        );
      return {
        ...(receipt.data.result as unknown as ImportResult),
        replayed: true,
      };
    }
    const existing = await this.db
      .from(resource)
      .select('id')
      .eq('slug', data.slug)
      .maybeSingle();
    if (existing.error)
      throw new BadRequestException('Không thể kiểm tra slug');
    if (resource === 'products' && !(existing.data && mode === 'skip')) {
      const category = await this.db
        .from('categories')
        .select('id')
        .eq('slug', data.category || '')
        .maybeSingle();
      if (category.error || !category.data)
        throw new BadRequestException('Danh mục không tồn tại');
      if (!existing.data && !data.images.length)
        throw new BadRequestException('Sản phẩm mới cần ít nhất một ảnh');
    }
    const uploaded: { url: string; path: string; reused?: boolean }[] = [];
    let cleanup = true;
    try {
      if (resource === 'products' && !(existing.data && mode === 'skip')) {
        for (const source of data.images) {
          const image = source.startsWith('https://')
            ? await this.storage.importRemoteImage(source)
            : await this.storage.uploadProductImage(
                attachments.get(fileKey(source))!,
              );
          uploaded.push(image);
        }
      }
      const payload: CatalogRow = {
        ...data,
        images: uploaded.map((image) => image.url),
      };
      cleanup = false; // A transport failure may occur after commit: preserve images until the receipt can be checked.
      const { data: result, error } = await this.db.rpc(
        'admin_import_catalog_row',
        {
          p_resource: resource,
          p_row: payload as unknown as Json,
          p_mode: mode,
          p_request_id: requestId,
          p_actor_id: actorId,
          p_hash: payloadHash,
        },
      );
      if (error) {
        if (/^(PGRST|22|23|40)/.test(error.code || '')) cleanup = true;
        if (error.code === 'PGRST202') throw configurationError();
        throw new BadRequestException(
          'Không thể lưu dòng nhập: ' + error.message,
        );
      }
      const outcome = result as unknown as ImportResult;
      cleanup = outcome.action === 'skipped' || outcome.replayed;
      return outcome;
    } finally {
      if (cleanup)
        for (const image of uploaded.filter((image) => !image.reused))
          await this.storage
            .deleteProductImage(image.path)
            .catch(() => undefined);
    }
  }
}
