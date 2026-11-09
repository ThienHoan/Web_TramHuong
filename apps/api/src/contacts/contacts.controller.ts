import {
  Controller,
  Post,
  Body,
  ValidationPipe,
  UsePipes,
  Get,
  Query,
  Patch,
  Param,
  UseGuards,
  Headers,
  Optional,
} from '@nestjs/common';
import { ContactsService, CreateContactDto } from './contacts.service';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ConfigService } from '@nestjs/config';
import { LegalAcceptanceDto, legalReceipt } from '../legal/legal-acceptance';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import { ContactProtectionService } from '../integrations/contact-protection.service';

class CreateContactValidator implements CreateContactDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => LegalAcceptanceDto)
  legalAcceptance?: LegalAcceptanceDto;

  @IsNotEmpty()
  @IsString()
  @Length(2, 100)
  full_name: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  topic?: string;

  @IsNotEmpty()
  @IsString()
  @Length(10, 2000)
  message: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  turnstileToken?: string;
}

@Controller('contacts')
export class ContactsController {
  constructor(
    private readonly contactsService: ContactsService,
    private readonly protection: ContactProtectionService,
    @Optional() private readonly config?: ConfigService,
  ) {}

  @Get('protection')
  protectionStatus() {
    return this.protection.status();
  }

  @Post('protection/challenge')
  @Throttle({ default: { limit: 10, ttl: 900000 } })
  issueChallenge(
    @Headers('origin') origin?: string,
    @Body('action') action?: string,
  ) {
    return this.protection.issue(
      origin,
      action === 'checkout' ? 'checkout' : 'contact',
    );
  }

  @Post()
  // Rate Limit: 5 requests per 15 minutes (900000ms)
  // "default" refers to the default throttler set in AppModule, we override it here for this route
  @Throttle({ default: { limit: 5, ttl: 900000 } })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async create(
    @Body() body: CreateContactValidator,
    @Headers('origin') origin?: string,
  ) {
    const receipt = legalReceipt(
      body.legalAcceptance,
      'contact_response',
      this.config?.get('LEGAL_CONSENT_ENFORCED') === 'true',
    );
    await this.protection.verify(body.turnstileToken, origin);
    const { full_name, email, topic, message } = body;
    return this.contactsService.create({
      full_name,
      email,
      topic,
      message,
      ...(receipt ? { legal_acceptance: receipt } : {}),
    });
  }

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  async findAll(@Query('page') page: number, @Query('limit') limit: number) {
    return this.contactsService.findAll(page, limit);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.contactsService.updateStatus(id, status);
  }
}
