< !DOCTYPE html >

    <html class="light" lang="vi"><head>
        <meta charset="utf-8" />
        <meta content="width=device-width, initial-scale=1.0" name="viewport" />
        <title>Liên Hệ - Trầm Hương Thiên Phúc</title>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com" rel="preconnect" />
        <link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,100..900;1,100..900&amp;family=Noto+Sans:wght@400;500;700&amp;display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet" />
        <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
        <script id="tailwind-config">
            tailwind.config = {
                darkMode: "class",
            theme: {
                extend: {
                colors: {
                "primary": "#ec7f13",
            "background-light": "#fcfaf8",
            "background-dark": "#221910",
            "accent-brown": "#9a734c",
            "text-main": "#1b140d",
            "border-subtle": "#e7dbcf"
                    },
            fontFamily: {
                "display": ["Noto Serif", "serif"],
            "sans": ["Noto Sans", "sans-serif"]
                    },
            borderRadius: {
                "DEFAULT": "0.5rem",
            "lg": "1rem",
            "xl": "1.5rem",
            "full": "9999px"
                    },
            backgroundImage: {
                'pattern': "url('data:image/svg+xml,%3Csvg width=\\'60\\' height=\\'60\\' viewBox=\\'0 0 60 60\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Cg fill=\\'none\\' fill-rule=\\'evenodd\\'%3E%3Cg fill=\\'%23ec7f13\\' fill-opacity=\\'0.05\\'%3E%3Cpath d=\\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')"
                    }
                },
            },
        }
        </script>
        <style>
            body {
                font - family: "Noto Serif", serif;
        }
            .material-symbols-outlined {
                font - variation - settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24;
        }
        </style>
    </head>
        <body class="bg-background-light text-text-main antialiased selection:bg-primary/20 selection:text-primary">
            <div class="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-pattern">
                <!-- Navigation -->
                <header class="sticky top-0 z-50 flex items-center justify-between border-b border-solid border-border-subtle bg-background-light/95 px-6 py-4 backdrop-blur-md md:px-10 lg:px-40">
                    <div class="flex items-center gap-8">
                        <a class="flex items-center gap-4 text-text-main group" href="#">
                            <div class="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                                <span class="material-symbols-outlined">spa</span>
                            </div>
                            <h2 class="text-xl font-bold leading-tight tracking-tight">Trầm Hương Thiên Phúc</h2>
                        </a>
                        <nav class="hidden items-center gap-8 md:flex">
                            <a class="text-sm font-medium hover:text-primary transition-colors" href="#">Trang chủ</a>
                            <a class="text-sm font-medium hover:text-primary transition-colors" href="#">Sản phẩm</a>
                            <a class="text-sm font-medium hover:text-primary transition-colors" href="#">Câu chuyện</a>
                            <a class="text-sm font-bold text-primary" href="#">Liên hệ</a>
                        </nav>
                    </div>
                    <div class="flex items-center gap-4">
                        <button class="flex items-center justify-center rounded-full p-2 text-text-main hover:bg-black/5 md:hidden">
                            <span class="material-symbols-outlined">menu</span>
                        </button>
                        <div class="hidden md:block">
                            <label class="flex h-10 w-64 items-center rounded-full bg-[#f3ede7] px-4 transition-all focus-within:ring-2 focus-within:ring-primary/50">
                                <span class="material-symbols-outlined text-accent-brown">search</span>
                                <input class="w-full bg-transparent px-2 text-sm text-text-main placeholder:text-accent-brown/70 focus:outline-none" placeholder="Tìm kiếm sản phẩm..." />
                            </label>
                        </div>
                    </div>
                </header>
                <main class="flex-1">
                    <div class="layout-container flex h-full grow flex-col py-10 md:py-16">
                        <div class="px-4 md:px-10 lg:px-40 flex flex-1 justify-center">
                            <div class="layout-content-container flex max-w-6xl flex-1 flex-col gap-12 lg:flex-row">
                                <!-- Left Column: Storytelling & Info -->
                                <div class="flex flex-1 flex-col gap-8 lg:pr-10">
                                    <!-- Heading Section -->
                                    <div class="flex flex-col gap-4">
                                        <span class="text-primary font-bold tracking-widest uppercase text-xs">Liên hệ với chúng tôi</span>
                                        <h1 class="text-4xl md:text-5xl font-black leading-tight tracking-tight text-text-main">
                                            Gửi gắm tâm tình cùng <br /><span class="text-primary italic">Thiên Phúc</span>
                                        </h1>
                                        <p class="text-lg text-accent-brown leading-relaxed max-w-lg">
                                            Hương trầm quyện tỏa, kết nối tâm giao. Chúng tôi ở đây để lắng nghe câu chuyện của bạn, như một người tri kỷ bên chén trà thơm.
                                        </p>
                                    </div>
                                    <!-- Illustration Image -->
                                    <div class="relative w-full overflow-hidden rounded-xl shadow-md aspect-[4/3] group">
                                        <div class="absolute inset-0 bg-black/10 transition-colors group-hover:bg-black/0 z-10"></div>
                                        <div class="h-full w-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105" data-alt="Traditional Vietnamese silk painting style illustration of a serene tea ceremony setting with incense smoke rising gently" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuDcZvsV-bntgwDDtGh684_4_eNhhPOr6m3PQRYmYS9dxYL7UQR7-WMWL7ChKXu73xmrrGmnyP_qCiNFog0Zcd21WNizWWnmJrXj9JrqZ1b5aO-6wNh9n9Ohu9jTHjbY5Hl2uG7BkLXTAzm_guwa6CqUsBlxx9dEwNt-83iKqJh6wzD-GLNtPZJ_LNkFhG2puezQ2Lm0A00iL42KT9LlJKJAI-Ixxw3c1UjSZKv3_Ns6mZZH6TXXLZtF7ednwb4oY-MYIu0GvNKaswEn');">
                                        </div>
                                        <div class="absolute bottom-4 left-4 z-20 rounded-lg bg-white/80 backdrop-blur-sm px-4 py-2 shadow-sm">
                                            <p class="text-xs font-bold text-primary uppercase tracking-wider">Góc bình yên</p>
                                        </div>
                                    </div>
                                    <!-- Contact Details -->
                                    <div class="flex flex-col gap-6 pt-4">
                                        <h3 class="text-xl font-bold text-text-main">Nơi chúng tôi chờ bạn</h3>
                                        <div class="grid gap-6 sm:grid-cols-2">
                                            <div class="flex items-start gap-4">
                                                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                                    <span class="material-symbols-outlined">storefront</span>
                                                </div>
                                                <div>
                                                    <p class="font-bold text-text-main">Chốn đi về</p>
                                                    <p class="text-sm text-accent-brown mt-1">123 Đường Tơ Lụa, Phố Cổ<br />Hoàn Kiếm, Hà Nội</p>
                                                </div>
                                            </div>
                                            <div class="flex items-start gap-4">
                                                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                                    <span class="material-symbols-outlined">call</span>
                                                </div>
                                                <div>
                                                    <p class="font-bold text-text-main">Đường dây kết nối</p>
                                                    <p class="text-sm text-accent-brown mt-1">1900-8888</p>
                                                    <p class="text-xs text-accent-brown/70">Thứ 2 - Chủ Nhật: 8:00 - 21:00</p>
                                                </div>
                                            </div>
                                            <div class="flex items-start gap-4">
                                                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                                    <span class="material-symbols-outlined">mail</span>
                                                </div>
                                                <div>
                                                    <p class="font-bold text-text-main">Thư tín</p>
                                                    <p class="text-sm text-accent-brown mt-1">tamgiao@thienphuc.vn</p>
                                                </div>
                                            </div>
                                            <div class="flex items-start gap-4">
                                                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                                    <span class="material-symbols-outlined">share</span>
                                                </div>
                                                <div>
                                                    <p class="font-bold text-text-main">Mạng xã hội</p>
                                                    <div class="flex gap-3 mt-2">
                                                        <a class="text-accent-brown hover:text-primary transition-colors" href="#"><span class="material-symbols-outlined">public</span></a>
                                                        <a class="text-accent-brown hover:text-primary transition-colors" href="#"><span class="material-symbols-outlined">chat_bubble</span></a>
                                                        <a class="text-accent-brown hover:text-primary transition-colors" href="#"><span class="material-symbols-outlined">photo_camera</span></a>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <!-- Right Column: The Narrative Form -->
                                <div class="w-full lg:max-w-md xl:max-w-lg">
                                    <div class="sticky top-28 rounded-2xl bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#f3ede7]">
                                        <div class="mb-8 flex items-center justify-center">
                                            <span class="material-symbols-outlined text-4xl text-primary/40">stylus</span>
                                        </div>
                                        <h2 class="mb-6 text-center text-2xl font-bold text-text-main">Chia sẻ câu chuyện</h2>
                                        <form class="flex flex-col gap-5">
                                            <!-- Name Field -->
                                            <div class="group">
                                                <label class="mb-2 block text-sm font-medium text-text-main" for="name">Quý danh của bạn</label>
                                                <div class="relative">
                                                    <input class="w-full rounded-xl border border-border-subtle bg-[#fcfaf8] px-4 py-3 pl-10 text-text-main placeholder:text-accent-brown/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" id="name" placeholder="Để chúng tôi tiện xưng hô" type="text" />
                                                    <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-accent-brown/60 group-focus-within:text-primary">person</span>
                                                </div>
                                            </div>
                                            <!-- Email Field -->
                                            <div class="group">
                                                <label class="mb-2 block text-sm font-medium text-text-main" for="email">Nơi chúng tôi phản hồi</label>
                                                <div class="relative">
                                                    <input class="w-full rounded-xl border border-border-subtle bg-[#fcfaf8] px-4 py-3 pl-10 text-text-main placeholder:text-accent-brown/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" id="email" placeholder="Địa chỉ thư điện tử" type="email" />
                                                    <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-accent-brown/60 group-focus-within:text-primary">alternate_email</span>
                                                </div>
                                            </div>
                                            <!-- Topic Field -->
                                            <div class="group">
                                                <label class="mb-2 block text-sm font-medium text-text-main" for="subject">Chủ đề quan tâm</label>
                                                <div class="relative">
                                                    <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-accent-brown/60">
                                                        <span class="material-symbols-outlined">expand_more</span>
                                                    </div>
                                                    <select class="w-full appearance-none rounded-xl border border-border-subtle bg-[#fcfaf8] px-4 py-3 pl-10 text-text-main placeholder:text-accent-brown/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" id="subject">
                                                        <option>Tư vấn sản phẩm trầm hương</option>
                                                        <option>Hợp tác kinh doanh</option>
                                                        <option>Phản hồi dịch vụ</option>
                                                        <option>Khác</option>
                                                    </select>
                                                    <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-accent-brown/60 group-focus-within:text-primary">topic</span>
                                                </div>
                                            </div>
                                            <!-- Message Field -->
                                            <div class="group">
                                                <label class="mb-2 block text-sm font-medium text-text-main" for="message">Lời nhắn gửi</label>
                                                <div class="relative">
                                                    <textarea class="w-full resize-none rounded-xl border border-border-subtle bg-[#fcfaf8] px-4 py-3 pl-10 text-text-main placeholder:text-accent-brown/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" id="message" placeholder="Hãy kể cho chúng tôi nghe..." rows="5"></textarea>
                                                    <span class="material-symbols-outlined absolute left-3 top-4 text-accent-brown/60 group-focus-within:text-primary">edit_note</span>
                                                </div>
                                            </div>
                                            <!-- Submit Button -->
                                            <button class="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-bold text-white shadow-lg shadow-primary/25 transition-all hover:bg-[#d66f0d] hover:shadow-primary/40 active:scale-[0.98]">
                                                <span>Gửi câu chuyện của bạn</span>
                                                <span class="material-symbols-outlined text-sm">send</span>
                                            </button>
                                            <p class="text-center text-xs text-accent-brown/80 italic mt-2">
                                                Mọi thông tin của bạn đều được bảo mật tuyệt đối.
                                            </p>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
                <!-- Minimal Footer for context -->
                <footer class="border-t border-border-subtle bg-white py-12">
                    <div class="px-4 md:px-10 lg:px-40 flex flex-col items-center gap-6 text-center">
                        <div class="flex items-center gap-2 text-text-main">
                            <span class="material-symbols-outlined text-primary">spa</span>
                            <span class="font-bold text-lg">Trầm Hương Thiên Phúc</span>
                        </div>
                        <p class="text-sm text-accent-brown max-w-md">Tinh hoa đất trời, gói gọn trong từng nén hương. Mang bình an đến mọi nhà.</p>
                        <div class="flex gap-6 text-sm font-medium text-text-main/80">
                            <a class="hover:text-primary" href="#">Chính sách</a>
                            <a class="hover:text-primary" href="#">Điều khoản</a>
                            <a class="hover:text-primary" href="#">Bản quyền</a>
                        </div>
                        <p class="text-xs text-accent-brown/60">© 2024 Thiên Phúc. All rights reserved.</p>
                    </div>
                </footer>
            </div>
        </body></html>