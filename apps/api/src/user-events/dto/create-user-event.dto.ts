import { IsNotEmpty, IsOptional, IsString, IsUUID, IsObject } from 'class-validator';

export class CreateUserEventDto {
    @IsNotEmpty()
    @IsString()
    eventType: string;

    @IsNotEmpty()
    @IsUUID()
    productId: string;

    @IsOptional()
    @IsString()
    sessionId?: string;

    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;
}
