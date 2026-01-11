import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { content_v2_1, auth } from '@googleapis/content';
import { ProductsService } from '../products/products.service';
import { Database } from '../common/types/database.types';

type ProductRow = Database['public']['Tables']['products']['Row'];
type TranslationRow =
  Database['public']['Tables']['product_translations']['Row'];

// Intersection type matching what ProductsService.findAll returns
type MerchantProduct = ProductRow & {
  translation?: TranslationRow;
};

@Injectable()
export class MerchantService {
  private readonly logger = new Logger(MerchantService.name);
  private merchantId: string;
  private contentApi: content_v2_1.Content;

  constructor(
    private configService: ConfigService,
    private productsService: ProductsService,
  ) {
    this.merchantId =
      this.configService.get<string>('GOOGLE_MERCHANT_ID') || '';
    this.initGoogleClient();
  }

  private initGoogleClient() {
    try {
      const clientEmail = this.configService.get<string>('GOOGLE_CLIENT_EMAIL');
      let privateKey = this.configService.get<string>('GOOGLE_PRIVATE_KEY');

      if (!clientEmail || !privateKey || !this.merchantId) {
        this.logger.warn(
          'Google Merchant credentials missing. Sync will not work.',
        );
        return;
      }

      // Handle Base64 encoded Private Key (for Production envs)
      if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        try {
          const decoded = Buffer.from(privateKey, 'base64').toString('utf8');
          if (decoded.includes('-----BEGIN PRIVATE KEY-----')) {
            privateKey = decoded;
          }
        } catch {
          // Ignore error, assume it might be raw but malformed, let GoogleAuth handle or fail later
        }
      }

      // Handle escaped newlines (common in .env files)
      privateKey = privateKey.replace(/\\n/g, '\n');

      const authClient = new auth.GoogleAuth({
        credentials: {
          client_email: clientEmail,
          private_key: privateKey,
        },
        scopes: ['https://www.googleapis.com/auth/content'],
      });

      this.contentApi = new content_v2_1.Content({
        auth: authClient,
      });

      this.logger.log('Google Merchant API client initialized properly.');
    } catch (error) {
      this.logger.error('Failed to initialize Google Merchant client', error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  async handleCron() {
    this.logger.log(
      'Cron Job Started: Syncing products to Google Merchant Center...',
    );
    try {
      const result = await this.syncProducts();
      this.logger.log(`Cron Job Finished: ${JSON.stringify(result)}`);
    } catch (error) {
      this.logger.error('Cron Job Failed:', error);
    }
  }

  async syncProducts() {
    if (!this.contentApi) {
      throw new Error('Merchant API not initialized. Check .env');
    }

    const products = await this.productsService.findAll('vi', {
      limit: 1000,
      page: 1,
    });
    // Explicitly cast to MerchantProduct[] because findAll returns a complex inferred type
    const productList = products.data as unknown as MerchantProduct[];

    if (productList.length === 0) {
      return { message: 'No products to sync' };
    }

    const batchSize = 25; // Safe batch size
    const results = [];

    for (let i = 0; i < productList.length; i += batchSize) {
      const batch = productList.slice(i, i + batchSize);
      const entries = batch.map((product, index) => {
        // Now 'product' is typed as simple MerchantProduct, properties are accessible.
        // DB fields: price is number, sale_price is number | null
        const price = product.price;
        const backendUrl =
          this.configService.get<string>('FRONTEND_URL') ||
          'https://tramhuongthienphuchue.com';

        const title = product.translation?.title || 'Product';
        const description = product.translation?.description || '';

        return {
          batchId: i + index,
          merchantId: this.merchantId,
          method: 'insert', // upsert
          product: {
            offerId: product.id,
            title: title,
            description: description,
            link: `${backendUrl}/products/${product.slug}`,
            // Images is string[] | null in DB types usually, check null safety
            imageLink:
              product.images && product.images.length > 0
                ? product.images[0]
                : '',
            contentLanguage: 'vi',
            targetCountry: 'VN',
            feedLabel: 'VN',
            channel: 'online',
            availability:
              product.quantity && product.quantity > 0
                ? 'in stock'
                : 'out of stock',
            condition: 'new',
            price: {
              value: price.toString(),
              currency: 'VND',
            },
            shipping: [
              {
                country: 'VN',
                price: {
                  value: price >= 300000 ? '0' : '30000',
                  currency: 'VND',
                },
              },
            ],
          },
        };
      });

      try {
        this.logger.log(
          `Syncing batch ${i / batchSize + 1}... Merchant ID: ${this.merchantId}`,
        );
        const response = await this.contentApi.products.custombatch({
          requestBody: { entries },
        });
        results.push(response.data);
      } catch (error: any) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const errorDetails = error.response?.data || error.message;
        this.logger.error(
          `Batch sync failed for index ${i}. Reason: ${JSON.stringify(errorDetails)}`,
        );
      }
    }

    return {
      success: true,
      batches_processed: Math.ceil(productList.length / batchSize),
      detailed_results: results,
    };
  }
}
