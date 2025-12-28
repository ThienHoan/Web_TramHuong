< !DOCTYPE html >

    <html class="light" lang="vi"><head>
        <meta charset="utf-8" />
        <meta content="width=device-width, initial-scale=1.0" name="viewport" />
        <title>Thư Viện Hương Trầm - Trầm Hương Thiên Phúc</title>
        <link href="https://fonts.googleapis.com" rel="preconnect" />
        <link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,100..900;1,100..900&amp;family=Noto+Sans:ital,wght@0,100..900;1,100..900&amp;display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet" />
        <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
        <script id="tailwind-config">
            tailwind.config = {
                darkMode: "class",
            theme: {
                extend: {
                colors: {
                "primary": "#ec7f13",
            "primary-dark": "#b05d0e",
            "background-light": "#fcfaf8",
            "background-dark": "#221910",
            "text-dark": "#1b140d",
            "text-light": "#9a734c",
            "cream": "#fffdf5",
          },
            fontFamily: {
                "display": ['"Noto Serif"', "serif"],
            "sans": ['"Noto Sans"', "sans-serif"],
          },
            borderRadius: {"DEFAULT": "0.5rem", "lg": "1rem", "xl": "1.5rem", "full": "9999px"},
            backgroundImage: {
                'pattern': "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ec7f13' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          }
        },
      },
    }
        </script>
        <style>
    /* Custom scrollbar for webkit browsers */
            ::-webkit-scrollbar {
                width: 8px;
    }
            ::-webkit-scrollbar-track {
                background: #f3ede7;
    }
            ::-webkit-scrollbar-thumb {
                background: #d4bda5;
            border-radius: 4px;
    }
            ::-webkit-scrollbar-thumb:hover {
                background: #ec7f13;
    }
        </style>
    </head>
        <body class="bg-background-light dark:bg-background-dark text-text-dark font-display antialiased">
            <!-- Header / Navigation -->
            <div class="relative flex h-auto w-full flex-col bg-background-light group/design-root overflow-x-hidden border-b border-[#f3ede7]">
                <div class="layout-container flex h-full grow flex-col">
                    <div class="w-full flex justify-center">
                        <div class="layout-content-container flex flex-col max-w-[1200px] flex-1">
                            <header class="flex items-center justify-between whitespace-nowrap px-4 py-4 lg:px-10">
                                <div class="flex items-center gap-4 lg:gap-8">
                                    <a class="flex items-center gap-3 text-text-dark hover:text-primary transition-colors" href="#">
                                        <div class="size-8 text-primary">
                                            <span class="material-symbols-outlined text-[32px]">spa</span>
                                        </div>
                                        <h2 class="text-text-dark text-xl lg:text-2xl font-bold leading-tight tracking-[-0.015em] hidden sm:block">Trầm Hương Thiên Phúc</h2>
                                    </a>
                                    <div class="hidden lg:flex items-center gap-8">
                                        <a class="text-text-dark hover:text-primary transition-colors text-sm font-bold leading-normal" href="#">Trang Chủ</a>
                                        <a class="text-text-dark hover:text-primary transition-colors text-sm font-bold leading-normal" href="#">Sản Phẩm</a>
                                        <a class="text-primary text-sm font-bold leading-normal border-b-2 border-primary" href="#">Thư Viện Hương Trầm</a>
                                        <a class="text-text-dark hover:text-primary transition-colors text-sm font-bold leading-normal" href="#">Về Chúng Tôi</a>
                                        <a class="text-text-dark hover:text-primary transition-colors text-sm font-bold leading-normal" href="#">Liên Hệ</a>
                                    </div>
                                </div>
                                <div class="flex flex-1 justify-end gap-4 lg:gap-8 items-center">
                                    <div class="hidden md:flex flex-col min-w-40 h-10 max-w-64">
                                        <div class="flex w-full flex-1 items-stretch rounded-xl h-full border border-[#e6dccf] focus-within:border-primary transition-colors">
                                            <div class="text-text-light flex border-none bg-transparent items-center justify-center pl-3 rounded-l-xl">
                                                <span class="material-symbols-outlined text-[20px]">search</span>
                                            </div>
                                            <input class="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-text-dark focus:outline-0 focus:ring-0 border-none bg-transparent focus:border-none h-full placeholder:text-text-light px-3 pl-2 text-sm font-normal leading-normal font-sans" placeholder="Tìm kiếm..." value="" />
                                        </div>
                                    </div>
                                    <div class="flex gap-2">
                                        <button class="hidden sm:flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 px-4 bg-primary hover:bg-primary-dark transition-colors text-white text-sm font-bold leading-normal shadow-sm">
                                            <span class="truncate">Đăng Nhập</span>
                                        </button>
                                        <button class="flex size-10 cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-[#f3ede7] hover:bg-[#e6dccf] transition-colors text-text-dark relative">
                                            <span class="material-symbols-outlined text-[20px]">shopping_cart</span>
                                            <span class="absolute top-2 right-2 size-2 bg-primary rounded-full"></span>
                                        </button>
                                        <button class="lg:hidden flex size-10 cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-[#f3ede7] hover:bg-[#e6dccf] text-text-dark">
                                            <span class="material-symbols-outlined text-[24px]">menu</span>
                                        </button>
                                    </div>
                                </div>
                            </header>
                        </div>
                    </div>
                </div>
            </div>
            <!-- Breadcrumbs -->
            <div class="w-full flex justify-center bg-cream/50 pt-6">
                <div class="max-w-[1200px] w-full px-4 lg:px-10">
                    <div class="flex flex-wrap gap-2 items-center text-sm">
                        <a class="text-text-light hover:text-primary transition-colors font-medium leading-normal" href="#">Trang Chủ</a>
                        <span class="material-symbols-outlined text-[14px] text-text-light">chevron_right</span>
                        <span class="text-text-dark font-medium leading-normal">Thư Viện Hương Trầm</span>
                    </div>
                </div>
            </div>
            <!-- Page Heading & Intro -->
            <div class="w-full flex justify-center bg-cream/50 py-8 lg:py-12 bg-pattern">
                <div class="max-w-[1200px] w-full px-4 lg:px-10">
                    <div class="flex flex-col gap-4 text-center items-center">
                        <h1 class="text-text-dark text-4xl lg:text-5xl font-black leading-tight tracking-[-0.02em] text-[#5c3a21]">Thư Viện Hương Trầm</h1>
                        <div class="w-24 h-1 bg-primary rounded-full mb-2"></div>
                        <p class="text-text-light text-lg lg:text-xl font-normal leading-relaxed max-w-2xl font-sans italic">
                            "Nơi Câu Chuyện Khởi Nguồn - Khám phá những câu chuyện sâu sắc về văn hóa, sức khỏe và nghệ thuật thưởng trầm truyền thống."
                        </p>
                    </div>
                </div>
            </div>
            <!-- Main Content Layout -->
            <div class="w-full flex justify-center py-8 lg:py-12">
                <div class="max-w-[1200px] w-full px-4 lg:px-10 flex flex-col gap-12">
                    <!-- Featured Article (Highlight Chapter) -->
                    <section class="w-full">
                        <div class="flex flex-col lg:flex-row items-stretch overflow-hidden rounded-2xl bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-[#f3ede7] hover:shadow-[0_8px_30px_rgba(236,127,19,0.1)] transition-all duration-300 group">
                            <div class="w-full lg:w-3/5 bg-gray-200 relative overflow-hidden min-h-[300px] lg:min-h-[400px]">
                                <div class="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105" data-alt="Silk painting style illustration of traditional agarwood incense making process with intricate details" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuAjpI46czt_NuaGDbe57x_bqov9xxVif5k6-Qs0X4BSGfpIyqwT2EtY4fN-EU0QSV4OdoWjPLzwO1I6Pw-TBHoxs6P1ey6k4kPya19SFZoPL93jjk6m_9dNNA5UVb6dCQHT9NAGSs0Kg--4yPoC_ORodoNZ1p5PbW_uGdzq-btUDedy1Hov0ScsX9ZfBiJj_1Gi8w1JKn9tz3kBp7QrCPOCYzrqD1qSUOpwJTRfp5q6WzlfLvFSZ0aJbVVurAS5OPMg-5_v-JOdZ52G');"></div>
                                <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-black/10"></div>
                                <div class="absolute top-4 left-4 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Bài Viết Nổi Bật</div>
                            </div>
                            <div class="w-full lg:w-2/5 flex flex-col justify-center p-6 lg:p-10 gap-4 bg-white relative">
                                <div class="absolute -left-3 top-1/2 w-6 h-6 bg-white rotate-45 hidden lg:block"></div>
                                <div class="flex items-center gap-2 text-text-light text-sm font-sans mb-1">
                                    <span class="material-symbols-outlined text-[16px]">calendar_today</span>
                                    <span>12 Tháng 10, 2023</span>
                                    <span class="mx-1">•</span>
                                    <span class="material-symbols-outlined text-[16px]">person</span>
                                    <span>Nguyễn Văn A</span>
                                </div>
                                <h2 class="text-text-dark text-2xl lg:text-3xl font-bold leading-tight group-hover:text-primary transition-colors">
                                    <a href="#">Nghệ Thuật Thưởng Trầm: Tinh Hoa Văn Hóa Việt</a>
                                </h2>
                                <p class="text-[#6b5847] text-base leading-relaxed line-clamp-4 font-sans">
                                    Khám phá quy trình tỉ mỉ để tạo nên những nén hương trầm tinh khiết, từ việc chọn gỗ dó bầu đến bí quyết ủ hương gia truyền hàng trăm năm tuổi. Mỗi nén hương là một câu chuyện về lòng thành kính và nghệ thuật thủ công tuyệt đỉnh.
                                </p>
                                <div class="pt-4">
                                    <a class="inline-flex items-center gap-2 text-primary font-bold uppercase tracking-wide text-sm hover:gap-3 transition-all" href="#">
                                        Đọc Tiếp
                                        <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </section>
                    <!-- Toolbar: Search & Filter -->
                    <section class="sticky top-0 z-20 py-4 -my-4 bg-background-light/95 backdrop-blur-sm border-b border-[#f3ede7]">
                        <div class="flex flex-col md:flex-row gap-4 justify-between items-center">
                            <div class="flex overflow-x-auto pb-2 md:pb-0 gap-2 w-full md:w-auto no-scrollbar mask-gradient">
                                <button class="whitespace-nowrap px-4 py-2 bg-primary text-white rounded-full text-sm font-bold shadow-md transition-transform active:scale-95">Tất Cả</button>
                                <button class="whitespace-nowrap px-4 py-2 bg-[#f3ede7] text-text-dark hover:bg-[#e6dccf] rounded-full text-sm font-medium transition-colors">Kiến Thức Trầm Hương</button>
                                <button class="whitespace-nowrap px-4 py-2 bg-[#f3ede7] text-text-dark hover:bg-[#e6dccf] rounded-full text-sm font-medium transition-colors">Văn Hóa &amp; Tâm Linh</button>
                                <button class="whitespace-nowrap px-4 py-2 bg-[#f3ede7] text-text-dark hover:bg-[#e6dccf] rounded-full text-sm font-medium transition-colors">Sức Khỏe &amp; Đời Sống</button>
                                <button class="whitespace-nowrap px-4 py-2 bg-[#f3ede7] text-text-dark hover:bg-[#e6dccf] rounded-full text-sm font-medium transition-colors">Góc Nhìn Nghệ Nhân</button>
                            </div>
                            <div class="flex items-center gap-3 w-full md:w-auto">
                                <div class="relative w-full md:w-64">
                                    <span class="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-text-light text-[20px]">search</span>
                                    <input class="w-full pl-10 pr-4 py-2 rounded-lg border border-[#e6dccf] bg-white focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm font-sans transition-all" placeholder="Tìm kiếm bài viết..." type="text" />
                                </div>
                                <button class="p-2 border border-[#e6dccf] rounded-lg bg-white text-text-dark hover:text-primary hover:border-primary transition-colors" title="Lọc">
                                    <span class="material-symbols-outlined text-[20px]">filter_list</span>
                                </button>
                            </div>
                        </div>
                    </section>
                    <!-- Chronicle Entries (Blog Grid) -->
                    <section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <!-- Post 1 -->
                        <article class="flex flex-col h-full bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-[#f3ede7] group">
                            <div class="relative aspect-[4/3] overflow-hidden">
                                <div class="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" data-alt="Close up of agarwood incense smoke rising in a tranquil room" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuBojGuDxVYRjfa0LZLYSJJ6Df9v5mmJZMBEYM-YsKW8TOg42m0jxEqzvJ2nafQFXj_zi7TUAbGthDCAht8TKk0p6RdTBlvglSHkxmYXKFTvQwKTuIc0vobBsfQ4NPBD1RSalbL3x0bi1wdVr_zf0ESZoI9K7qRQDuGCObRw6vD40Q2Yq9dZzGVuqOynaMx7TcrKaxs0orbZnjxpeQPiW-l6FvNJUYGcoTSvGrQDF14oP6gyh3K6sUBsCS2xXHAuRde5JfXDXDXYDEoT');"></div>
                                <div class="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-text-dark text-xs font-bold px-2 py-1 rounded shadow-sm">Kiến Thức</div>
                            </div>
                            <div class="flex flex-col flex-1 p-5 gap-3">
                                <div class="flex items-center gap-2 text-xs font-sans text-text-light">
                                    <span>20 Tháng 9, 2023</span>
                                    <span>•</span>
                                    <span>Trần Minh</span>
                                </div>
                                <h3 class="text-xl font-bold leading-snug text-text-dark group-hover:text-primary transition-colors line-clamp-2">
                                    <a href="#">Phân Biệt Trầm Hương Tự Nhiên và Trầm Hương Nhân Tạo</a>
                                </h3>
                                <p class="text-[#6b5847] text-sm leading-relaxed line-clamp-3 font-sans mb-2">
                                    Hướng dẫn chi tiết cách nhận biết trầm hương thật giả qua mùi hương, vân gỗ và các phương pháp thử nghiệm đơn giản tại nhà.
                                </p>
                                <div class="mt-auto pt-3 border-t border-[#f3ede7] flex justify-between items-center">
                                    <span class="text-xs font-bold text-text-light uppercase tracking-wider group-hover:text-primary transition-colors">Đọc Tiếp</span>
                                    <span class="material-symbols-outlined text-[18px] text-text-light group-hover:text-primary transition-transform group-hover:translate-x-1">arrow_right_alt</span>
                                </div>
                            </div>
                        </article>
                        <!-- Post 2 -->
                        <article class="flex flex-col h-full bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-[#f3ede7] group">
                            <div class="relative aspect-[4/3] overflow-hidden">
                                <div class="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" data-alt="Traditional Vietnamese tea ceremony setup with incense burner" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuAD1NuWAq3eW3NxjU-G-Lr8tUQp1U2GirFmdHn1St--ic0wPrYz5RNGxxOYXuJMu_05oazNHak7b76XmbDKb18aqM9m3cYxncqJwoEj49l4GWoTuFcVHiwYd_Pkya6WSvYdl-g-piRYVKzD0PFFIfMThfDd-TvTIzNDdCGIG4nOYTiuoVQh60bp60fmsAIZer7pb0x4J7fctyDynhWEEO1m4kXrFhuP6kjpI7iDq2MT0enO-Ir1uKW1tKWetEsUuiIDMsZJToLkTenT');"></div>
                                <div class="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-text-dark text-xs font-bold px-2 py-1 rounded shadow-sm">Văn Hóa</div>
                            </div>
                            <div class="flex flex-col flex-1 p-5 gap-3">
                                <div class="flex items-center gap-2 text-xs font-sans text-text-light">
                                    <span>15 Tháng 9, 2023</span>
                                    <span>•</span>
                                    <span>Lê Thu Hà</span>
                                </div>
                                <h3 class="text-xl font-bold leading-snug text-text-dark group-hover:text-primary transition-colors line-clamp-2">
                                    <a href="#">Hương Trầm Trong Văn Hóa Tâm Linh Người Việt</a>
                                </h3>
                                <p class="text-[#6b5847] text-sm leading-relaxed line-clamp-3 font-sans mb-2">
                                    Tìm hiểu ý nghĩa sâu sắc của nén nhang trầm trên bàn thờ gia tiên và vai trò kết nối giữa thế giới thực tại và cõi thiêng liêng.
                                </p>
                                <div class="mt-auto pt-3 border-t border-[#f3ede7] flex justify-between items-center">
                                    <span class="text-xs font-bold text-text-light uppercase tracking-wider group-hover:text-primary transition-colors">Đọc Tiếp</span>
                                    <span class="material-symbols-outlined text-[18px] text-text-light group-hover:text-primary transition-transform group-hover:translate-x-1">arrow_right_alt</span>
                                </div>
                            </div>
                        </article>
                        <!-- Post 3 -->
                        <article class="flex flex-col h-full bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-[#f3ede7] group">
                            <div class="relative aspect-[4/3] overflow-hidden">
                                <div class="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" data-alt="Person meditating with incense smoke in background" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuBvadcI9uqXNtmlqEkObM3ElW4LjjCfnLYsggWhYV4vk90o0bVnEbK2FOQPhheqLPK6KrGem8_LaFD6QOR8b26EpVPo3W1fQsTq0YtiSNiVAUU4mhRdSWcd4bSr1Fr0ZStTzXcfIXLWFWnuGoxaolBgHL8ZlyRlUqX5DSVPD94cC3TPHDSoTIPaJwHJqSPgSDFjb5qeZpirAEZDHRMRcC864mCYzYw3icGnqIRZNns6s8GPR47soL_BPH0mXKV7SQpSNxBWAaeW83tP');"></div>
                                <div class="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-text-dark text-xs font-bold px-2 py-1 rounded shadow-sm">Sức Khỏe</div>
                            </div>
                            <div class="flex flex-col flex-1 p-5 gap-3">
                                <div class="flex items-center gap-2 text-xs font-sans text-text-light">
                                    <span>05 Tháng 9, 2023</span>
                                    <span>•</span>
                                    <span>Dr. Hoàng</span>
                                </div>
                                <h3 class="text-xl font-bold leading-snug text-text-dark group-hover:text-primary transition-colors line-clamp-2">
                                    <a href="#">Lợi Ích Của Việc Xông Trầm Đối Với Sức Khỏe Tinh Thần</a>
                                </h3>
                                <p class="text-[#6b5847] text-sm leading-relaxed line-clamp-3 font-sans mb-2">
                                    Khoa học đã chứng minh hương trầm giúp giảm stress, cải thiện giấc ngủ và tăng cường khả năng tập trung như thế nào?
                                </p>
                                <div class="mt-auto pt-3 border-t border-[#f3ede7] flex justify-between items-center">
                                    <span class="text-xs font-bold text-text-light uppercase tracking-wider group-hover:text-primary transition-colors">Đọc Tiếp</span>
                                    <span class="material-symbols-outlined text-[18px] text-text-light group-hover:text-primary transition-transform group-hover:translate-x-1">arrow_right_alt</span>
                                </div>
                            </div>
                        </article>
                        <!-- Post 4 -->
                        <article class="flex flex-col h-full bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-[#f3ede7] group">
                            <div class="relative aspect-[4/3] overflow-hidden">
                                <div class="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" data-alt="Artistic macro shot of agarwood texture" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuC6_acPHDRQTQmClsxUv0-1MghDo58l8Wg8VgzF06xKHwoxk6pgukZwqz8G310jXmjAqwqV_A4VdHQFF3qcGMR9JdO2NnKBmyEwhnhaqkDxeOZGGMy5lvw7eeaTMKpTvqzznkmykXmKdjxVswYZeca7TbPclvYicMqlakcZzeePzPr2cYMPg5o_DZmy4ZbUjfhcnmZ5rE72r5eKEiimjCf_bb6eH3iDyekh8eepVD1RkxwpRVE9j2p96kC82pPEWiaLVZMDRbCx_xUh');"></div>
                                <div class="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-text-dark text-xs font-bold px-2 py-1 rounded shadow-sm">Nghệ Thuật</div>
                            </div>
                            <div class="flex flex-col flex-1 p-5 gap-3">
                                <div class="flex items-center gap-2 text-xs font-sans text-text-light">
                                    <span>28 Tháng 8, 2023</span>
                                    <span>•</span>
                                    <span>Phạm Gia</span>
                                </div>
                                <h3 class="text-xl font-bold leading-snug text-text-dark group-hover:text-primary transition-colors line-clamp-2">
                                    <a href="#">Thú Chơi Trầm Cảnh: Đỉnh Cao Của Sự Tao Nhã</a>
                                </h3>
                                <p class="text-[#6b5847] text-sm leading-relaxed line-clamp-3 font-sans mb-2">
                                    Không chỉ để đốt, trầm cảnh còn là vật phẩm phong thủy mang lại may mắn và khẳng định đẳng cấp của gia chủ.
                                </p>
                                <div class="mt-auto pt-3 border-t border-[#f3ede7] flex justify-between items-center">
                                    <span class="text-xs font-bold text-text-light uppercase tracking-wider group-hover:text-primary transition-colors">Đọc Tiếp</span>
                                    <span class="material-symbols-outlined text-[18px] text-text-light group-hover:text-primary transition-transform group-hover:translate-x-1">arrow_right_alt</span>
                                </div>
                            </div>
                        </article>
                        <!-- Post 5 -->
                        <article class="flex flex-col h-full bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-[#f3ede7] group">
                            <div class="relative aspect-[4/3] overflow-hidden">
                                <div class="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" data-alt="Traditional incense sticks drying under the sun" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuBRiZxt1dErMkKD9I2Wxscn1OUTBgVChDgjbVEGOejivvbJMhPkaklwSHf_BdciBeq3gZmw2KJbGUnbs3vhGl-0KjbkELSRU1pF38f26fCIgi1ehSvYWMxpACDArnQ2W7UBf1kd2yuevLGM_0eUJFrjpNudboZ6bkUYd3Nklu6zkMhd070h6uJ0hbs1lGEmMTLiZ3nTLY4nPvTLw2fHzQfNFofUtLKTShQSftYHjunMvdH-5icNz5UTO6HL2aYJspK3WrtMdDnOQZ4L');"></div>
                                <div class="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-text-dark text-xs font-bold px-2 py-1 rounded shadow-sm">Làng Nghề</div>
                            </div>
                            <div class="flex flex-col flex-1 p-5 gap-3">
                                <div class="flex items-center gap-2 text-xs font-sans text-text-light">
                                    <span>12 Tháng 8, 2023</span>
                                    <span>•</span>
                                    <span>Ban Biên Tập</span>
                                </div>
                                <h3 class="text-xl font-bold leading-snug text-text-dark group-hover:text-primary transition-colors line-clamp-2">
                                    <a href="#">Về Thăm Làng Nghề Làm Hương Trăm Tuổi Ở Huế</a>
                                </h3>
                                <p class="text-[#6b5847] text-sm leading-relaxed line-clamp-3 font-sans mb-2">
                                    Một hành trình đầy màu sắc và hương thơm về vùng đất cố đô, nơi lưu giữ những bí quyết làm hương thủ công độc đáo.
                                </p>
                                <div class="mt-auto pt-3 border-t border-[#f3ede7] flex justify-between items-center">
                                    <span class="text-xs font-bold text-text-light uppercase tracking-wider group-hover:text-primary transition-colors">Đọc Tiếp</span>
                                    <span class="material-symbols-outlined text-[18px] text-text-light group-hover:text-primary transition-transform group-hover:translate-x-1">arrow_right_alt</span>
                                </div>
                            </div>
                        </article>
                        <!-- Post 6 -->
                        <article class="flex flex-col h-full bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-[#f3ede7] group">
                            <div class="relative aspect-[4/3] overflow-hidden">
                                <div class="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" data-alt="Modern agarwood bracelet on a wooden table" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuAbRw4m5dVvaJumns0KvCAdvH9D21KEUOfveKnTDRBE5kitrgEeU-ZvWpyay304F9JFWca_2bmQlCVnxro6xDdctD8tk8Zl_7BHJ1tNswDl6jO7qlbPVtNzkn-fJ0m-fXnFNWrc5idPHrUVR8GKEI2KN8OaiDWsUMA8cVzisSf0CXxH-aWs66IbGuKyO1d_eJTeMq75tubiZ-t6pptMImqtSdJTibA2T69bzHvYTFvSNjzLwPv3Dg746GPt32um98AqvwXYZtjXPlEZ');"></div>
                                <div class="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-text-dark text-xs font-bold px-2 py-1 rounded shadow-sm">Sản Phẩm</div>
                            </div>
                            <div class="flex flex-col flex-1 p-5 gap-3">
                                <div class="flex items-center gap-2 text-xs font-sans text-text-light">
                                    <span>02 Tháng 8, 2023</span>
                                    <span>•</span>
                                    <span>Thiên Phúc</span>
                                </div>
                                <h3 class="text-xl font-bold leading-snug text-text-dark group-hover:text-primary transition-colors line-clamp-2">
                                    <a href="#">Vòng Tay Trầm Hương: Món Trang Sức Của Sự Bình An</a>
                                </h3>
                                <p class="text-[#6b5847] text-sm leading-relaxed line-clamp-3 font-sans mb-2">
                                    Tại sao vòng tay trầm hương lại được ưa chuộng đến vậy? Cách chọn vòng tay phù hợp với mệnh và phong cách của bạn.
                                </p>
                                <div class="mt-auto pt-3 border-t border-[#f3ede7] flex justify-between items-center">
                                    <span class="text-xs font-bold text-text-light uppercase tracking-wider group-hover:text-primary transition-colors">Đọc Tiếp</span>
                                    <span class="material-symbols-outlined text-[18px] text-text-light group-hover:text-primary transition-transform group-hover:translate-x-1">arrow_right_alt</span>
                                </div>
                            </div>
                        </article>
                    </section>
                    <!-- Pagination -->
                    <div class="flex justify-center items-center gap-2 pt-8 pb-4">
                        <button class="flex items-center justify-center size-10 rounded-lg border border-[#e6dccf] bg-white text-text-light hover:border-primary hover:text-primary transition-colors disabled:opacity-50">
                            <span class="material-symbols-outlined">chevron_left</span>
                        </button>
                        <button class="flex items-center justify-center size-10 rounded-lg bg-primary text-white font-bold shadow-md">1</button>
                        <button class="flex items-center justify-center size-10 rounded-lg border border-[#e6dccf] bg-white text-text-dark hover:border-primary hover:text-primary transition-colors font-medium">2</button>
                        <button class="flex items-center justify-center size-10 rounded-lg border border-[#e6dccf] bg-white text-text-dark hover:border-primary hover:text-primary transition-colors font-medium">3</button>
                        <span class="flex items-center justify-center size-10 text-text-light">...</span>
                        <button class="flex items-center justify-center size-10 rounded-lg border border-[#e6dccf] bg-white text-text-dark hover:border-primary hover:text-primary transition-colors font-medium">8</button>
                        <button class="flex items-center justify-center size-10 rounded-lg border border-[#e6dccf] bg-white text-text-light hover:border-primary hover:text-primary transition-colors">
                            <span class="material-symbols-outlined">chevron_right</span>
                        </button>
                    </div>
                </div>
            </div>
            <!-- Footer -->
            <footer class="bg-[#2c2016] text-[#e6dccf] pt-16 pb-8 border-t-4 border-primary mt-12">
                <div class="layout-container flex flex-col items-center">
                    <div class="w-full max-w-[1200px] px-4 lg:px-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
                        <div class="flex flex-col gap-4">
                            <div class="flex items-center gap-2 text-primary mb-2">
                                <span class="material-symbols-outlined text-[32px]">spa</span>
                                <h3 class="text-xl font-bold">Thiên Phúc</h3>
                            </div>
                            <p class="text-sm leading-relaxed text-[#b0a08d]">
                                Trầm Hương Thiên Phúc cam kết mang đến những sản phẩm trầm hương sạch, tự nhiên, gìn giữ nét đẹp văn hóa truyền thống Việt.
                            </p>
                            <div class="flex gap-4 mt-2">
                                <a class="text-[#e6dccf] hover:text-primary transition-colors" href="#"><span class="material-symbols-outlined">social_leaderboard</span></a>
                                <a class="text-[#e6dccf] hover:text-primary transition-colors" href="#"><span class="material-symbols-outlined">photo_camera</span></a>
                                <a class="text-[#e6dccf] hover:text-primary transition-colors" href="#"><span class="material-symbols-outlined">smart_display</span></a>
                            </div>
                        </div>
                        <div class="flex flex-col gap-4">
                            <h4 class="text-lg font-bold text-white border-b border-primary/30 pb-2 w-fit">Liên Kết Nhanh</h4>
                            <ul class="flex flex-col gap-2 text-sm text-[#b0a08d]">
                                <li><a class="hover:text-primary transition-colors" href="#">Về Chúng Tôi</a></li>
                                <li><a class="hover:text-primary transition-colors" href="#">Cửa Hàng</a></li>
                                <li><a class="hover:text-primary transition-colors" href="#">Thư Viện Kiến Thức</a></li>
                                <li><a class="hover:text-primary transition-colors" href="#">Chính Sách Bảo Mật</a></li>
                            </ul>
                        </div>
                        <div class="flex flex-col gap-4">
                            <h4 class="text-lg font-bold text-white border-b border-primary/30 pb-2 w-fit">Danh Mục</h4>
                            <ul class="flex flex-col gap-2 text-sm text-[#b0a08d]">
                                <li><a class="hover:text-primary transition-colors" href="#">Nhang Trầm Sạch</a></li>
                                <li><a class="hover:text-primary transition-colors" href="#">Vòng Tay Phong Thủy</a></li>
                                <li><a class="hover:text-primary transition-colors" href="#">Dụng Cụ Thưởng Trầm</a></li>
                                <li><a class="hover:text-primary transition-colors" href="#">Quà Tặng Doanh Nghiệp</a></li>
                            </ul>
                        </div>
                        <div class="flex flex-col gap-4">
                            <h4 class="text-lg font-bold text-white border-b border-primary/30 pb-2 w-fit">Liên Hệ</h4>
                            <ul class="flex flex-col gap-3 text-sm text-[#b0a08d]">
                                <li class="flex items-start gap-3">
                                    <span class="material-symbols-outlined text-primary text-[20px] mt-0.5">location_on</span>
                                    <span>123 Đường Lê Lợi, Quận 1, TP. Hồ Chí Minh</span>
                                </li>
                                <li class="flex items-center gap-3">
                                    <span class="material-symbols-outlined text-primary text-[20px]">call</span>
                                    <span>0909 123 456</span>
                                </li>
                                <li class="flex items-center gap-3">
                                    <span class="material-symbols-outlined text-primary text-[20px]">mail</span>
                                    <span>lienhe@tramhuongthienphuc.vn</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div class="w-full max-w-[1200px] border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-[#7d7063]">
                        <p>© 2024 Trầm Hương Thiên Phúc. Bảo lưu mọi quyền.</p>
                        <p>Thiết kế đậm chất truyền thống Việt.</p>
                    </div>
                </div>
            </footer>
        </body></html>