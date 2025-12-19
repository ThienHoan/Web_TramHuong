import { ProductsService } from './products.service';
export declare class ProductsController {
    private readonly productsService;
    constructor(productsService: ProductsService);
    findAll(locale: string): Promise<any[]>;
    findOne(slug: string, locale: string): Promise<any>;
}
