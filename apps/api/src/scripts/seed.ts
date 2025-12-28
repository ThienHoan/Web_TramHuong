import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Load env from root (../../../../.env)
dotenv.config({ path: join(__dirname, '../../../../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY/SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CATEGORIES = [
    {
        slug: 'nhang-bot',
        translations: [
            { locale: 'vi', name: 'Nhang & Bột trầm', description: 'Nhang có tăm, không tăm và các loại bột trầm nguyên chất.' },
            { locale: 'en', name: 'Incense & Powder', description: 'Stickless incense, bamboo incense, and pure agarwood powder.' }
        ]
    },
    {
        slug: 'nu-tram',
        translations: [
            { locale: 'vi', name: 'Nụ xông', description: 'Nụ trầm, nụ quế và các loại nụ thảo dược.' },
            { locale: 'en', name: 'Incense Cones', description: 'Agarwood cones, cinnamon cones, and herbal blends.' }
        ]
    },
    {
        slug: 'phu-kien',
        translations: [
            { locale: 'vi', name: 'Phụ kiện xông trầm', description: 'Lư xông, thác khói, dụng cụ thưởng trầm.' },
            { locale: 'en', name: 'Accessories', description: 'Burners, backflow falls, and incense tools.' }
        ]
    },
    {
        slug: 'qua-tang',
        translations: [
            { locale: 'vi', name: 'Set quà tặng', description: 'Các bộ quà tặng sang trọng dùng để biếu tặng.' },
            { locale: 'en', name: 'Gift Sets', description: 'Premium gift boxes and ceremonial sets.' }
        ]
    }
];

const PRODUCTS = [
    {
        slug: 'kyara-bracelet',
        price: 1200,
        images: ['https://images.unsplash.com/photo-1611591437281-460bfbe1220a?q=80&w=800&auto=format&fit=crop'],
        style_affinity: 'both',
        is_active: true,
        categorySlug: 'qua-tang', // Example mapping
        translations: [
            {
                locale: 'en',
                title: 'Kyara Wood Bracelet',
                description: 'A touch of ancient forestry on your wrist.',
                story: 'In the depth of the forest, where silence speaks, the Kyara wood absorbs the essence of time. Providing clarity and calm to the wearer.',
                specifications: 'Origin: Vietnam. Grade: AAA. Bead size: 12mm. Weight: 24g.',
            },
            {
                locale: 'vi',
                title: 'Vòng Tay Trầm Hương Kỳ Nam',
                description: 'Vòng tay cao cấp mang lại may mắn và bình an.',
                story: 'Hương thơm vĩnh cửu từ rừng già, mang lại sự tĩnh tại cho tâm hồn.',
                specifications: 'Xuất xứ: Việt Nam. Phân hạng: AAA. Kích thước hạt: 12mm. Trọng lượng: 24g.',
            }
        ]
    },
    {
        slug: 'incense-burner',
        price: 450,
        images: ['https://images.unsplash.com/photo-1629196914168-3a9644338cfc?q=80&w=800&auto=format&fit=crop'],
        style_affinity: 'zen',
        is_active: true,
        categorySlug: 'phu-kien',
        translations: [
            {
                locale: 'en',
                title: 'Minimalist Incense Burner',
                description: 'Simple design for pure focus.',
                story: 'Crafted from ceramic with a matte finish, this burner directs the smoke straight up, symbolizing the ascent of thoughts.',
                specifications: 'Material: Ceramic. Color: Matte Black. Height: 10cm.',
            },
            {
                locale: 'vi',
                title: 'Lư Xông Trầm Tối Giản',
                description: 'Thiết kế đơn giản cho sự tập trung tuyệt đối.',
                story: 'Làm từ gốm sứ với lớp men mờ, lư xông này dẫn khói bay thẳng lên, tượng trưng cho sự thăng hoa của suy nghĩ.',
                specifications: 'Chất liệu: Gốm. Màu: Đen mờ. Chiều cao: 10cm.',
            }
        ]
    }
];

async function seed() {


    // 1. Seed Categories
    const categoryMap = new Map<string, string>(); // slug -> uuid

    for (const cat of CATEGORIES) {

        const { data: catData, error: catError } = await supabase
            .from('categories')
            .upsert({ slug: cat.slug, is_active: true }, { onConflict: 'slug' })
            .select()
            .single();

        if (catError) {
            console.error('Error upserting category:', catError);
            continue;
        }

        categoryMap.set(cat.slug, catData.id);

        // Seed Category Translations
        for (const t of cat.translations) {
            await supabase.from('category_translations').upsert({
                category_id: catData.id,
                locale: t.locale,
                name: t.name,
                description: t.description
            }, { onConflict: 'category_id,locale' });
        }
    }

    // 2. Seed Products
    for (const p of PRODUCTS) {


        const categoryId = categoryMap.get(p.categorySlug);

        // Upsert Product
        const { data: productData, error: productError } = await supabase
            .from('products')
            .upsert({
                slug: p.slug,
                price: p.price,
                images: p.images,
                style_affinity: p.style_affinity,
                is_active: p.is_active,
                category_id: categoryId // Now linking via UUID
            }, { onConflict: 'slug' })
            .select()
            .single();

        if (productError) {
            console.error('Error inserting product:', productError);
            continue;
        }

        const productId = productData.id;

        // Upsert Translations
        for (const t of p.translations) {
            const { error: transError } = await supabase
                .from('product_translations')
                .upsert({
                    product_id: productId,
                    locale: t.locale,
                    title: t.title,
                    description: t.description,
                    story: t.story,
                    specifications: t.specifications,
                }, { onConflict: 'product_id,locale' });

            if (transError) console.error(`Error translating ${t.locale}:`, transError);
        }
    }


}

seed();
