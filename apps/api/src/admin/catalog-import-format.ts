import { BadRequestException } from '@nestjs/common';
import { Workbook, CellValue } from 'exceljs';
import { publicImageUrl } from '../storage/remote-image';

export type ImportResource = 'products' | 'categories';
export interface TemplateCategory {
  slug: string;
  name: string;
  is_active: boolean;
}
export const categoryChoice = (category: TemplateCategory) =>
  `${category.name}${category.is_active ? '' : ' (đang ẩn)'} [${category.slug}]`;
export const categorySlug = (value: string) =>
  value.trim().match(/\[([a-z0-9]+(?:[-_][a-z0-9]+)*)\]$/i)?.[1] ||
  value.trim();
export interface CatalogRow {
  slug: string;
  name: string;
  name_en?: string;
  description?: string;
  description_en?: string;
  category?: string;
  price?: number;
  quantity?: number;
  images: string[];
}
export interface ImportRow {
  row: number;
  data: CatalogRow;
  errors: string[];
  warnings: string[];
  action: 'create' | 'update' | 'skip';
}
export const MAX_IMPORT_ROWS = 200;
// Browsers send UTF-8 multipart filenames; Busboy may decode the header as Latin-1.
export const uploadedFilename = (name: string): string => {
  if ([...name].every((character) => character.charCodeAt(0) <= 255)) {
    const decoded = Buffer.from(name, 'latin1').toString('utf8');
    if (!decoded.includes('\uFFFD')) return decoded;
  }
  return name;
};
export const fileKey = (name: string) => name.normalize('NFC').toLowerCase();
export const slugify = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
export function resourceType(value: string): ImportResource {
  if (value !== 'products' && value !== 'categories')
    throw new BadRequestException('Chỉ nhập sản phẩm hoặc danh mục');
  return value;
}

export const COLUMNS = {
  products: [
    'slug',
    'ten_san_pham',
    'danh_muc_slug',
    'gia',
    'so_luong',
    'mo_ta',
    'anh_1',
    'anh_2',
    'anh_3',
    'anh_4',
    'anh_5',
    'ten_tieng_anh',
    'mo_ta_tieng_anh',
  ],
  categories: [
    'slug',
    'ten_danh_muc',
    'mo_ta',
    'ten_tieng_anh',
    'mo_ta_tieng_anh',
  ],
};

