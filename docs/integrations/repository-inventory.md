# Repository inventory — 03/11/2026

Generated source/schema inventory; every listed text file scanned for declarations/dependencies. This is coverage metadata, not a claim of line-by-line functional verification. No env values or customer rows included.

## Files

| File | Lines | SHA256 (12 chars) |
| --- | ---: | --- |
| `apps/api/database/01_reviews_table.sql` | 52 | 2dc74e046798 |
| `apps/api/database/02_fix_reviews_fk.sql` | 11 | 1d894cdb3b4e |
| `apps/api/database/03_reviews_seed_columns.sql` | 38 | 13391ace3cc9 |
| `apps/api/database/04_add_user_address_columns.sql` | 20 | 5efef8b54145 |
| `apps/api/database/05_create_wishlist_table.sql` | 34 | 5465221023d1 |
| `apps/api/database/06_add_payment_deadline.sql` | 48 | 1ed1847a0b8a |
| `apps/api/migrations/add-product-discounts.sql` | 68 | 0efeb92106a3 |
| `apps/api/migrations/admin-catalog-import.sql` | 107 | bef644fe7cad |
| `apps/api/migrations/admin-order-integrity.sql` | 54 | 934479f5a06e |
| `apps/api/migrations/shipping-evidence-storage.sql` | 14 | aff3db73d72e |
| `apps/api/migrations/smart-logistics.sql` | 148 | 91f7ffa05418 |
| `apps/api/src/admin/admin.controller.spec.ts` | 147 | 3196ac96d7bd |
| `apps/api/src/admin/admin.controller.ts` | 34 | 3c741c308638 |
| `apps/api/src/admin/admin.module.ts` | 13 | c56e0b703b1e |
| `apps/api/src/admin/admin.service.spec.ts` | 170 | 8335fbec7794 |
| `apps/api/src/admin/admin.service.ts` | 339 | 7cbf8844850b |
| `apps/api/src/admin/catalog-import-format.spec.ts` | 159 | c9a1359de9c3 |
| `apps/api/src/admin/catalog-import-format.ts` | 458 | 438294718b52 |
| `apps/api/src/admin/catalog-import.controller.ts` | 102 | 4e7e1fe3b021 |
| `apps/api/src/admin/catalog-import.service.spec.ts` | 197 | 81e7ab759be3 |
| `apps/api/src/admin/catalog-import.service.ts` | 323 | 189063c631bc |
| `apps/api/src/analytics/analytics.controller.ts` | 18 | 7954123655ef |
| `apps/api/src/analytics/analytics.module.ts` | 11 | dee274677acb |
| `apps/api/src/analytics/analytics.service.ts` | 218 | d8fe815b9fc1 |
| `apps/api/src/app.controller.spec.ts` | 22 | 88faf5523fd7 |
| `apps/api/src/app.controller.ts` | 12 | 260f889b9e2b |
| `apps/api/src/app.module.ts` | 105 | 428026dd3ef8 |
| `apps/api/src/app.service.ts` | 8 | eaf8514ce110 |
| `apps/api/src/auth/auth.guard.ts` | 88 | 46b5f8a86197 |
| `apps/api/src/auth/public.decorator.ts` | 4 | bb149c7568f2 |
| `apps/api/src/auth/role.enum.ts` | 5 | cd3ceab6ca03 |
| `apps/api/src/auth/roles.decorator.ts` | 5 | c03497145c7a |
| `apps/api/src/auth/roles.guard.ts` | 35 | fafd42c4ec3d |
| `apps/api/src/cart/cart.controller.ts` | 83 | 6e1cafe8f824 |
| `apps/api/src/cart/cart.module.ts` | 12 | 40a0817a077b |
| `apps/api/src/cart/cart.service.ts` | 248 | 204abccb5a01 |
| `apps/api/src/categories/categories.controller.ts` | 77 | 5927ba77dc38 |
| `apps/api/src/categories/categories.module.ts` | 12 | 147d746637b6 |
| `apps/api/src/categories/categories.service.ts` | 235 | 5a71033b8005 |
| `apps/api/src/chat/chat.controller.ts` | 115 | fa209d521a45 |
| `apps/api/src/chat/chat.module.ts` | 12 | 39fa79719c7b |
| `apps/api/src/chat/chat.service.ts` | 300 | 9e5d19b0b0f3 |
| `apps/api/src/common/admin-validation.spec.ts` | 41 | 41a3c2483ef9 |
| `apps/api/src/common/commerce-pricing.ts` | 36 | 4a140d8f9819 |
| `apps/api/src/common/filters/http-exception.filter.ts` | 82 | d14d0e8fb588 |
| `apps/api/src/common/pagination.ts` | 10 | 14c8babbcc6d |
| `apps/api/src/common/types/database.types.ts` | 568 | 8f8289e5f580 |
| `apps/api/src/contacts/contacts.controller.ts` | 73 | 21dce7bb5ba3 |
| `apps/api/src/contacts/contacts.module.ts` | 11 | f967b083148d |
| `apps/api/src/contacts/contacts.service.ts` | 70 | 6f6ca7562941 |
| `apps/api/src/mail/mail.module.ts` | 41 | 82fe6c7eb912 |
| `apps/api/src/mail/mail.service.ts` | 136 | 56a41fe708a3 |
| `apps/api/src/mail/templates/admin-new-order.hbs` | 13 | fc1781ecc092 |
| `apps/api/src/mail/templates/order-confirmation.hbs` | 13 | 8cfdcbfc9f60 |
| `apps/api/src/mail/templates/order-status.hbs` | 10 | bfe64019cc7e |
| `apps/api/src/mail/templates/payment-success.hbs` | 5 | b212451378ef |
| `apps/api/src/main.ts` | 47 | 3eb244cce316 |
| `apps/api/src/merchant/merchant.controller.ts` | 18 | a2e1aee05e91 |
| `apps/api/src/merchant/merchant.module.ts` | 12 | 9cb44b44657f |
| `apps/api/src/merchant/merchant.service.ts` | 187 | d7b7e305a71a |
| `apps/api/src/orders/dto/create-order.dto.ts` | 83 | e9e359ce56b9 |
| `apps/api/src/orders/dto/lookup-order.dto.ts` | 11 | fc30f32b90fe |
| `apps/api/src/orders/order-cleanup.service.ts` | 94 | 4996d2ec95b7 |
| `apps/api/src/orders/order-validation.spec.ts` | 15 | 075b6339b129 |
| `apps/api/src/orders/orders.controller.ts` | 184 | c8a8c44b0d9f |
| `apps/api/src/orders/orders.module.ts` | 19 | 9a6f9248e9ca |
| `apps/api/src/orders/orders.service.spec.ts` | 117 | 0eee2f964671 |
| `apps/api/src/orders/orders.service.ts` | 844 | 05528dc81e4b |
| `apps/api/src/orders/payment-persistence.spec.ts` | 102 | 8ba1f9ad3371 |
| `apps/api/src/orders/shipping-checkout.spec.ts` | 175 | 22888d5c4947 |
| `apps/api/src/posts/dto/post.dto.ts` | 108 | e6611135b5ee |
| `apps/api/src/posts/posts.controller.ts` | 78 | f3abbdd943bc |
| `apps/api/src/posts/posts.module.ts` | 12 | 41301a834518 |
| `apps/api/src/posts/posts.service.spec.ts` | 29 | 0d39564fbd5d |
| `apps/api/src/posts/posts.service.ts` | 131 | 1ac4f41efe29 |
| `apps/api/src/products/dto/product.dto.ts` | 149 | d7cae601e460 |
| `apps/api/src/products/products.controller.ts` | 148 | d2ec4457bff9 |
| `apps/api/src/products/products.module.ts` | 13 | 5d4b6c98907c |
| `apps/api/src/products/products.service.ts` | 762 | 1442d3d66110 |
| `apps/api/src/reviews/dto/review.dto.ts` | 46 | 6b209ec5215a |
| `apps/api/src/reviews/reviews.controller.ts` | 90 | e8dae88cba44 |
| `apps/api/src/reviews/reviews.module.ts` | 12 | b1242a3fdf98 |
| `apps/api/src/reviews/reviews.service.ts` | 243 | dabd5a244818 |
| `apps/api/src/scripts/seed.ts` | 235 | 973809f05517 |
| `apps/api/src/shipping/address.service.spec.ts` | 174 | 75bbbee10241 |
| `apps/api/src/shipping/address.service.ts` | 108 | 474487cb5680 |
| `apps/api/src/shipping/contracts/shipping-provider.ts` | 91 | 1c70a6d9551a |
| `apps/api/src/shipping/dto/address.dto.ts` | 48 | 4feb253a01fb |
| `apps/api/src/shipping/dto/operations.dto.ts` | 144 | a6e96eaeecfe |
| `apps/api/src/shipping/dto/quote.dto.ts` | 43 | c07c33167cfa |
| `apps/api/src/shipping/evidence.service.spec.ts` | 119 | 39c94ddd06fc |
| `apps/api/src/shipping/evidence.service.ts` | 102 | 1ceb12c4420b |
| `apps/api/src/shipping/fulfillment.service.spec.ts` | 133 | 69051924ea37 |
| `apps/api/src/shipping/fulfillment.service.ts` | 502 | efeb534ddf25 |
| `apps/api/src/shipping/ghn/ghn.client.spec.ts` | 195 | e5cee7fab548 |
| `apps/api/src/shipping/ghn/ghn.client.ts` | 201 | 6836b1b02fdf |
| `apps/api/src/shipping/ghn/ghn.config.spec.ts` | 68 | 2faaf8bf309f |
| `apps/api/src/shipping/ghn/ghn.config.ts` | 77 | 215e44576e91 |
| `apps/api/src/shipping/ghn/ghn.decode.ts` | 42 | 2580c56d3fdc |
| `apps/api/src/shipping/ghn/ghn.error.ts` | 23 | 41982a89b3b7 |
| `apps/api/src/shipping/ghn/ghn.operations.ts` | 104 | d1ce9d5b14f5 |
| `apps/api/src/shipping/ghn/ghn.provider.spec.ts` | 303 | fce90be24a44 |
| `apps/api/src/shipping/ghn/ghn.provider.ts` | 288 | b44a3c7e0744 |
| `apps/api/src/shipping/logistics-workflows.spec.ts` | 312 | 596ba9e8f4c5 |
| `apps/api/src/shipping/logistics.repository.ts` | 177 | 3e4b0f6fba99 |
| `apps/api/src/shipping/logistics.types.ts` | 51 | 5a87ddd2e906 |
| `apps/api/src/shipping/operations.controller.ts` | 363 | 1362fe1bd291 |
| `apps/api/src/shipping/operations.service.ts` | 655 | 16a15064a697 |
| `apps/api/src/shipping/promotion-policy.spec.ts` | 26 | 227fce88c494 |
| `apps/api/src/shipping/promotion-policy.ts` | 25 | 3aa6d399c6ab |
| `apps/api/src/shipping/provider-registry.ts` | 47 | 9265e503891a |
| `apps/api/src/shipping/quote.controller.ts` | 68 | 7a12685324f1 |
| `apps/api/src/shipping/quote.service.spec.ts` | 211 | b45cfcca67f6 |
| `apps/api/src/shipping/quote.service.ts` | 467 | d14132f37946 |
| `apps/api/src/shipping/shipment-state.ts` | 81 | 766676f9ab3a |
| `apps/api/src/shipping/shipping-authorization.spec.ts` | 130 | 87da2cdc6f67 |
| `apps/api/src/shipping/shipping.controller.spec.ts` | 109 | 0bbfbbf5bba6 |
| `apps/api/src/shipping/shipping.controller.ts` | 61 | 75b54e18878c |
| `apps/api/src/shipping/shipping.jobs.spec.ts` | 56 | 0c4646b66332 |
| `apps/api/src/shipping/shipping.jobs.ts` | 86 | d5739c3c8a64 |
| `apps/api/src/shipping/shipping.module.ts` | 87 | b95862b8914b |
| `apps/api/src/shipping/testing/memory-repository.ts` | 107 | 73f84b02a50a |
| `apps/api/src/shipping/tracking.controller.ts` | 33 | cf100bfdca38 |
| `apps/api/src/shipping/tracking.service.ts` | 344 | efff8b0552ec |
| `apps/api/src/storage/remote-image.spec.ts` | 42 | b17be969a09a |
| `apps/api/src/storage/remote-image.ts` | 163 | 1e25b1380455 |
| `apps/api/src/storage/storage-image.spec.ts` | 94 | 22176e1cdfce |
| `apps/api/src/storage/storage.controller.ts` | 112 | 1c9ae8c5a508 |
| `apps/api/src/storage/storage.module.ts` | 10 | 49f3a465e90f |
| `apps/api/src/storage/storage.service.ts` | 250 | 5d7524c3aba3 |
| `apps/api/src/supabase/supabase.module.ts` | 11 | f86dafdb6bcc |
| `apps/api/src/supabase/supabase.service.ts` | 50 | 7f8dab8ae7da |
| `apps/api/src/users/users.controller.ts` | 119 | d8e397ef53cb |
| `apps/api/src/users/users.module.ts` | 12 | e3e29584e410 |
| `apps/api/src/users/users.security.spec.ts` | 18 | 7c65288f4be0 |
| `apps/api/src/users/users.service.ts` | 118 | 0a4c48b33781 |
| `apps/api/src/vouchers/dto/voucher.dto.ts` | 122 | 100a1b36310e |
| `apps/api/src/vouchers/vouchers.controller.ts` | 62 | 5a3553b58afe |
| `apps/api/src/vouchers/vouchers.module.ts` | 25 | 4f6146848401 |
| `apps/api/src/vouchers/vouchers.service.spec.ts` | 33 | c6695c7c5c4b |
| `apps/api/src/vouchers/vouchers.service.ts` | 270 | fb79b0f7a615 |
| `apps/api/src/wishlist/wishlist.controller.ts` | 57 | 8bce1d50e4aa |
| `apps/api/src/wishlist/wishlist.module.ts` | 12 | 30ee407a8fe8 |
| `apps/api/src/wishlist/wishlist.service.ts` | 113 | 1fdd4ef468a0 |
| `apps/api/supabase/db.txt` | 136 | 5f2526d9592f |
| `apps/api/supabase/migration_add_cart_variant.sql` | 24 | 864ffa143c87 |
| `apps/api/supabase/migration_add_category_id.sql` | 2 | d3fc3c720b5f |
| `apps/api/supabase/migration_add_featured.sql` | 5 | 21f76908a09a |
| `apps/api/supabase/migration_add_featured_section.sql` | 9 | ffb34e73a1c2 |
| `apps/api/supabase/migration_add_original_price.sql` | 1 | 037faefe8602 |
| `apps/api/supabase/migration_add_variants.sql` | 1 | c52839a91be4 |
| `apps/api/supabase/migration_blog_init.sql` | 53 | ad706640e27f |
| `apps/api/supabase/migration_contact_init.sql` | 24 | 3a405b35f052 |
| `apps/api/supabase/migration_optimization.sql` | 21 | f9151040e6d4 |
| `apps/api/supabase/schema.sql` | 61 | 80967ba6242f |
| `apps/api/supabase/seed_blog.sql` | 44 | e952f09b4c4a |
| `apps/web/src/app/[locale]/(auth)/auth/reset-password/page.tsx` | 229 | 24f26c5f115f |
| `apps/web/src/app/[locale]/(auth)/auth/verify/page.tsx` | 354 | b55843267c72 |
| `apps/web/src/app/[locale]/(auth)/layout.tsx` | 17 | fa2ba1c3d7ac |
| `apps/web/src/app/[locale]/(auth)/login/page.tsx` | 445 | d538cc6cd730 |
| `apps/web/src/app/[locale]/3d-lab/page.tsx` | 19 | c5f7835e4db9 |
| `apps/web/src/app/[locale]/[...rest]/page.tsx` | 5 | 244024429f18 |
| `apps/web/src/app/[locale]/account/layout.tsx` | 5 | 82d9d675d8b4 |
| `apps/web/src/app/[locale]/account/orders/[id]/page.tsx` | 584 | 2ca13eb72e8b |
| `apps/web/src/app/[locale]/account/orders/page.tsx` | 310 | 8f23b6755e9b |
| `apps/web/src/app/[locale]/account/profile/page.tsx` | 413 | df2d3a855f34 |
| `apps/web/src/app/[locale]/account/reviews/page.tsx` | 102 | 812f932f03fe |
| `apps/web/src/app/[locale]/account/wishlist/page.tsx` | 280 | ef818d4c4b4c |
| `apps/web/src/app/[locale]/admin/admin.css` | 1682 | b974d44af884 |
| `apps/web/src/app/[locale]/admin/blog/[id]/page.tsx` | 150 | 269eea8803b4 |
| `apps/web/src/app/[locale]/admin/blog/page.tsx` | 5 | c7b4102530dd |
| `apps/web/src/app/[locale]/admin/categories/[id]/page.tsx` | 178 | 45091d63d7b7 |
| `apps/web/src/app/[locale]/admin/categories/new/page.tsx` | 129 | dfc8d87e99e1 |
| `apps/web/src/app/[locale]/admin/categories/page.tsx` | 5 | 0bc160abe8ed |
| `apps/web/src/app/[locale]/admin/contacts/page.tsx` | 5 | 2143431a95c7 |
| `apps/web/src/app/[locale]/admin/dashboard/page.tsx` | 322 | 27baa52dcdea |
| `apps/web/src/app/[locale]/admin/layout.tsx` | 268 | 86cf35c8c21d |
| `apps/web/src/app/[locale]/admin/orders/[id]/page.tsx` | 172 | c2745f75d701 |
| `apps/web/src/app/[locale]/admin/orders/page.tsx` | 5 | 7fea522d0d47 |
| `apps/web/src/app/[locale]/admin/page.tsx` | 17 | ac5c02cb78d0 |
| `apps/web/src/app/[locale]/admin/products/[id]/page.tsx` | 621 | 14d081033cf9 |
| `apps/web/src/app/[locale]/admin/products/new/page.tsx` | 309 | b9b92fdb2d40 |
| `apps/web/src/app/[locale]/admin/products/page.tsx` | 5 | 126a9e6d553d |
| `apps/web/src/app/[locale]/admin/shipping/page.tsx` | 1057 | 08e3442e5e67 |
| `apps/web/src/app/[locale]/admin/users/[id]/page.tsx` | 212 | ab0526ccdaa5 |
| `apps/web/src/app/[locale]/admin/users/page.tsx` | 5 | cef6d637c9cf |
| `apps/web/src/app/[locale]/admin/vouchers/[id]/page.tsx` | 280 | 712ffa4e5a1e |
| `apps/web/src/app/[locale]/admin/vouchers/new/page.tsx` | 239 | cd1df205a489 |
| `apps/web/src/app/[locale]/admin/vouchers/page.tsx` | 5 | 68b7c45d89bd |
| `apps/web/src/app/[locale]/blog/[slug]/page.tsx` | 220 | 0f2b147a25c9 |
| `apps/web/src/app/[locale]/blog/page.tsx` | 234 | 4808641c6a2e |
| `apps/web/src/app/[locale]/checkout/layout.tsx` | 17 | 9426243eb520 |
| `apps/web/src/app/[locale]/checkout/page.tsx` | 16 | a8e2c07e9563 |
| `apps/web/src/app/[locale]/checkout/payment/page.tsx` | 407 | 45e23dd7ccb4 |
| `apps/web/src/app/[locale]/checkout/payment_select/page.tsx` | 345 | fa011194a8cf |
| `apps/web/src/app/[locale]/checkout/success/page.tsx` | 341 | 6158c58bcbdb |
| `apps/web/src/app/[locale]/contact/page.tsx` | 237 | 986170d4465e |
| `apps/web/src/app/[locale]/layout.tsx` | 211 | 23282502d999 |
| `apps/web/src/app/[locale]/loading.tsx` | 5 | a841ce781bf3 |
| `apps/web/src/app/[locale]/not-found.tsx` | 18 | 2a5436eedf66 |
| `apps/web/src/app/[locale]/order-confirmation/[id]/page.tsx` | 84 | 8813e1400fd9 |
| `apps/web/src/app/[locale]/order-lookup/page.tsx` | 16 | 39e594d73f98 |
| `apps/web/src/app/[locale]/page.tsx` | 25 | d03b36297895 |
| `apps/web/src/app/[locale]/partnership/page.tsx` | 253 | 30ad29385aea |
| `apps/web/src/app/[locale]/products/[slug]/page.tsx` | 106 | 1bce39db1851 |
| `apps/web/src/app/[locale]/products/catalog/page.tsx` | 111 | f531227f62a4 |
| `apps/web/src/app/[locale]/products/page.tsx` | 115 | 6e33bcbf2bb2 |
| `apps/web/src/app/[locale]/shipping/[orderId]/page.tsx` | 417 | 3ea8610cbc41 |
| `apps/web/src/app/[locale]/template.tsx` | 18 | a386e0fcc2b7 |
| `apps/web/src/app/actions/auth.ts` | 134 | fd0c279a1268 |
| `apps/web/src/app/atelier.css` | 147 | 87462aa4f72f |
| `apps/web/src/app/auth/auth-code-error/page.tsx` | 51 | cdad77a65b5f |
| `apps/web/src/app/auth/callback/route.ts` | 69 | b26289350375 |
| `apps/web/src/app/auth/layout.tsx` | 47 | 6bae37c3ccd7 |
| `apps/web/src/app/brand.css` | 207 | be89f2a31980 |
| `apps/web/src/app/editorial.css` | 1263 | 6f1348bfda8e |
| `apps/web/src/app/globals.css` | 295 | 632e1c558558 |
| `apps/web/src/app/robots.ts` | 53 | 66259dd05dfb |
| `apps/web/src/app/sitemap.ts` | 76 | a5e5ddc9bd10 |
| `apps/web/src/components/ErrorBoundary.tsx` | 114 | 0fa2790eb026 |
| `apps/web/src/components/admin/AdminResourcePage.tsx` | 1345 | 4c08e23b9cf7 |
| `apps/web/src/components/admin/AdminStatusBadge.tsx` | 42 | 34e1009b632b |
| `apps/web/src/components/admin/CatalogImportDialog.tsx` | 710 | b0e98dd260a2 |
| `apps/web/src/components/admin/DashboardCharts.tsx` | 157 | b369d59d950f |
| `apps/web/src/components/admin/ImageUploader.tsx` | 224 | 4132d0c28e53 |
| `apps/web/src/components/admin/LogisticsReport.tsx` | 150 | f92f1ad3da22 |
| `apps/web/src/components/admin/OrderRow.tsx` | 102 | 333dc52f52cc |
| `apps/web/src/components/admin/ShipmentPreparationDialog.tsx` | 254 | c02683560fb2 |
| `apps/web/src/components/admin/admin-format.ts` | 7 | 48b166f387b4 |
| `apps/web/src/components/admin/admin-resources.ts` | 379 | 7aa5fe91d48d |
| `apps/web/src/components/admin/use-admin-list.ts` | 119 | b173f24bbcb2 |
| `apps/web/src/components/blog/BlogToolbar.tsx` | 102 | ff54a0f6b4fe |
| `apps/web/src/components/brand/BrandIdentity.tsx` | 56 | 970dcd76fb62 |
| `apps/web/src/components/chat/ChatMessage.tsx` | 131 | a7828c185ba2 |
| `apps/web/src/components/chat/ChatWidget.tsx` | 436 | 7fe7e83b91ec |
| `apps/web/src/components/chat/ProductRecommendationCard.tsx` | 56 | 5d9d5f1460ca |
| `apps/web/src/components/checkout/CheckoutUI.tsx` | 443 | 85be2502a2c1 |
| `apps/web/src/components/checkout/LocationSelector.tsx` | 201 | 2a0d52034a6a |
| `apps/web/src/components/checkout/ShippingQuotePanel.tsx` | 368 | c99df6350fde |
| `apps/web/src/components/checkout/checkout.css` | 686 | 3714fcdc59c7 |
| `apps/web/src/components/experience-lab/ExperienceLab.tsx` | 434 | b486d3171684 |
| `apps/web/src/components/experience-lab/PreviewCanvas.tsx` | 114 | 4aa1530bde2c |
| `apps/web/src/components/experience-lab/ReferencePanel.tsx` | 63 | 386675fd217f |
| `apps/web/src/components/experience-lab/createPreviewScene.ts` | 651 | ff1d9aac33bd |
| `apps/web/src/components/experience-lab/experience-lab.css` | 859 | 8af34d9000b1 |
| `apps/web/src/components/experience-lab/referenceModels.ts` | 224 | f67bdc506123 |
| `apps/web/src/components/experience-lab/types.ts` | 32 | 6080e72de3e9 |
| `apps/web/src/components/icons/AppIcon.tsx` | 286 | 38ffd2e17a1f |
| `apps/web/src/components/icons/BrandIcons.tsx` | 63 | acae90380bab |
| `apps/web/src/components/layout/AccountNavigation.tsx` | 19 | 3f05cf229f90 |
| `apps/web/src/components/layout/Header.tsx` | 97 | f2d37c76430e |
| `apps/web/src/components/layout/ScrollToTop.tsx` | 51 | 4c5e5caa5c51 |
| `apps/web/src/components/layout/TopBar.tsx` | 56 | 0df810b4ef9b |
| `apps/web/src/components/product/WishlistButton.tsx` | 31 | 495f6b4a9be3 |
| `apps/web/src/components/providers/AuthProvider.tsx` | 149 | d62231acabbb |
| `apps/web/src/components/providers/CartProvider.tsx` | 272 | d8802e761b87 |
| `apps/web/src/components/providers/MotionProvider.tsx` | 8 | 3f4316725d41 |
| `apps/web/src/components/providers/NetworkStatusProvider.tsx` | 78 | f38ba30b019a |
| `apps/web/src/components/providers/WishlistProvider.tsx` | 88 | ba96d1d4594e |
| `apps/web/src/components/reviews/ReviewForm.tsx` | 91 | a9bfeff1a4ac |
| `apps/web/src/components/reviews/ReviewList.tsx` | 54 | 00e5586e1e0e |
| `apps/web/src/components/reviews/ReviewStats.tsx` | 61 | 15a1a5351b70 |
| `apps/web/src/components/reviews/ReviewsSection.tsx` | 56 | 8973e270e5e2 |
| `apps/web/src/components/seo/BreadcrumbJsonLd.tsx` | 34 | 1b1e671c9e4e |
| `apps/web/src/components/seo/JsonLd.tsx` | 87 | 1b0cb6f7b798 |
| `apps/web/src/components/seo/ProductJsonLd.tsx` | 137 | 1fd2ea22ff54 |
| `apps/web/src/components/skeletons/HomeSkeleton.tsx` | 48 | e589267ae2b6 |
| `apps/web/src/components/traditional/TraditionalCartDrawer.tsx` | 150 | 9709ef2aed1e |
| `apps/web/src/components/traditional/TraditionalFooter.tsx` | 95 | f2c7afb9eab3 |
| `apps/web/src/components/traditional/TraditionalHeader.tsx` | 387 | a50540fb937d |
| `apps/web/src/components/traditional/TraditionalHome.tsx` | 154 | 0fd1879540d8 |
| `apps/web/src/components/traditional/TraditionalNotFound.tsx` | 93 | 701227b41029 |
| `apps/web/src/components/traditional/TraditionalOrderLookup.tsx` | 429 | 261b6088e664 |
| `apps/web/src/components/traditional/TraditionalProductCard.tsx` | 28 | e2abe58783c3 |
| `apps/web/src/components/traditional/TraditionalProductCatalog.tsx` | 280 | d154e2432a70 |
| `apps/web/src/components/traditional/TraditionalProductDetail.tsx` | 458 | 051e956713d5 |
| `apps/web/src/components/traditional/TraditionalProductFilter.tsx` | 93 | 3b53907d2782 |
| `apps/web/src/components/traditional/TraditionalProductGridItem.tsx` | 115 | 706cfbe16330 |
| `apps/web/src/components/traditional/TraditionalProductList.tsx` | 415 | f80771f60540 |
| `apps/web/src/components/traditional/TraditionalProductReviews.tsx` | 278 | 10df77a1435b |
| `apps/web/src/components/traditional/checkout/GuestCheckoutForm.tsx` | 203 | ca79bde32ea3 |
| `apps/web/src/components/traditional/checkout/TraditionalCheckout.tsx` | 260 | 31ec48535070 |
| `apps/web/src/components/traditional/checkout/TraditionalLocationSelector.tsx` | 261 | 8da0ae39b899 |
| `apps/web/src/components/traditional/home/HomeCollections.tsx` | 128 | 9d99882709a1 |
| `apps/web/src/components/traditional/home/HomeHero.tsx` | 167 | 487a80ec5ebf |
| `apps/web/src/components/traditional/home/HomeJourney.tsx` | 731 | e795c8d15cd6 |
| `apps/web/src/components/traditional/home/HomeProducts.tsx` | 242 | 309791619aaa |
| `apps/web/src/components/traditional/home/HomeStory.tsx` | 143 | 423f58f3523f |
| `apps/web/src/components/traditional/home/LandingTextMotion.tsx` | 110 | bd036b5dce77 |
| `apps/web/src/components/traditional/home/home-journey.css` | 947 | 1a86bd164d73 |
| `apps/web/src/components/traditional/tabs/TraditionalProductDescription.tsx` | 79 | f6c1f9c155ae |
| `apps/web/src/components/traditional/tabs/TraditionalProductSpecs.tsx` | 87 | f3eb722e1fad |
| `apps/web/src/components/traditional/tabs/TraditionalProductStory.tsx` | 69 | 97d329072d97 |
| `apps/web/src/components/ui/Pagination.tsx` | 136 | 7c860ecd6a5c |
| `apps/web/src/components/ui/ProcessingOrderOverlay.tsx` | 53 | fd0ce8fc0273 |
| `apps/web/src/components/ui/ProductImage.tsx` | 37 | 176b14552a24 |
| `apps/web/src/components/ui/ProductPrice.tsx` | 120 | 4576f3c091e0 |
| `apps/web/src/components/ui/ScrollReveal.tsx` | 76 | 5a0678678a73 |
| `apps/web/src/components/ui/SmoothScroll.tsx` | 69 | 1eef610d996c |
| `apps/web/src/components/ui/alert.tsx` | 205 | 1a29a3f525fc |
| `apps/web/src/components/ui/avatar.tsx` | 53 | e8672934f1c3 |
| `apps/web/src/components/ui/badge.tsx` | 46 | e7455feb113b |
| `apps/web/src/components/ui/button.tsx` | 64 | d55f478333e9 |
| `apps/web/src/components/ui/card.tsx` | 92 | 7ca4a69f63c8 |
| `apps/web/src/components/ui/carousel.tsx` | 263 | a057a6e7850a |
| `apps/web/src/components/ui/dialog.tsx` | 143 | bd07164f172a |
| `apps/web/src/components/ui/dropdown-menu.tsx` | 257 | e1564b091236 |
| `apps/web/src/components/ui/empty-state.tsx` | 31 | cf925edc4fb2 |
| `apps/web/src/components/ui/form.tsx` | 167 | a12f73507ab6 |
| `apps/web/src/components/ui/input.tsx` | 21 | 7fb69352242c |
| `apps/web/src/components/ui/label.tsx` | 24 | 9ec42c8a57e8 |
| `apps/web/src/components/ui/pagination.css` | 78 | 58f53c5b8f77 |
| `apps/web/src/components/ui/radio-group.tsx` | 45 | b12ca5cef859 |
| `apps/web/src/components/ui/scroll-area.tsx` | 58 | 1c5d0b242d05 |
| `apps/web/src/components/ui/select.tsx` | 190 | 71459423cd65 |
| `apps/web/src/components/ui/separator.tsx` | 28 | e9dddbd8dbbc |
| `apps/web/src/components/ui/sheet.tsx` | 139 | 3d6a560c635f |
| `apps/web/src/components/ui/skeleton.tsx` | 13 | f2aea81d8baf |
| `apps/web/src/components/ui/sonner.tsx` | 42 | 128dbaca3ca3 |
| `apps/web/src/components/ui/table.tsx` | 116 | 7b8c7a952cf4 |
| `apps/web/src/components/ui/tabs.tsx` | 66 | e8469e599381 |
| `apps/web/src/components/zen/ZenBlogDetail.tsx` | 181 | a79309ea2573 |
| `apps/web/src/components/zen/ZenBlogList.tsx` | 257 | 10c3cbec2cfd |
| `apps/web/src/components/zen/ZenCheckout.tsx` | 535 | bcafe0b69823 |
| `apps/web/src/components/zen/ZenFooter.tsx` | 54 | a3333d30f6e1 |
| `apps/web/src/components/zen/ZenHeader.tsx` | 73 | c9ec3d8fed48 |
| `apps/web/src/components/zen/ZenHome.tsx` | 150 | c1a9bdcd7cf0 |
| `apps/web/src/components/zen/ZenNotFound.tsx` | 94 | efeacc950c09 |
| `apps/web/src/components/zen/ZenOrderLookup.tsx` | 181 | 525fb726fff5 |
| `apps/web/src/components/zen/ZenOrderLookupDialog.tsx` | 157 | feecf5e7f35c |
| `apps/web/src/components/zen/ZenOrderSuccess.tsx` | 239 | 90ce1bb2d11c |
| `apps/web/src/components/zen/ZenProductCard.tsx` | 59 | ba5f65be5e2e |
| `apps/web/src/components/zen/ZenProductDetail.tsx` | 618 | a39a18b45afd |
| `apps/web/src/components/zen/ZenProductList.tsx` | 199 | 0688f0c0220b |
| `apps/web/src/components/zen/ZenSearchOverlay.tsx` | 243 | e5e0ced99af4 |
| `apps/web/src/hooks/use-on-click-outside.ts` | 27 | e7dc81455cd5 |
| `apps/web/src/hooks/useAnalytics.ts` | 21 | 67a05277564b |
| `apps/web/src/hooks/useCurrency.ts` | 28 | 4316ed990b20 |
| `apps/web/src/hooks/useDebounce.ts` | 17 | 4bbe0de53d76 |
| `apps/web/src/hooks/useProductDiscount.ts` | 73 | 644fc0bec4e6 |
| `apps/web/src/hooks/useShippingAvailability.ts` | 11 | a440c71a8a93 |
| `apps/web/src/i18n/request.ts` | 17 | d079662ce544 |
| `apps/web/src/i18n/routing.ts` | 15 | 442d9ee1d60b |
| `apps/web/src/lib/analytics.ts` | 27 | 375f4103df53 |
| `apps/web/src/lib/api-client.ts` | 246 | c008eb00ec12 |
| `apps/web/src/lib/constants.ts` | 1 | 1ac57e697dd0 |
| `apps/web/src/lib/error-handler.ts` | 196 | c7995e5b67df |
| `apps/web/src/lib/image-blur.ts` | 65 | c102c371358d |
| `apps/web/src/lib/motion.ts` | 84 | 3a2cf0461631 |
| `apps/web/src/lib/product-image-url.ts` | 20 | 2024671eaed1 |
| `apps/web/src/lib/sanitize-post.ts` | 16 | 356e59034135 |
| `apps/web/src/lib/supabase.ts` | 6 | a273d33527b9 |
| `apps/web/src/lib/types.ts` | 22 | a965ecb4825c |
| `apps/web/src/lib/upload.ts` | 125 | e5014d4a0828 |
| `apps/web/src/lib/utils.ts` | 6 | 7c8c3dfc0cdd |
| `apps/web/src/messages/en.json` | 5 | b7ff5214cec8 |
| `apps/web/src/messages/vi.json` | 5 | 36ada9507a99 |
| `apps/web/src/middleware.ts` | 101 | bea1e6b753da |
| `apps/web/src/scripts/qa-verify.js` | 70 | 4396158c2084 |
| `apps/web/src/services/auth-service.ts` | 20 | 10e0be9b2308 |
| `apps/web/src/services/base-http.ts` | 76 | 938b633bff75 |
| `apps/web/src/services/blog-service.ts` | 85 | e6b11b3c86fc |
| `apps/web/src/services/contact-service.ts` | 48 | 5d073905764e |
| `apps/web/src/services/order-service.ts` | 71 | ef6fc8df1c0d |
| `apps/web/src/services/product-service.ts` | 107 | 7c4adab4dc28 |
| `apps/web/src/services/review-service.ts` | 99 | d87f4ac5d943 |
| `apps/web/src/services/vouchers-service.ts` | 140 | a139a5c40e80 |
| `apps/web/src/services/wishlist-service.ts` | 27 | 826a2fb33df6 |
| `apps/web/src/types/blog.ts` | 21 | 4c45e2e0ad9a |
| `apps/web/src/types/contact.ts` | 10 | 052187765938 |
| `apps/web/src/types/order.ts` | 62 | b76a0d754a62 |
| `apps/web/src/types/product.ts` | 70 | efb2f4ef787f |
| `apps/web/src/types/review.ts` | 23 | d226625c9401 |
| `apps/web/src/types/user.ts` | 22 | f5f43d507ca6 |
| `apps/web/src/utils/supabase/server.ts` | 29 | a78ae2341a89 |
| `db/add_payment_fields.sql` | 17 | 46d9100d308c |
| `db/add_stock_column.sql` | 10 | 8b6e871e0902 |
| `db/advanced_search_indexes.sql` | 13 | 1bef4d381632 |
| `db/cart_schema.sql` | 29 | f31c227f41e9 |
| `db/categories.sql` | 38 | e0fa5531dcdb |
| `db/fix_missing_columns.sql` | 4 | da743faf7ef0 |
| `db/indexes.sql` | 23 | 0b0bc169b948 |
| `db/migrate_legacy_categories.sql` | 39 | c7328949dcb4 |
| `db/schema.sql` | 40 | 7b24bd89ae73 |
| `db/seed.sql` | 118 | 9ae5cee7c906 |
| `db/sync_existing_users.sql` | 14 | 6fbbb593e6c6 |
| `db/user_management.sql` | 66 | 740fd958a107 |

