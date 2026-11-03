import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Server } from 'node:http';
import { CatalogImportController } from './catalog-import.controller';
import { CatalogImportService } from './catalog-import.service';
import { catalogTemplate } from './catalog-import-format';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { SupabaseService } from '../supabase/supabase.service';

describe('admin resource authorization', () => {
  let app: INestApplication<Server>;
  let currentRole = 'CUSTOMER';
  let banned = false;
  beforeAll(async () => {
    const query = {
      select: () => query,
      eq: () => query,
      single: () => ({
        data: { role: currentRole, is_banned: banned },
        error: null,
      }),
    };
    const module = await Test.createTestingModule({
      controllers: [AdminController, CatalogImportController],
      providers: [
        {
          provide: CatalogImportService,
          useValue: {
            template: catalogTemplate,
            preview: () =>
              Promise.resolve({
                rows: [],
                configured: true,
                summary: { total: 0, valid: 0, invalid: 0, skipped: 0 },
              }),
            commit: () => Promise.resolve({ action: 'created' }),
          },
        },
        {
          provide: AdminService,
          useValue: {
            list: () => ({ data: [], meta: { total: 0 } }),
            operations: () => ({ paidOrders: 0 }),
            export: () => ({ csv: 'id', count: 0 }),
          },
        },
        {
          provide: SupabaseService,
          useValue: {
            getClient: () => ({
              auth: {
                getUser: () => ({
                  data: { user: { id: 'fixture-user' } },
                  error: null,
                }),
              },
              from: () => query,
            }),
          },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  it.each([
    '/admin/resources/orders',
    '/admin/resources/users/export',
    '/admin/operations',
  ])('rejects guests for %s', async (path) => {
    await request(app.getHttpServer()).get(path).expect(401);
  });
  it('rejects customer access', async () => {
    currentRole = 'CUSTOMER';
    await request(app.getHttpServer())
      .get('/admin/resources/users')
      .set('Authorization', 'Bearer fixture')
      .expect(403);
  });
  it.each(['ADMIN', 'STAFF'])('allows %s access', async (role) => {
    currentRole = role;
    await request(app.getHttpServer())
      .get('/admin/resources/orders')
      .set('Authorization', 'Bearer fixture')
      .expect(200);
  });
  it('rejects a banned admin', async () => {
    currentRole = 'ADMIN';
    banned = true;
    await request(app.getHttpServer())
      .get('/admin/resources/orders')
      .set('Authorization', 'Bearer fixture')
      .expect(403);
    banned = false;
  });
  it('protects workbook templates from guests', async () => {
    await request(app.getHttpServer())
      .get('/admin/import/products/template')
      .expect(401);
  });
  it('rejects staff import access', async () => {
    currentRole = 'STAFF';
    await request(app.getHttpServer())
      .get('/admin/import/products/template')
      .set('Authorization', 'Bearer fixture')
      .expect(403);
    await request(app.getHttpServer())
      .post('/admin/import/products/row')
      .set('Authorization', 'Bearer fixture')
      .expect(403);
  });
  it('serves an Excel template to admins', async () => {
    currentRole = 'ADMIN';
    await request(app.getHttpServer())
      .get('/admin/import/categories/template')
      .set('Authorization', 'Bearer fixture')
      .expect('Content-Type', /spreadsheetml/)
      .expect(200);
  });
  it('accepts an authenticated multipart preview', async () => {
    currentRole = 'ADMIN';
    await request(app.getHttpServer())
      .post('/admin/import/categories/preview')
      .set('Authorization', 'Bearer fixture')
      .field('mode', 'skip')
      .field('filenames', '[]')
      .attach(
        'workbook',
        await catalogTemplate('categories'),
        'categories.xlsx',
      )
      .expect(201);
  });
  it('rejects malformed import input before committing', async () => {
    currentRole = 'ADMIN';
    await request(app.getHttpServer())
      .post('/admin/import/products/row')
      .set('Authorization', 'Bearer fixture')
      .field('row', 'not json')
      .expect(400);
  });
});
