"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv = __importStar(require("dotenv"));
const path_1 = require("path");
dotenv.config({ path: (0, path_1.join)(__dirname, '../../.env') });
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY/SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
}
const supabase = (0, supabase_js_1.createClient)(SUPABASE_URL, SUPABASE_KEY);
const PRODUCTS = [
    {
        slug: 'kyara-bracelet',
        price: 1200,
        images: ['https://images.unsplash.com/photo-1611591437281-460bfbe1220a?q=80&w=800&auto=format&fit=crop'],
        style_affinity: 'both',
        is_active: true,
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
    console.log('🌱 Starting Seed...');
    for (const p of PRODUCTS) {
        console.log(`Processing ${p.slug}...`);
        const { data: productData, error: productError } = await supabase
            .from('products')
            .upsert({
            slug: p.slug,
            price: p.price,
            images: p.images,
            style_affinity: p.style_affinity,
            is_active: p.is_active
        }, { onConflict: 'slug' })
            .select()
            .single();
        if (productError) {
            console.error('Error inserting product:', productError);
            continue;
        }
        const productId = productData.id;
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
            if (transError)
                console.error(`Error translating ${t.locale}:`, transError);
        }
    }
    console.log('✅ Seed Complete!');
}
seed();
//# sourceMappingURL=seed.js.map