## Nest controllers/routes (global prefix /api)

Route authorization must be read with controller + method guards/decorators; path inventory alone does not certify RBAC.

### apps/api/src/admin/admin.controller.ts

Controller: `/admin`

- `GET /admin/operations`
- `GET /admin/resources/:resource/export`
- `GET /admin/resources/:resource`

### apps/api/src/admin/catalog-import.controller.ts

Controller: `/admin/import`

- `GET /admin/import/:resource/template`
- `POST /admin/import/:resource/preview`
- `POST /admin/import/:resource/row`

### apps/api/src/analytics/analytics.controller.ts

Controller: `/analytics`

- `GET /analytics/dashboard`

### apps/api/src/app.controller.ts

Controller: `/`

- `GET //`

### apps/api/src/cart/cart.controller.ts

Controller: `/cart`

- `GET /cart/`
- `POST /cart/merge`
- `POST /cart/items`
- `PATCH /cart/items/:id`
- `DELETE /cart/items/:id`

### apps/api/src/categories/categories.controller.ts

Controller: `/categories`

- `GET /categories/`
- `GET /categories/admin/list`
- `GET /categories/:id`
- `POST /categories/`
- `PATCH /categories/:id`
- `DELETE /categories/:id`

### apps/api/src/chat/chat.controller.ts

