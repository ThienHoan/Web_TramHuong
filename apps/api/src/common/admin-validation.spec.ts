import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateVoucherDto } from '../vouchers/dto/voucher.dto';
import { CreateProductDto } from '../products/dto/product.dto';
import { CreatePostDto } from '../posts/dto/post.dto';
import { pagination } from './pagination';

const check = (dto: object) =>
  validate(dto, { whitelist: true, forbidNonWhitelisted: true });
describe('admin form contracts', () => {
  it('accepts the voucher amount sent by the admin form', async () => {
    expect(
      await check(
        plainToInstance(CreateVoucherDto, {
          code: 'SALE',
          discount_type: 'PERCENTAGE',
          discount_amount: 10,
          start_date: '2026-11-01',
          end_date: '2026-12-01',
          usage_limit: 100,
        }),
      ),
    ).toHaveLength(0);
  });
  it('rejects missing voucher value and invalid discount type', async () => {
    expect(
      await check(
        plainToInstance(CreateVoucherDto, {
          code: 'SALE',
          discount_type: 'bogus',
          start_date: '2026-11-01',
          end_date: '2026-12-01',
        }),
      ),
    ).not.toHaveLength(0);
  });
  it('accepts product numbers from multipart forms without losing decimals', async () => {
    const product = plainToInstance(CreateProductDto, {
      title_en: 'Wood',
      title_vi: 'Tram',
      desc_en: '',
      desc_vi: '',
      slug: 'wood',
      price: '12.50',
      quantity: '3',
    });
    expect(await check(product)).toHaveLength(0);
    expect(product.price).toBe(12.5);
    expect(product.quantity).toBe(3);
  });
  it('accepts blog cover and featured fields with an automatic slug', async () => {
    expect(
      await check(
        plainToInstance(CreatePostDto, {
          title: 'Story',
          content: '<p>Story</p>',
          cover_image: '/cover.jpg',
          is_featured: true,
        }),
      ),
    ).toHaveLength(0);
  });
  it.each([0, -1, 1.5, NaN])('rejects invalid pagination %s', (page) => {
    expect(() => pagination(page, 20)).toThrow();
  });
  it('normalizes query pagination strings', () => {
    expect(pagination('2', '20')).toEqual({ page: 2, limit: 20 });
  });
});
