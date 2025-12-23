import { SupabaseService } from '../supabase/supabase.service';
export declare class ProductsService {
    private readonly supabase;
    constructor(supabase: SupabaseService);
    findAll(locale?: string, options?: {
        include_inactive?: boolean;
        search?: string;
        category?: string;
        sort?: string;
        page?: number;
        limit?: number;
        stock_status?: string;
    }): Promise<{
        data: any[];
        meta: {
            total: number | null;
            page: number;
            limit: number;
            last_page: number;
        };
    }>;
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
    bulkUpdate(ids: string[], action: 'delete' | 'archive' | 'restore' | 'update_category', payload?: any): Promise<{
        success: boolean;
        message: string;
        count?: undefined;
    } | {
        success: boolean;
        count: number;
        message?: undefined;
    }>;
    exportProducts(locale?: string, options?: any): Promise<string>;
}