Controller: `/chat`

- `POST /chat/message`
- `POST /chat/stream`

### apps/api/src/contacts/contacts.controller.ts

Controller: `/contacts`

- `POST /contacts/`
- `GET /contacts/`
- `PATCH /contacts/:id`

### apps/api/src/merchant/merchant.controller.ts

Controller: `/merchant`

- `POST /merchant/sync`

### apps/api/src/orders/orders.controller.ts

Controller: `/orders`

- `POST /orders/lookup`
- `POST /orders/`
- `POST /orders/sepay-webhook`
- `GET /orders/`
- `GET /orders/me`
- `GET /orders/status/:id`
- `GET /orders/:id`
- `PATCH /orders/:id/status`

### apps/api/src/posts/posts.controller.ts

Controller: `/posts`

- `GET /posts/`
- `GET /posts/admin/list`
- `GET /posts/admin/:id`
- `GET /posts/:slug`
- `POST /posts/`
- `PATCH /posts/:id`
- `DELETE /posts/:id`

### apps/api/src/products/products.controller.ts

Controller: `/products`

- `GET /products/`
- `GET /products/admin/list`
- `GET /products/:slug`
- `GET /products/admin/:id`
- `POST /products/`
- `PATCH /products/:id`
- `DELETE /products/:id`
- `PATCH /products/bulk/update`
- `GET /products/data/export`