// Bound XLSX expansion before ExcelJS decompresses it. Macros/ZIP64 are not accepted.
export function checkWorkbookSize(buffer: Buffer) {
  if (buffer.length > 2 * 1024 * 1024)
    throw new BadRequestException('File Excel tối đa 2 MB');
  let end = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i--)
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      end = i;
      break;
    }
  if (end < 0)
    throw new BadRequestException('Hãy dùng file Excel .xlsx hợp lệ');
  const entries = buffer.readUInt16LE(end + 10);
  let cursor = buffer.readUInt32LE(end + 16);
  let total = 0;
  if (
    entries > 2000 ||
    buffer.readUInt16LE(end + 4) !== 0 ||
    buffer.readUInt16LE(end + 6) !== 0
  )
    throw new BadRequestException('File Excel quá phức tạp');
  for (let i = 0; i < entries; i++) {
    if (
      cursor + 46 > buffer.length ||
      buffer.readUInt32LE(cursor) !== 0x02014b50
    )
      throw new BadRequestException('Cấu trúc Excel không hợp lệ');
    total += buffer.readUInt32LE(cursor + 24);
    const length = buffer.readUInt16LE(cursor + 28);
    const extra = buffer.readUInt16LE(cursor + 30);
    const comment = buffer.readUInt16LE(cursor + 32);
    const name = buffer
      .subarray(cursor + 46, cursor + 46 + length)
      .toString('utf8');
    if (total > 20 * 1024 * 1024 || /vbaProject\.bin$/i.test(name))
      throw new BadRequestException('File Excel quá lớn hoặc chứa macro');
    cursor += 46 + length + extra + comment;
  }
}
function cellText(value: CellValue, image = false): string {
  if (value == null) return '';
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  )
    return String(value).trim();
  if (typeof value === 'object' && 'formula' in value)
    throw new Error('Ô có công thức: hãy sao chép và dán dưới dạng giá trị');
  if (typeof value === 'object' && 'sharedFormula' in value)
    throw new Error('Hãy thay công thức bằng giá trị');
  if (typeof value === 'object' && 'hyperlink' in value)
    return image ? String(value.hyperlink) : String(value.text);
  if (typeof value === 'object' && 'richText' in value)
    return value.richText
      .map((part) => part.text)
      .join('')
      .trim();
  throw new Error('Ô dữ liệu không đúng định dạng');
}
export function normalizeCatalogRow(
  resource: ImportResource,
  input: Record<string, unknown>,
): { data: CatalogRow; errors: string[] } {
  const errors: string[] = [];
  const string = (key: string, max = 10000) => {
    const value = input[key];
    if (
      value != null &&
      typeof value !== 'string' &&
      typeof value !== 'number'
    ) {
      errors.push(`${key}: dữ liệu không hợp lệ`);
      return '';
    }
    const text = value == null ? '' : String(value).trim();
    if (text.length > max) errors.push(`${key}: vượt quá ${max} ký tự`);
    return text;
  };
  const name = string('name', 200);
  const slug = (string('slug', 120) || slugify(name)).toLowerCase();
  if (!name) errors.push('Thiếu tên');
  if (!/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(slug) || slug.length > 120)
    errors.push('Slug chỉ gồm chữ thường không dấu, số, dấu - hoặc _');
  const data: CatalogRow = { slug, name, images: [] };
  for (const key of ['name_en', 'description', 'description_en'] as const) {
    const value = string(key, key === 'name_en' ? 200 : 10000);
    if (value) data[key] = value;
  }
  if (resource === 'products') {
    data.category = categorySlug(string('category', 400)).toLowerCase();
    if (data.category.length > 120)
      errors.push('Mã danh mục vượt quá 120 ký tự');
    if (!data.category) errors.push('Thiếu danh mục');
    for (const key of ['price', 'quantity'] as const) {
      const raw = string(key, 30);
      const value = Number(raw);
      if (
        !/^\d+(?:\.\d{1,2})?$/.test(raw) ||
        !Number.isFinite(value) ||
        value < 0 ||
        value > 1e12 ||
        (key === 'quantity' && (!Number.isSafeInteger(value) || value > 1e6))
      )
        errors.push(
          `${key === 'price' ? 'Giá' : 'Số lượng'} không hợp lệ; nhập số không có dấu phân cách hàng nghìn`,
        );
      else data[key] = value;
    }
    if (input.images !== undefined && !Array.isArray(input.images))
      errors.push('Danh sách ảnh không hợp lệ');
    const images = Array.isArray(input.images) ? input.images : [];
    if (images.length > 5) errors.push('Tối đa 5 ảnh cho một sản phẩm');
    for (const image of images.slice(0, 5)) {
      if (typeof image !== 'string' || image.length > 2048) {
        errors.push('Ảnh không hợp lệ');
        continue;
      }
      const source = image.trim();
      if (!source) continue;
      if (/^https?:/i.test(source)) {
        try {
          publicImageUrl(source);
        } catch (error) {
          errors.push(
            error instanceof Error ? error.message : 'Link ảnh không hợp lệ',
          );
        }
      } else if (/[\\/:]/.test(source) || source.length > 255)
        errors.push(
          'Với ảnh trên máy, chỉ điền tên file và chọn file đó ở bước tải ảnh',
        );
      data.images.push(source);
    }
    data.images = [...new Set(data.images)];
  }
  return { data, errors };
}

