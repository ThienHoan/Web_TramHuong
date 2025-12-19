import { SupabaseService } from '../supabase/supabase.service';
export declare class ProductsService {
    private readonly supabase;
    constructor(supabase: SupabaseService);
    findAll(locale?: string): Promise<any[]>;
    findOne(slug: string, locale?: string): Promise<any>;
}