### apps/api/src/reviews/reviews.controller.ts

Controller: `/reviews`

- `POST /reviews/`
- `POST /reviews/seed`
- `GET /reviews/user/me`
- `GET /reviews/:productId`
- `DELETE /reviews/:id`

### apps/api/src/shipping/operations.controller.ts

Controller: `/admin/shipping`

- `GET /admin/shipping/staff`
- `POST /admin/shipping/exceptions/:id/assign`
- `POST /admin/shipping/shipments/:orderId/details`
- `POST /admin/shipping/orders/:orderId/prepare`
- `GET /admin/shipping/warehouses/:id/shifts`
- `GET /admin/shipping/`
- `POST /admin/shipping/configure`
- `POST /admin/shipping/shipments/:orderId`
- `POST /admin/shipping/shipments/:orderId/action`
- `POST /admin/shipping/shipments/:orderId/refresh`
- `GET /admin/shipping/shipments/:orderId`
- `GET /admin/shipping/pickup/:orderId/shifts`
- `POST /admin/shipping/pickup/:orderId/prepare`
- `POST /admin/shipping/pickup/:orderId/handover`
- `POST /admin/shipping/labels`
- `POST /admin/shipping/pickup/batch-handover`
- `POST /admin/shipping/returns/:id/review`
- `POST /admin/shipping/exceptions/:id/resolve`
- `POST /admin/shipping/cod/:orderId`
- `GET /admin/shipping/cod/:orderId`
- `POST /admin/shipping/tickets/:id/action`
- `GET /admin/shipping/analytics`
- `POST /admin/shipping/inbox/:id/retry`
- `POST /admin/shipping/jobs/drain`
- `POST /admin/shipping/jobs/reconcile`
- `GET /admin/shipping/support/:id`
- `POST /admin/shipping/returns`
- `POST /admin/shipping/support`
- `POST /admin/shipping/recommend`
- `POST /admin/shipping/support/:id/evidence`
- `GET /admin/shipping/support/:id/evidence/:index`

