import {
  Body,
  Controller,
  Header,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CatalogAdvisorDto } from './catalog-advisor.contract';
import { CatalogAdvisorService } from './catalog-advisor.service';

@Controller('ai')
export class CatalogAdvisorController {
  constructor(private readonly advisor: CatalogAdvisorService) {}

  @Post('product-advisor')
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  advise(@Body() body: CatalogAdvisorDto) {
    return this.advisor.advise(body);
  }
}
