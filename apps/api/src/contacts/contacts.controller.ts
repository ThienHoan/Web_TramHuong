import { Controller, Post, Body, ValidationPipe, UsePipes, Get, Query, Patch, Param, UseGuards } from '@nestjs/common';
import { ContactsService, CreateContactDto } from './contacts.service';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';

class CreateContactValidator implements CreateContactDto {
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
}

@Controller('contacts')
export class ContactsController {
    constructor(private readonly contactsService: ContactsService) { }

    @Post()
    // Rate Limit: 5 requests per 15 minutes (900000ms)
    // "default" refers to the default throttler set in AppModule, we override it here for this route
    @Throttle({ default: { limit: 5, ttl: 900000 } })
    @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
    async create(@Body() body: CreateContactValidator) {
        return this.contactsService.create(body);
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

