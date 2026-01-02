// Test file to verify discount logic
const product = {
    slug: 'est-discount-product',
    price: 100000,
    discount_percentage: 20,
    discount_start_date: '2026-01-01T07:00:00+00:00',
    discount_end_date: '2026-01-03T07:00:00+00:00'
};

const hasDiscount = product.discount_percentage > 0;
const now = new Date();
const isActive = hasDiscount &&
    (!product.discount_start_date || new Date(product.discount_start_date) <= now) &&
    (!product.discount_end_date || new Date(product.discount_end_date) >= now);

console.log('=== DISCOUNT LOGIC TEST ===');
console.log('Product:', product.slug);
console.log('Price:', product.price);
console.log('Discount %:', product.discount_percentage);
console.log('Start:', product.discount_start_date);
console.log('End:', product.discount_end_date);
console.log('Now:', now.toISOString());
console.log('---');
console.log('hasDiscount:', hasDiscount);
console.log('isActive:', isActive);
console.log('---');

if (isActive) {
    const finalPrice = product.price * (1 - product.discount_percentage / 100);
    console.log('✅ SHOULD SHOW DISCOUNT!');
    console.log('Final Price:', finalPrice);
    console.log('Savings:', product.price - finalPrice);
} else {
    console.log('❌ NO DISCOUNT (not active)');
}
