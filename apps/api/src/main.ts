import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { AppModule } from './app.module';
import compression from 'compression';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { trustProxySetting } from './common/trust-proxy';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  // Behind the reverse proxy every request arrives from the proxy container. Trust
  // only private/loopback hops so req.ip (rate limits, logs) is the real visitor,
  // while a visitor-supplied X-Forwarded-For cannot pick its own IP.
  app.set('trust proxy', trustProxySetting(process.env.TRUST_PROXY));

  // Use Pino Logger
  app.useLogger(app.get(Logger));

  // Security & Performance
  app.use(helmet());
  app.use(compression());

  app.enableCors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',')
      : ['http://localhost:3000'],
    credentials: true,
  });

  // Global Exception Filter
  const httpAdapter = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Set global prefix
  app.setGlobalPrefix('api');

  const port = process.env.PORT ?? 4000;
  await app.listen(port, '0.0.0.0');
  const logger = app.get(Logger);
  logger.log(`Application is running on: http://0.0.0.0:${port}/api`);
}
void bootstrap();
