import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateOrderDto } from './dto/create-order.dto';

describe('order quantity validation', () => {
  it.each([0, -1, 1.5])('rejects quantity %s', async (quantity) => {
    const order = plainToInstance(CreateOrderDto, {
      items: [{ productId: 'product', quantity }],
      shipping_info: { name: 'A', phone: '1', address: 'A', city: 'A' },
      paymentMethod: 'cod',
    });
    expect(await validate(order)).not.toHaveLength(0);
  });
});