### apps/api/src/shipping/quote.controller.ts

Controller: `/shipping`

- `GET /shipping/providers`
- `POST /shipping/quote`
- `GET /shipping/warehouses`

### apps/api/src/shipping/shipping.controller.ts

Controller: `/shipping`

- `GET /shipping/status`
- `GET /shipping/addresses/provinces`
- `GET /shipping/addresses/wards`
- `GET /shipping/addresses/legacy/provinces`
- `GET /shipping/addresses/legacy/districts`
- `GET /shipping/addresses/legacy/wards`
- `POST /shipping/addresses/validate`

### apps/api/src/shipping/tracking.controller.ts

Controller: `/shipping`

- `GET /shipping/track/:orderId`
- `POST /shipping/webhooks/ghn`

### apps/api/src/storage/storage.controller.ts

Controller: `/storage`

- `POST /storage/upload/product-image`
- `DELETE /storage/delete/product-image`

### apps/api/src/users/users.controller.ts

Controller: `/users`

- `GET /users/profile`
- `PATCH /users/profile`
- `GET /users/`
- `GET /users/:id`
- `GET /users/:id/orders`
- `PATCH /users/:id/role`
- `PATCH /users/:id/ban`

### apps/api/src/vouchers/vouchers.controller.ts

Controller: `/vouchers`

