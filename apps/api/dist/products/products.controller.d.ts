import { ProductsService } from './products.service';
export declare class ProductsController {
    private readonly productsService;
    constructor(productsService: ProductsService);
    findAll(locale: string, include_inactive?: string): Promise<any[]>;
    findOne(slug: string, locale: string): Promise<any>;
    findAdminOne(id: string): Promise<any>;
    create(body: any, file: Express.Multer.File): Promise<any>;
    update(id: string, body: any, file?: Express.Multer.File): Promise<{
        success: boolean;
    }>;
    remove(id: string): Promise<{
        success: boolean;
    }>;
}
