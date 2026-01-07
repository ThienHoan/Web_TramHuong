import { Controller, Get, Post, Body, Patch, Delete, Param, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { CartService } from './cart.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('cart')
export class CartController {
    constructor(private readonly cartService: CartService) { }

    @Get()
    @UseGuards(AuthGuard)
    async getCart(@Req() req: Request & { user: { id: string } }) {
        // req.user is set by AuthGuard
        return this.cartService.getCart(req.user.id);
    }

    @Post('merge')
    @UseGuards(AuthGuard)
    async mergeCart(@Req() req: Request & { user: { id: string } }, @Body() body: { items: any[] }) {
        return this.cartService.mergeCart(req.user.id, body.items);
    }

    @Post('items')
    @UseGuards(AuthGuard)
    async addItem(@Req() req: Request & { user: { id: string } }, @Body() body: { productId: string, quantity: number, variantId?: string, variantName?: string }) {
        return this.cartService.addItem(req.user.id, body.productId, body.quantity || 1, body.variantId, body.variantName);
    }

    @Patch('items/:id')
    @UseGuards(AuthGuard)
    async updateQuantity(
        @Req() req: Request & { user: { id: string } },
        @Param('id') itemId: string,
        @Body() body: { quantity: number }
    ) {
        return this.cartService.updateQuantity(req.user.id, itemId, body.quantity);
    }

    @Delete('items/:id')
    @UseGuards(AuthGuard)
    async removeItem(@Req() req: Request & { user: { id: string } }, @Param('id') itemId: string) {
        return this.cartService.removeItem(req.user.id, itemId);
    }
}
