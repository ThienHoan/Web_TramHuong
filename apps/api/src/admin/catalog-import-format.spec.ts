import { Workbook } from 'exceljs';
import {
  catalogTemplate,
  checkWorkbookSize,
  normalizeCatalogRow,
  parseCatalogWorkbook,
  uploadedFilename,
} from './catalog-import-format';

describe('catalog Excel import', () => {
  it('stores live category choices in a named range for all 200 product rows', async () => {
    const buffer = await catalogTemplate('products', [
      { slug: 'vong-tram', name: 'Vòng trầm', is_active: true },
      { slug: 'vong-cao-cap', name: 'Vòng trầm', is_active: false },
    ]);
    const workbook = new Workbook();
    await workbook.xlsx.load(
      buffer as unknown as Parameters<typeof workbook.xlsx.load>[0],
    );
    const products = workbook.getWorksheet('San pham')!;
    const reference = workbook.getWorksheet('Danh muc hien co')!;
    expect(products.getCell('A2').text).toBe('');
    expect(products.getCell('C2').value).toBe('Vòng trầm [vong-tram]');
    expect(products.getCell('C2').dataValidation.formulae).toEqual([
      'DanhMucHienCo',
    ]);
    expect(products.getCell('C201').dataValidation.type).toBe('list');
    expect(reference.getCell('B3').value).toBe('vong-cao-cap');
    expect(reference.getCell('D3').value).toContain('(đang ẩn)');
    expect(workbook.definedNames.getRanges('DanhMucHienCo').ranges).toContain(
      "'Danh muc hien co'!$D$2:$D$3",
    );
    const rows = await parseCatalogWorkbook(buffer, 'products');
    expect(rows).toHaveLength(1);
    expect(rows[0].data.category).toBe('vong-tram');
    expect(rows[0].errors).toEqual([]);
  });
  it('does not invent a category when the website has none', async () => {
    const buffer = await catalogTemplate('products', []);
    const workbook = new Workbook();
    await workbook.xlsx.load(
      buffer as unknown as Parameters<typeof workbook.xlsx.load>[0],
    );
    expect(workbook.getWorksheet('San pham')!.getCell('C2').text).toBe('');
    expect(
      workbook.getWorksheet('Danh muc hien co')!.getCell('A2').text,
    ).toContain('Chưa có danh mục');
  });
  it('accepts descriptive dropdown choices and legacy manually entered slugs', () => {
    for (const category of ['Vòng tay trầm [vong-tay]', 'vong-tay']) {
      const result = normalizeCatalogRow('products', {
        name: 'Vòng trầm',
        price: 100,
        quantity: 2,
        category,
        images: ['vong.jpg'],
      });
      expect(result.data.category).toBe('vong-tay');
      expect(result.errors).toEqual([]);
    }
  });
  it('decodes Vietnamese multipart filenames while preserving already-correct names', () => {
    const name = 'vòng-trầm.jpg';
    expect(uploadedFilename(Buffer.from(name, 'utf8').toString('latin1'))).toBe(
      name,
    );
    expect(uploadedFilename(name)).toBe(name);
  });
  it.each(['products', 'categories'] as const)(
    'roundtrips the %s template',
    async (resource) => {
      const buffer = await catalogTemplate(resource, [
        { slug: 'vong-tay', name: 'Vòng tay trầm', is_active: true },
      ]);
      const rows = await parseCatalogWorkbook(buffer, resource);
      expect(rows).toHaveLength(1);
      expect(rows[0].errors).toEqual([]);
      expect(rows[0].data.slug).toBeTruthy();
    },
  );
  it('rejects old/corrupt files', () => {
    expect(() => checkWorkbookSize(Buffer.from('not excel'))).toThrow();
  });
  it('rejects XLSX archives with excessive expanded content', async () => {
    const buffer = await catalogTemplate('categories');
    const copy = Buffer.from(buffer);
    const signature = copy.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
    copy.writeUInt32LE(30 * 1024 * 1024, signature + 24);
    expect(() => checkWorkbookSize(copy)).toThrow();
  });
  it('normalizes Vietnamese names and rejects ambiguous money/quantity', () => {
    const valid = normalizeCatalogRow('products', {
      name: 'Vòng trầm Đẹp',
      category: 'vong-tay',
      price: '850000',
      quantity: 3,
      images: ['vong.jpg'],
    });
    expect(valid.data.slug).toBe('vong-tram-dep');
    expect(valid.errors).toEqual([]);
    expect(
      normalizeCatalogRow('products', {
        name: 'Vòng',
        category: 'vong',
        price: '850.000',
        quantity: 1.5,
      }).errors,
    ).not.toHaveLength(0);
  });
  it('preserves omitted optional fields for updates', () => {
    const result = normalizeCatalogRow('categories', {
      name: 'Danh mục',
      slug: 'danh-muc',
      description: '',
    });
    expect(result.data).not.toHaveProperty('description');
  });
  it('reports formulas and duplicate slugs on their source rows', async () => {
    const book = new Workbook();
    const sheet = book.addWorksheet('Danh muc');
    sheet.addRow(['slug', 'ten_danh_muc']);
    sheet.addRow(['vong', 'Vòng']);
    sheet.addRow(['vong', { formula: '1+1', result: 2 }]);
    const rows = await parseCatalogWorkbook(
      Buffer.from(await book.xlsx.writeBuffer()),
      'categories',
    );
    expect(rows[1].row).toBe(3);
    expect(rows[1].errors.join(' ')).toMatch(/công thức/);
    expect(rows[1].errors.join(' ')).toMatch(/trùng/);
  });
  it('reads image hyperlinks as URLs, not their display labels', async () => {
    const book = new Workbook();
    const sheet = book.addWorksheet('San pham');
    sheet.addRow(['ten_san_pham', 'danh_muc_slug', 'gia', 'so_luong', 'anh_1']);
    sheet.addRow([
      'Vòng',
      'vong',
      100,
      2,
      { text: 'Xem ảnh', hyperlink: 'https://example.com/photo.jpg' },
    ]);
    const rows = await parseCatalogWorkbook(
      Buffer.from(await book.xlsx.writeBuffer()),
      'products',
    );
    expect(rows[0].data.images).toEqual(['https://example.com/photo.jpg']);
  });
  it('rejects local filesystem paths and invalid image URLs', () => {
    const result = normalizeCatalogRow('products', {
      name: 'Vòng',
      category: 'vong',
      price: 1,
      quantity: 1,
      images: ['C:\\photos\\image.jpg', 'http://example.com/a.jpg'],
    });
    expect(result.errors).toHaveLength(2);
  });
});
