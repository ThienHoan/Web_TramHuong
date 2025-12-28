-- Seed a sample post
INSERT INTO public.posts (
  slug, 
  title, 
  excerpt, 
  content, 
  cover_image, 
  category, 
  status, 
  is_featured,
  created_at
) VALUES (
  'nghe-thuat-thuong-tram',
  'Nghệ Thuật Thưởng Trầm: Tinh Hoa Văn Hóa Việt',
  'Khám phá quy trình tỉ mỉ để tạo nên những nén hương trầm tinh khiết, từ việc chọn gỗ dó bầu đến bí quyết ủ hương gia truyền hàng trăm năm tuổi.',
  '<p>Từ ngàn xưa, Trầm hương đã được xem là "Vua của các mùi hương", là linh khí của đất trời hội tụ. Không chỉ đơn thuần là một loại hương liệu, trầm còn mang trong mình những giá trị văn hóa và tâm linh sâu sắc của người Việt.</p><h2>Nguồn Gốc Của Sự Linh Thiêng</h2><p>Người xưa kể lại rằng, Trầm hương được hình thành từ những vết thương của cây Dó Bầu. Trải qua bao mưa nắng...</p>',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAjpI46czt_NuaGDbe57x_bqov9xxVif5k6-Qs0X4BSGfpIyqwT2EtY4fN-EU0QSV4OdoWjPLzwO1I6Pw-TBHoxs6P1ey6k4kPya19SFZoPL93jjk6m_9dNNA5UVb6dCQHT9NAGSs0Kg--4yPoC_ORodoNZ1p5PbW_uGdzq-btUDedy1Hov0ScsX9ZfBiJj_1Gi8w1JKn9tz3kBp7QrCPOCYzrqD1qSUOpwJTRfp5q6WzlfLvFSZ0aJbVVurAS5OPMg-5_v-JOdZ52G',
  'knowledge',
  'published',
  true,
  NOW()
);

INSERT INTO public.posts (
  slug, 
  title, 
  excerpt, 
  content, 
  cover_image, 
  category, 
  status, 
  is_featured,
  created_at
) VALUES (
  'loi-ich-xong-tram',
  'Lợi Ích Của Việc Xông Trầm Đối Với Sức Khỏe',
  'Khoa học đã chứng minh hương trầm giúp giảm stress, cải thiện giấc ngủ và tăng cường khả năng tập trung như thế nào?',
  '<p>Hương trầm giúp thư giãn thần kinh, giảm căng thẳng...</p>',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBvadcI9uqXNtmlqEkObM3ElW4LjjCfnLYsggWhYV4vk90o0bVnEbK2FOQPhheqLPK6KrGem8_LaFD6QOR8b26EpVPo3W1fQsTq0YtiSNiVAUU4mhRdSWcd4bSr1Fr0ZStTzXcfIXLWFWnuGoxaolBgHL8ZlyRlUqX5DSVPD94cC3TPHDSoTIPaJwHJqSPgSDFjb5qeZpirAEZDHRMRcC864mCYzYw3icGnqIRZNns6s8GPR47soL_BPH0mXKV7SQpSNxBWAaeW83tP',
  'health',
  'published',
  false,
  NOW()
);
