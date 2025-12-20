import { SupabaseService } from '../supabase/supabase.service';
export declare class ProductsService {
    private readonly supabase;
    constructor(supabase: SupabaseService);
    findAll(locale?: string, options?: {
        include_inactive?: boolean;
    }): Promise<any[]>;
    findOne(slug: string, locale?: string): Promise<any>;
    findById(id: string): Promise<any>;
    create(body: any, file: Express.Multer.File): Promise<any>;
    update(id: string, body: any, file?: Express.Multer.File): Promise<{
        success: boolean;
    }>;
    softDelete(id: string): Promise<{
        success: boolean;
    }>;
    uploadImage(file: Express.Multer.File): Promise<string>;
}