export async function parseCatalogWorkbook(
  buffer: Buffer,
  resource: ImportResource,
): Promise<ImportRow[]> {
  checkWorkbookSize(buffer);
  const workbook = new Workbook();
  try {
    await workbook.xlsx.load(
      buffer as unknown as Parameters<typeof workbook.xlsx.load>[0],
      { ignoreNodes: ['drawing', 'picture', 'extLst'] },
    );
  } catch {
    throw new BadRequestException(
      'Không đọc được file. Hãy lưu lại dưới dạng .xlsx, không đặt mật khẩu.',
    );
  }
  const sheet =
    workbook.getWorksheet(resource === 'products' ? 'San pham' : 'Danh muc') ||
    workbook.worksheets[0];
  if (!sheet || sheet.rowCount < 2)
    throw new BadRequestException('File chưa có dữ liệu');
  if (sheet.rowCount > MAX_IMPORT_ROWS + 1 || sheet.columnCount > 30)
    throw new BadRequestException(
      `Tối đa ${MAX_IMPORT_ROWS} dòng và 30 cột mỗi lần nhập`,
    );
  const columns = new Map<number, string>();
  const seenHeaders = new Set<string>();
  sheet.getRow(1).eachCell((cell, column) => {
    const header = slugify(cellText(cell.value)).replace(/-/g, '_');
    if (!header) return;
    if (!COLUMNS[resource].includes(header))
      throw new BadRequestException(
        `Cột không được hỗ trợ: ${header}. Hãy dùng file mẫu.`,
      );
    if (seenHeaders.has(header))
      throw new BadRequestException(`Cột bị trùng: ${header}`);
    seenHeaders.add(header);
    columns.set(column, header);
  });
  const required =
    resource === 'products'
      ? ['ten_san_pham', 'danh_muc_slug', 'gia', 'so_luong']
      : ['ten_danh_muc'];
  for (const header of required)
    if (!seenHeaders.has(header))
      throw new BadRequestException(`Thiếu cột ${header}`);
  const rows: ImportRow[] = [];
  const seen = new Set<string>();
  for (let number = 2; number <= sheet.rowCount; number++) {
    const raw: Record<string, string> = {};
    const cellErrors: string[] = [];
    let populated = false;
    columns.forEach((key, column) => {
      const cell = sheet.getCell(number, column);
      if (cell.value != null && cell.value !== '') populated = true;
      try {
        raw[key] = cellText(cell.value, key.startsWith('anh_'));
      } catch (error) {
        cellErrors.push(
          error instanceof Error ? error.message : 'Ô không hợp lệ',
        );
      }
    });
    if (!populated) continue;
    const normalized = normalizeCatalogRow(resource, {
      slug: raw.slug,
      name: raw.ten_san_pham || raw.ten_danh_muc,
      name_en: raw.ten_tieng_anh,
      description: raw.mo_ta,
      description_en: raw.mo_ta_tieng_anh,
      category: raw.danh_muc_slug,
      price: raw.gia,
      quantity: raw.so_luong,
      images: [1, 2, 3, 4, 5]
        .map((index) => raw[`anh_${index}`])
        .filter(Boolean),
    });
    const errors = [...cellErrors, ...normalized.errors];
    if (seen.has(normalized.data.slug)) errors.push('Slug bị trùng trong file');
    seen.add(normalized.data.slug);
    rows.push({
      row: number,
      data: normalized.data,
      errors,
      warnings: [],
      action: 'create',
    });
  }
  if (!rows.length)
    throw new BadRequestException('Không có dòng dữ liệu để nhập');
  return rows;
}

