-- SAMPLE DATA SEEDING
-- Run this in your Supabase SQL Editor to populate the database.

-- 1. Product: 108 Bead Mala (Vòng Tay 108 Hạt)
-- We use a temporary variable loop or just direct inserts with specific UUIDs to easier reference foreign keys.
-- For simplicity in SQL Editor, we can use a CTE or just hardcoded UUIDs.

DO $$
DECLARE
    product_mala_id UUID := gen_random_uuid();
    product_pendant_id UUID := gen_random_uuid();
    product_incense_id UUID := gen_random_uuid();
BEGIN
    -- ---------------------------------------------------------
    -- PRODUCT 1: 108 Bead Mala (High End)
    -- ---------------------------------------------------------
    INSERT INTO public.products (id, slug, price, images, style_affinity)
    VALUES (
        product_mala_id,
        '108-bead-mala-premium',
        15000000, -- 15,000,000 VND
        '["https://images.unsplash.com/photo-1620783770629-122b78e8c157?q=80&w=600&auto=format&fit=crop", "https://images.unsplash.com/photo-1590502593747-42a996133562?q=80&w=600&auto=format&fit=crop"]'::jsonb,
        'both'
    );

    -- EN Translation
    INSERT INTO public.product_translations (product_id, locale, title, description, story, specifications)
    VALUES (
        product_mala_id,
        'en',
        '108-Bead Premium Agarwood Mala',
        'A meditation tool of rare purity.',
        'Crafted from 30-year-old Ant Kiến Agarwood. Each bead is a step towards silence. The scent is subtle, like a monk''s whisper in an ancient temple. This is not jewelry; it is a companion for your inner journey.',
        '{"Origin": "Khanh Hoa, Vietnam", "Age": "30 Years", "Bead Size": "6mm", "Scent Profile": "Sweet, Milky, Deep"}'::jsonb
    );

    -- VI Translation
    INSERT INTO public.product_translations (product_id, locale, title, description, story, specifications)
    VALUES (
        product_mala_id,
        'vi',
        'Chuỗi Trầm Hương 108 Hạt Cao Cấp',
        'Vật phẩm thiền định, tinh tấn.',
        'Được chế tác từ Trầm Kiến 30 năm tuổi tịch mịch rừng già. Hương thơm sâu, ngọt hậu, giúp định tâm an thần. Mỗi hạt chuỗi là một niệm lành.',
        '{"Nguồn gốc": "Khánh Hòa", "Tuổi trầm": "30 năm", "Kích thước hạt": "6mm", "Mùi hương": "Ngọt, sữa, sâu"}'::jsonb
    );


    -- ---------------------------------------------------------
    -- PRODUCT 2: Bamboo Leaf Pendant (Mặt Dây Chuyền Lá Tre)
    -- ---------------------------------------------------------
    INSERT INTO public.products (id, slug, price, images, style_affinity)
    VALUES (
        product_pendant_id,
        'agarwood-pendant-bamboo',
        5500000, -- 5,500,000 VND
        '["https://images.unsplash.com/photo-1611085583191-a3b181a88401?q=80&w=600&auto=format&fit=crop"]'::jsonb,
        'zen' -- More affinity to Zen style
    );

    -- EN Translation
    INSERT INTO public.product_translations (product_id, locale, title, description, story, specifications)
    VALUES (
        product_pendant_id,
        'en',
        'Bamboo Leaf Agarwood Pendant',
        'Nature worn close to the heart.',
        'Carved in the shape of a bamboo leaf, symbolizing resilience and grace. The oil veins run through it like rivers on a map of serenity.',
        '{"Origin": "Quang Nam", "Carving": "Hand-carved", "Material": "Natural Agarwood"}'::jsonb
    );

    -- VI Translation
    INSERT INTO public.product_translations (product_id, locale, title, description, story, specifications)
    VALUES (
        product_pendant_id,
        'vi',
        'Mặt Dây Chuyền Trầm Hương Lá Tre',
        'Vẻ đẹp thiên nhiên thuần khiết.',
        'Hình tượng lá trúc thanh tao, biểu tượng của người quân tử. Vân dầu tự nhiên trải dài, mùi hương nhẹ nhàng thoang thoảng bên người.',
        '{"Nguồn gốc": "Quảng Nam", "Chế tác": "Điêu khắc thủ công", "Chất liệu": "Trầm tốc kiến"}'::jsonb
    );


    -- ---------------------------------------------------------
    -- PRODUCT 3: Premium Incense (Nhang Trầm Không Tăm)
    -- ---------------------------------------------------------
    INSERT INTO public.products (id, slug, price, images, style_affinity)
    VALUES (
        product_incense_id,
        'premium-incense-stick',
        850000, -- 850,000 VND
        '["https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?q=80&w=600&auto=format&fit=crop"]'::jsonb,
        'traditional' -- More traditional usage
    );

    -- EN Translation
    INSERT INTO public.product_translations (product_id, locale, title, description, story, specifications)
    VALUES (
        product_incense_id,
        'en',
        'Premium Agarwood Incense (No Core)',
        'Pure fragrance for sacred spaces.',
        'Made from 100% pure agarwood powder, no bamboo core, no chemical binders. Just the pure essence of the wood released into the air.',
        '{"Quantity": "40 sticks", "Burn Time": "30 mins/stick", "Ingredients": "100% Agarwood"}'::jsonb
    );

    -- VI Translation
    INSERT INTO public.product_translations (product_id, locale, title, description, story, specifications)
    VALUES (
        product_incense_id,
        'vi',
        'Nhang Trầm Hương Không Tăm Thượng Hạng',
        'Hương thơm thanh tịnh cho không gian thờ cúng.',
        'Làm từ 100% bột trầm hương nguyên chất, không tăm tre, không hoá chất. Giữ trọn vẹn hương thơm nguyên bản của gỗ.',
        '{"Số lượng": "40 que", "Thời gian cháy": "30 phút/que", "Thành phần": "100% Bột Trầm"}'::jsonb
    );

END $$;
