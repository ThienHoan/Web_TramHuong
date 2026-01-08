import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseModule } from './supabase/supabase.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { CategoriesModule } from './categories/categories.module';
import { CartModule } from './cart/cart.module';
import { UsersModule } from './users/users.module';
import { ReviewsModule } from './reviews/reviews.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { PostsModule } from './posts/posts.module';
import { ContactsModule } from './contacts/contacts.module';
import { VouchersModule } from './vouchers/vouchers.module';
import { StorageModule } from './storage/storage.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../../.env' }),
    // Structured Logging with Pino
    LoggerModule.forRoot({
      pinoHttp: {
        // Pretty print in development, JSON in production
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
        // Redact sensitive data
        redact: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.headers["x-api-key"]',
          'req.body.password',
          'req.body.token',
          'req.body.refreshToken',
          'req.body.access_token',
        ],
        // Auto-assign request ID if missing
        genReqId: (req) => req.headers['x-request-id'] || crypto.randomUUID(),
        // Custom log levels: 5xx=error, 4xx=warn, others=info
        customLogLevel: (req, res, err) => {
          if (res.statusCode >= 500 || err) return 'error';
          if (res.statusCode >= 400) return 'warn';
          return 'info';
        },
        // Capture client IP
        customProps: (req) => ({
          ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
        }),
      },
    }),
    // In-memory cache: TTL 60 seconds default
    CacheModule.register({
      isGlobal: true,
      ttl: 60000,
      max: 100,
    }),
    ScheduleModule.forRoot(),
    // Rate Limiting: 100 requests per 60 seconds
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    SupabaseModule,
    ProductsModule,
    OrdersModule,
    CategoriesModule,
    CartModule,
    UsersModule,
    ReviewsModule,
    WishlistModule,
    AnalyticsModule,
    PostsModule,
    ContactsModule,
    VouchersModule,
    StorageModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