export async function catalogTemplate(
  resource: ImportResource,
  categories: TemplateCategory[] = [],
): Promise<Buffer> {
  const workbook = new Workbook();
  workbook.creator = 'Thiên Phúc';
  const sheet = workbook.addWorksheet(
    resource === 'products' ? 'San pham' : 'Danh muc',
    { views: [{ state: 'frozen', ySplit: 1 }] },
  );
  const headers = COLUMNS[resource];
  sheet.addRow(headers);
  sheet.addRow(
    resource === 'products'
      ? [
          '',
          'Vòng trầm 8 mm',
          categories[0] ? categoryChoice(categories[0]) : '',
          850000,
          20,
          'Mô tả sản phẩm',
          'vong-8mm.jpg',
          '',
          '',
          '',
          '',
          'Agarwood bracelet 8 mm',
          '',
        ]
      : [
          '',
          'Danh mục mẫu mới',
          'Thay dòng mẫu bằng danh mục bạn muốn thêm',
          'New sample category',
          '',
        ],
  );
  sheet.getRow(1).height = 30;
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF29392F' },
  };
  headers.forEach((header, index) => {
    sheet.getColumn(index + 1).width = header.startsWith('anh_')
      ? 34
      : header.includes('mo_ta')
        ? 42
        : 24;
  });
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: headers.length },
  };
  if (resource === 'products') {
    sheet.getColumn(3).width = 48;
    sheet.getColumn(4).numFmt = '#,##0.00';
    sheet.getColumn(5).numFmt = '0';
  }
  const reference = workbook.addWorksheet('Danh muc hien co', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  reference.addRow([
    'Tên danh mục',
    'Slug',
    'Trạng thái',
    'Lựa chọn trong Excel',
  ]);
  categories.forEach((category) =>
    reference.addRow([
      category.name,
      category.slug,
      category.is_active ? 'Đang hiển thị' : 'Đang ẩn',
      categoryChoice(category),
    ]),
  );
  reference.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  reference.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF29392F' },
  };
  reference.getRow(1).height = 28;
  [36, 30, 22, 65].forEach((width, index) => {
    reference.getColumn(index + 1).width = width;
  });
  if (!categories.length) {
    reference.addRow([
      'Chưa có danh mục trên website. Hãy thêm danh mục rồi tải lại mẫu.',
    ]);
  }
  sheet.getCell('A1').note =
    'Tạo mới: có thể để trống slug để tự tạo từ tên. Cập nhật: giữ đúng slug đang có để nhận diện bản ghi.';
  if (resource === 'products') {
    sheet.getCell('C1').note =
      'Chọn danh mục đang có trên website bằng danh sách thả xuống. Hệ thống lấy slug trong dấu [ ]. Tải lại mẫu sau khi thêm hoặc đổi danh mục.';
    if (categories.length) {
      workbook.definedNames.add(
        `'Danh muc hien co'!$D$2:$D$${categories.length + 1}`,
        'DanhMucHienCo',
      );
      for (let row = 2; row <= MAX_IMPORT_ROWS + 1; row++) {
        sheet.getCell(row, 3).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: ['DanhMucHienCo'],
          showErrorMessage: true,
          errorStyle: 'stop',
          errorTitle: 'Chọn danh mục trên website',
          error:
            'Hãy chọn một danh mục trong danh sách; tải lại mẫu nếu danh mục vừa thay đổi.',
          showInputMessage: true,
          promptTitle: 'Danh mục hiện có',
          prompt: 'Chọn theo tên; mã trong [ ] được dùng khi nhập.',
        };
      }
    }
  }
  const guide = workbook.addWorksheet('Huong dan');
  guide.getColumn(1).width = 115;
  [
    'THIÊN PHÚC — HƯỚNG DẪN NHẬP EXCEL',
    'Xóa hoặc thay dòng ví dụ trước khi nhập dữ liệu thật. Mỗi dòng là một sản phẩm hoặc danh mục.',
    'Tối đa 200 dòng mỗi lần. Không dùng công thức: hãy dán dưới dạng giá trị.',
    'Giữ nguyên tên cột. Khi tạo mới, để trống slug để hệ thống tạo từ tên; khi cập nhật, giữ đúng slug cũ.',
    'Giá bằng VND; nhập số 850000, không nhập chuỗi 850.000 hoặc 850,000.',
    'Cột danh_muc_slug có danh sách chọn Tên danh mục [slug] lấy từ website lúc tải mẫu; không cần gõ mã bằng tay.',
    'Xem sheet Danh muc hien co để tra tên, mã và trạng thái. Sau khi thay đổi danh mục trên web, hãy tải lại mẫu.',
    'Nếu website chưa có danh mục, hãy thêm hoặc nhập danh mục trước rồi tải lại mẫu sản phẩm.',
    'anh_1 đến anh_5: tên file đã chọn trong admin hoặc link HTTPS công khai.',
    'Ví dụ: vong-8mm.jpg. Chọn file tương ứng; mỗi ảnh tối đa 5 MB, JPEG/PNG/WebP/AVIF.',
    'Google Drive: dùng link từng ảnh có quyền tải. Link riêng tư cần tải file lên trực tiếp.',
    'Bỏ qua bản ghi trùng là mặc định. Chọn cập nhật sẽ cập nhật tên, giá, số lượng, danh mục.',
    'Khi cập nhật, ảnh và mô tả để trống sẽ giữ dữ liệu cũ. File không sửa biến thể, SEO hoặc các trường khác.',
    'Xem trước không ghi dữ liệu. Chỉ bấm xác nhận nhập sau khi kiểm tra lỗi từng dòng.',
  ].forEach((line, index) => {
    guide.addRow([line]);
    guide.getRow(index + 1).alignment = { wrapText: true, vertical: 'middle' };
    guide.getRow(index + 1).height = index ? 38 : 28;
  });
  guide.getRow(1).font = { bold: true, size: 14, color: { argb: 'FF29392F' } };
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