- `POST /vouchers/validate`
- `GET /vouchers/`
- `GET /vouchers/:id`
- `POST /vouchers/`
- `PATCH /vouchers/:id`
- `DELETE /vouchers/:id`

### apps/api/src/wishlist/wishlist.controller.ts

Controller: `/wishlist`

- `POST /wishlist/toggle`
- `GET /wishlist/`
- `GET /wishlist/ids`

## Environment key names only

### apps/api

`API_URL`, `CORS_ORIGIN`, `FRONTEND_URL`, `GEMINI_API_KEY`, `GHN_ENABLED`, `GHN_ENV`, `GHN_READ_RETRIES`, `GHN_SHOP_ID`, `GHN_TIMEOUT_MS`, `GHN_TOKEN`, `GHN_WEBHOOK_SECRET`, `GOOGLE_CLIENT_EMAIL`, `GOOGLE_MERCHANT_ID`, `GOOGLE_PRIVATE_KEY`, `JWT_SECRET`, `MAIL_ADMIN_ADDRESS`, `MAIL_FROM`, `MAIL_HOST`, `MAIL_PASSWORD`, `MAIL_USER`, `NODE_ENV`, `PORT`, `SEPAY_ACCOUNT_NUMBER`, `SEPAY_API_KEY`, `SHIPPING_CHECKOUT_ENABLED`, `SHIPPING_FULFILLMENT_ENABLED`, `SHIPPING_JOBS_ENABLED`, `SUPABASE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`

