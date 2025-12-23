import { ProductsService } from './products.service';
export declare class ProductsController {
    private readonly productsService;
    constructor(productsService: ProductsService);
    findAll(locale: string, include_inactive?: string, search?: string, category?: string, sort?: string, page?: string, limit?: string, stock_status?: string): Promise<{
        data: any[];
        meta: {
            total: number | null;
            page: number;
            limit: number;
            last_page: number;
        };
    }>;
    findOne(slug: string, locale: string): Promise<any>;
    findAdminOne(id: string): Promise<any>;
    create(body: any, file: Express.Multer.File): Promise<any>;
    update(id: string, body: any, file?: Express.Multer.File): Promise<{
        success: boolean;
    }>;
    remove(id: string): Promise<{
        success: boolean;
    }>;
    bulkUpdate(body: {
        ids: string[];
        action: 'delete' | 'archive' | 'restore' | 'update_category';
        payload?: any;
    }): Promise<{
        success: boolean;
        message: string;
        count?: undefined;
    } | {
        success: boolean;
        count: number;
        message?: undefined;
    }>;
    exportData(locale: string, search?: string, category?: string, stock_status?: string, include_inactive?: string): Promise<{
        csv: string;
    }>;
}