### apps/web

`API_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_BANK_ACC`, `NEXT_PUBLIC_BANK_CODE`, `NEXT_PUBLIC_BANK_NAME`, `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NODE_ENV`, `PORT`, `SUPABASE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`

## Schema declarations (repository only)

- `apps/api/database/01_reviews_table.sql`: TABLE `reviews`, POLICY `"Public`, POLICY `"Users`, POLICY `"Users`, POLICY `"Users`, EXTENSION `moddatetime;`, TRIGGER `handle_updated_at`
- `apps/api/database/02_fix_reviews_fk.sql`: 
- `apps/api/database/03_reviews_seed_columns.sql`: POLICY `"Admins`
- `apps/api/database/04_add_user_address_columns.sql`: POLICY `"Users`
- `apps/api/database/05_create_wishlist_table.sql`: TABLE `wishlists`, POLICY `"Users`, POLICY `"Users`, POLICY `"Users`
- `apps/api/database/06_add_payment_deadline.sql`: 
- `apps/api/migrations/add-product-discounts.sql`: function `to`, FUNCTION `calculate_final_price`
- `apps/api/migrations/admin-catalog-import.sql`: TABLE `public.admin_catalog_imports`, FUNCTION `public.admin_import_catalog_row`
- `apps/api/migrations/admin-order-integrity.sql`: FUNCTION `public.enforce_order_transition`, TRIGGER `enforce_order_transition`, FUNCTION `public.transition_order`
- `apps/api/migrations/shipping-evidence-storage.sql`: POLICY `shipping_evidence_server_only`
- `apps/api/migrations/smart-logistics.sql`: TABLE `public.shipping_records`, TABLE `public.shipping_tracking`, POLICY `shipping_tracking_owner`, FUNCTION `public.shipping_write_record`, FUNCTION `public.shipping_reserve_shipment`, FUNCTION `public.shipping_attach_snapshot`, FUNCTION `public.shipping_complete_cod`, FUNCTION `public.shipping_guard_order_cancel`, TRIGGER `shipping_guard_order_cancel`, FUNCTION `public.shipping_alert_paid_cod`, TRIGGER `shipping_alert_paid_cod`
- `apps/api/supabase/migration_add_cart_variant.sql`: 
- `apps/api/supabase/migration_add_category_id.sql`: 
- `apps/api/supabase/migration_add_featured.sql`: 
- `apps/api/supabase/migration_add_featured_section.sql`: 
- `apps/api/supabase/migration_add_original_price.sql`: 
- `apps/api/supabase/migration_add_variants.sql`: 
- `apps/api/supabase/migration_blog_init.sql`: table `public.posts`, policy `"Public`, policy `"Admins`, policy `"Admins`, policy `"Admins`
- `apps/api/supabase/migration_contact_init.sql`: TABLE `public.contacts`, POLICY `"Public`, POLICY `"Admins`, POLICY `"Admins`
- `apps/api/supabase/migration_optimization.sql`: 
- `apps/api/supabase/schema.sql`: table `categories`, table `category_translations`, table `products`, table `product_translations`, policy `"Public`, policy `"Public`
- `apps/api/supabase/seed_blog.sql`: 
- `db/add_payment_fields.sql`: 
- `db/add_stock_column.sql`: 
- `db/advanced_search_indexes.sql`: EXTENSION `pg_trgm;`
- `db/cart_schema.sql`: table `public.cart_items`, policy `"Users`, policy `"Users`, policy `"Users`, policy `"Users`
- `db/categories.sql`: table `public.categories`, table `public.category_translations`, policy `"Public`, policy `"Public`
- `db/fix_missing_columns.sql`: 
- `db/indexes.sql`: 
- `db/migrate_legacy_categories.sql`: 
- `db/schema.sql`: extension `"uuid-ossp";`, table `public.products`, table `public.product_translations`, policy `"Public`, policy `"Public`
- `db/seed.sql`: 
- `db/sync_existing_users.sql`: 
- `db/user_management.sql`: table `public.users`, policy `"Public`, policy `"Users`, policy `"Users`, function `public.handle_new_user`, trigger `on_auth_user_created`, function `public.handle_user_update`, trigger `on_auth_user_updated`
