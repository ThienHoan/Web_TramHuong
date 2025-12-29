< !DOCTYPE html >

    <html class="light" lang="en"><head>
        <meta charset="utf-8" />
        <meta content="width=device-width, initial-scale=1.0" name="viewport" />
        <title>Zen Agarwood - All Products</title>
        <!-- Google Fonts -->
        <link href="https://fonts.googleapis.com" rel="preconnect" />
        <link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect" />
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@200;300;400;500;600;700;800&amp;display=swap" rel="stylesheet" />
        <!-- Material Symbols -->
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet" />
        <!-- Tailwind CSS -->
        <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
        <!-- Theme Config -->
        <script id="tailwind-config">
            tailwind.config = {
                darkMode: "class",
            theme: {
                extend: {
                colors: {
                "primary": "#63cf17",
            "zen-50": "#fafcf8",
            "zen-100": "#ecf3e7",
            "zen-200": "#d9e7d0",
            "zen-text": "#131b0e",
            "zen-accent": "#6d974e",
            "background-light": "#fafcf8",
            "background-dark": "#182111",
                    },
            fontFamily: {
                "display": ["Manrope", "sans-serif"]
                    },
            borderRadius: {"DEFAULT": "0.25rem", "lg": "0.5rem", "xl": "0.75rem", "full": "9999px"},
            letterSpacing: {
                "zen-wide": "0.2em",
                    }
                },
            },
        }
        </script>
        <style>
        /* Custom styles for subtle animations */
            .fade-in-up {
                animation: fadeInUp 0.8s ease-out forwards;
            opacity: 0;
            transform: translateY(20px);
        }

            @keyframes fadeInUp {
                to {
                opacity: 1;
            transform: translateY(0);
            }
        }

            .delay-100 {animation - delay: 100ms; }
            .delay-200 {animation - delay: 200ms; }
            .delay-300 {animation - delay: 300ms; }

            .group-card:hover .card-btn {
                opacity: 1;
            transform: translateY(0);
        }
        </style>
    </head>
        <body class="bg-background-light dark:bg-background-dark text-zen-text font-display antialiased selection:bg-zen-200 selection:text-zen-text">
            <!-- Navbar -->
            <header class="sticky top-0 z-50 w-full bg-[#fafcf8]/95 backdrop-blur-md border-b border-[#ecf3e7]">
                <div class="max-w-[1440px] mx-auto px-6 lg:px-12 h-20 flex items-center justify-between">
                    <!-- Mobile Menu Button -->
                    <button class="lg:hidden p-2 -ml-2 text-zen-text">
                        <span class="material-symbols-outlined">menu</span>
                    </button>
                    <!-- Logo -->
                    <div class="flex items-center gap-3 group cursor-pointer">
                        <div class="size-6 text-zen-text transition-transform duration-500 group-hover:rotate-180">
                            <svg fill="none" viewbox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                                <path clip-rule="evenodd" d="M24 4H6V17.3333V30.6667H24V44H42V30.6667V17.3333H24V4Z" fill="currentColor" fill-rule="evenodd"></path>
                            </svg>
                        </div>
                        <h1 class="text-zen-text text-lg font-bold tracking-[0.1em] uppercase hidden sm:block">Zen Agarwood</h1>
                    </div>
                    <!-- Desktop Nav Links -->
                    <nav class="hidden lg:flex items-center gap-12">
                        <a class="text-xs font-bold tracking-[0.15em] text-zen-text/70 hover:text-zen-text transition-colors uppercase" href="#">Home</a>
                        <a class="text-xs font-bold tracking-[0.15em] text-zen-text transition-colors uppercase relative after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-full after:h-px after:bg-zen-text" href="#">Collections</a>
                        <a class="text-xs font-bold tracking-[0.15em] text-zen-text/70 hover:text-zen-text transition-colors uppercase" href="#">Our Story</a>
                        <a class="text-xs font-bold tracking-[0.15em] text-zen-text/70 hover:text-zen-text transition-colors uppercase" href="#">Journal</a>
                    </nav>
                    <!-- Right Actions -->
                    <div class="flex items-center gap-6">
                        <div class="hidden md:flex items-center relative group">
                            <input class="w-32 focus:w-48 transition-all duration-300 bg-transparent border-b border-transparent focus:border-zen-200 text-xs tracking-widest placeholder:text-zen-text/40 focus:outline-none py-1 pl-6" placeholder="SEARCH" type="text" />
                            <span class="material-symbols-outlined absolute left-0 text-zen-text/60 text-[20px]">search</span>
                        </div>
                        <button class="relative group">
                            <span class="material-symbols-outlined text-zen-text text-[22px]">shopping_bag</span>
                            <span class="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-white">2</span>
                        </button>
                        <button class="hidden sm:block">
                            <span class="material-symbols-outlined text-zen-text text-[22px]">person</span>
                        </button>
                    </div>
                </div>
            </header>
            <main class="min-h-screen flex flex-col w-full max-w-[1440px] mx-auto">
                <!-- Page Heading -->
                <section class="pt-20 pb-12 px-6 lg:px-12 text-center fade-in-up">
                    <h2 class="text-3xl md:text-5xl font-extralight tracking-zen-wide uppercase text-zen-text mb-4">The Collection</h2>
                    <p class="text-zen-accent text-sm md:text-base font-light tracking-widest max-w-2xl mx-auto">
                        Sustainably harvested from the ancient forests of Vietnam. <br class="hidden sm:block" />Curated for mindfulness and inner peace.
                    </p>
                </section>
                <!-- Main Layout -->
                <div class="flex flex-col lg:flex-row px-6 lg:px-12 gap-12 pb-24">
                    <!-- Sidebar / Filter Panel -->
                    <aside class="w-full lg:w-64 shrink-0 fade-in-up delay-100">
                        <div class="sticky top-24 space-y-10">
                            <!-- Categories -->
                            <div>
                                <h3 class="text-xs font-bold uppercase tracking-[0.2em] mb-6 text-zen-text/40">Category</h3>
                                <div class="flex flex-col gap-1">
                                    <label class="group flex items-center justify-between cursor-pointer py-2">
                                        <span class="text-sm font-medium tracking-widest text-zen-text group-hover:text-primary transition-colors">VIEW ALL</span>
                                        <input checked="" class="hidden" name="category" type="radio" />
                                        <div class="h-1.5 w-1.5 rounded-full bg-primary opacity-100 transition-opacity"></div>
                                    </label>
                                    <label class="group flex items-center justify-between cursor-pointer py-2">
                                        <span class="text-sm font-light tracking-widest text-zen-text/70 group-hover:text-zen-text transition-colors">INCENSE STICKS</span>
                                        <input class="hidden" name="category" type="radio" />
                                        <div class="h-1.5 w-1.5 rounded-full bg-primary opacity-0 group-hover:opacity-20 peer-checked:opacity-100 transition-opacity"></div>
                                    </label>
                                    <label class="group flex items-center justify-between cursor-pointer py-2">
                                        <span class="text-sm font-light tracking-widest text-zen-text/70 group-hover:text-zen-text transition-colors">CONES &amp; COILS</span>
                                        <input class="hidden" name="category" type="radio" />
                                        <div class="h-1.5 w-1.5 rounded-full bg-primary opacity-0 group-hover:opacity-20 peer-checked:opacity-100 transition-opacity"></div>
                                    </label>
                                    <label class="group flex items-center justify-between cursor-pointer py-2">
                                        <span class="text-sm font-light tracking-widest text-zen-text/70 group-hover:text-zen-text transition-colors">PURE CHIPS</span>
                                        <input class="hidden" name="category" type="radio" />
                                        <div class="h-1.5 w-1.5 rounded-full bg-primary opacity-0 group-hover:opacity-20 peer-checked:opacity-100 transition-opacity"></div>
                                    </label>
                                    <label class="group flex items-center justify-between cursor-pointer py-2">
                                        <span class="text-sm font-light tracking-widest text-zen-text/70 group-hover:text-zen-text transition-colors">ACCESSORIES</span>
                                        <input class="hidden" name="category" type="radio" />
                                        <div class="h-1.5 w-1.5 rounded-full bg-primary opacity-0 group-hover:opacity-20 peer-checked:opacity-100 transition-opacity"></div>
                                    </label>
                                </div>
                            </div>
                            <!-- Filter By Scent (Desktop only mostly) -->
                            <div class="hidden lg:block">
                                <h3 class="text-xs font-bold uppercase tracking-[0.2em] mb-6 text-zen-text/40">Scent Profile</h3>
                                <div class="flex flex-wrap gap-2">
                                    <button class="px-3 py-1.5 border border-zen-200 rounded text-[10px] uppercase tracking-widest hover:border-zen-accent hover:text-zen-accent transition-colors">Woody</button>
                                    <button class="px-3 py-1.5 border border-zen-200 rounded text-[10px] uppercase tracking-widest hover:border-zen-accent hover:text-zen-accent transition-colors">Sweet</button>
                                    <button class="px-3 py-1.5 border border-zen-200 rounded text-[10px] uppercase tracking-widest hover:border-zen-accent hover:text-zen-accent transition-colors">Floral</button>
                                    <button class="px-3 py-1.5 border border-zen-200 rounded text-[10px] uppercase tracking-widest hover:border-zen-accent hover:text-zen-accent transition-colors">Spicy</button>
                                </div>
                            </div>
                            <!-- Price Range -->
                            <div class="hidden lg:block">
                                <h3 class="text-xs font-bold uppercase tracking-[0.2em] mb-6 text-zen-text/40">Price</h3>
                                <div class="flex items-center gap-4 text-xs tracking-widest">
                                    <span>$0</span>
                                    <div class="flex-1 h-px bg-zen-200 relative">
                                        <div class="absolute left-0 w-1/2 h-full bg-zen-accent"></div>
                                        <div class="absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-zen-text cursor-pointer hover:scale-125 transition-transform"></div>
                                    </div>
                                    <span>$500+</span>
                                </div>
                            </div>
                        </div>
                    </aside>
                    <!-- Product Grid Area -->
                    <div class="flex-1 fade-in-up delay-200">
                        <!-- Toolbar -->
                        <div class="flex flex-wrap items-center justify-between mb-8 pb-4 border-b border-zen-100 gap-4">
                            <p class="text-xs font-medium tracking-[0.1em] text-zen-text/60">SHOWING 9 PRODUCTS</p>
                            <div class="flex items-center gap-4">
                                <div class="relative group">
                                    <button class="flex items-center gap-2 text-xs font-bold tracking-[0.1em] uppercase hover:text-primary transition-colors">
                                        Sort By: Recommended
                                        <span class="material-symbols-outlined text-[16px]">expand_more</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <!-- Grid -->
                        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-12">
                            <!-- Product 1 -->
                            <div class="group-card flex flex-col gap-4">
                                <div class="relative w-full aspect-[3/4] overflow-hidden rounded-lg bg-zen-100">
                                    <div class="absolute inset-0 bg-cover bg-center transition-transform duration-[2000ms] ease-out group-card-hover:scale-105" data-alt="Close up of agarwood chips with visible resin textures" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuC6cvm1TsGXDK8cX7K31gNo9ZLn4kgZsNKxNocqqfZwHCCI4hbRRKWMRgiCscTObafJfDH2EmsG2-xk-VKFJORJXlkEFg1b1vonSpIPEnkJ6j0EhXSv_jTQtcQ5vAlvq31ap_wqvOA6edR0sSgbiuLS0EI5tK7S0q8gdLgGe-MdCYOLhX1TLDoOaPYPmWMJ-dHreOb2ao1CAriiM_080DTP6WZAL5vnSYgj1EvCRS4G9gx10Ub-2QZ2ln-loXh3-y0gTeKIHvzFUH_O');"></div>
                                    <!-- Badges -->
                                    <div class="absolute top-3 left-3 flex flex-col gap-2">
                                        <span class="bg-[#fafcf8]/80 backdrop-blur-sm border border-zen-200 px-2 py-1 text-[10px] font-bold tracking-[0.1em] uppercase text-zen-text rounded-sm">Premium</span>
                                    </div>
                                    <!-- Quick Add Button (Hover) -->
                                    <div class="absolute bottom-4 left-0 right-0 flex justify-center opacity-0 translate-y-4 transition-all duration-500 card-btn">
                                        <button class="bg-[#131b0e] text-[#fafcf8] hover:bg-primary hover:text-white px-6 py-3 rounded-full text-xs font-bold tracking-[0.2em] uppercase shadow-xl shadow-zen-200/50 transition-colors">
                                            Add to Cart
                                        </button>
                                    </div>
                                </div>
                                <div class="text-center md:text-left space-y-1">
                                    <h3 class="text-base font-light tracking-[0.15em] uppercase text-zen-text">Premium Kinam Chips</h3>
                                    <div class="flex items-center justify-center md:justify-start gap-3">
                                        <span class="text-sm font-medium tracking-widest text-zen-accent">$120.00</span>
                                        <span class="text-[10px] uppercase tracking-widest text-zen-text/40 border-l border-zen-200 pl-3">Rare</span>
                                    </div>
                                </div>
                            </div>
                            <!-- Product 2 -->
                            <div class="group-card flex flex-col gap-4">
                                <div class="relative w-full aspect-[3/4] overflow-hidden rounded-lg bg-zen-100">
                                    <div class="absolute inset-0 bg-cover bg-center transition-transform duration-[2000ms] ease-out group-card-hover:scale-105" data-alt="Bundle of burning incense sticks with gentle smoke" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuBD7XiWUeSWvXRexNpLPTBCPaylvuTfAEu-kuryErIuwQ2GAf8yPes34l4rByYnrWZFGzsz7O1bkRS0gSLTGKG0pbHO58SrF6Unh1dV7KfV27fSdh-X9aO47oolMxwXgfKngRD0X4dtbztzmNFlgPbMYtVh5nRLBTNS5tll6xKBt1jtPuN8KCsDB0gbQ0rnyrc3yfVuLMJiP9rogfsJDE28jHSvfZxztLCOdgy0Ujjq-KS2R853NmlSOzMZ-Kltn9HqzY0endn0JrSq');"></div>
                                    <div class="absolute top-3 left-3 flex flex-col gap-2">
                                        <span class="bg-[#fafcf8]/80 backdrop-blur-sm border border-zen-200 px-2 py-1 text-[10px] font-bold tracking-[0.1em] uppercase text-zen-text rounded-sm">Best Seller</span>
                                    </div>
                                    <div class="absolute bottom-4 left-0 right-0 flex justify-center opacity-0 translate-y-4 transition-all duration-500 card-btn">
                                        <button class="bg-[#131b0e] text-[#fafcf8] hover:bg-primary hover:text-white px-6 py-3 rounded-full text-xs font-bold tracking-[0.2em] uppercase shadow-xl shadow-zen-200/50 transition-colors">
                                            Add to Cart
                                        </button>
                                    </div>
                                </div>
                                <div class="text-center md:text-left space-y-1">
                                    <h3 class="text-base font-light tracking-[0.15em] uppercase text-zen-text">Hue Royal Incense</h3>
                                    <div class="flex items-center justify-center md:justify-start gap-3">
                                        <span class="text-sm font-medium tracking-widest text-zen-accent">$45.00</span>
                                        <span class="text-[10px] uppercase tracking-widest text-zen-text/40 border-l border-zen-200 pl-3">Calming</span>
                                    </div>
                                </div>
                            </div>
                            <!-- Product 3 -->
                            <div class="group-card flex flex-col gap-4">
                                <div class="relative w-full aspect-[3/4] overflow-hidden rounded-lg bg-zen-100">
                                    <div class="absolute inset-0 bg-cover bg-center transition-transform duration-[2000ms] ease-out group-card-hover:scale-105" data-alt="Spiral incense coil on a minimalist ceramic holder" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuCnr42sqfIqWdxSr4pm286k83BFyEph3l5msLxDzNIc2yr54HdDMMu3_yW5WsI6fpzTSMttkAFXS0vbFUDvg1_eVaVpgQGHRjjNps3VUtQ3pyH4O1MxEBDtwsDtrlnO5VNEofAHl0yaTPLWtAHkLn2m2anrzsD39Tk42wrDUumSO_b15TXf-qaK2C11lGiR3Ce_nP1OWD2uyA-k-AfauYxRaI1-x0clGezmFJeUSCkIRQ-TNDdKKeIGW-L8XhUIVlxy6t23a3EMo5z8');"></div>
                                    <div class="absolute bottom-4 left-0 right-0 flex justify-center opacity-0 translate-y-4 transition-all duration-500 card-btn">
                                        <button class="bg-[#131b0e] text-[#fafcf8] hover:bg-primary hover:text-white px-6 py-3 rounded-full text-xs font-bold tracking-[0.2em] uppercase shadow-xl shadow-zen-200/50 transition-colors">
                                            Add to Cart
                                        </button>
                                    </div>
                                </div>
                                <div class="text-center md:text-left space-y-1">
                                    <h3 class="text-base font-light tracking-[0.15em] uppercase text-zen-text">Nha Trang Coils</h3>
                                    <div class="flex items-center justify-center md:justify-start gap-3">
                                        <span class="text-sm font-medium tracking-widest text-zen-accent">$38.00</span>
                                        <span class="text-[10px] uppercase tracking-widest text-zen-text/40 border-l border-zen-200 pl-3">Traditional</span>
                                    </div>
                                </div>
                            </div>
                            <!-- Product 4 -->
                            <div class="group-card flex flex-col gap-4">
                                <div class="relative w-full aspect-[3/4] overflow-hidden rounded-lg bg-zen-100">
                                    <div class="absolute inset-0 bg-cover bg-center transition-transform duration-[2000ms] ease-out group-card-hover:scale-105" data-alt="Abstract minimalist shot of wood grain texture" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuBy8N1gM8MYa1HszLvLqerN7S3IJHltDXMCLvszzc0Hycj95psdnfnAoVoPBBJY5cDHWQpTOyLDG4Bo7vJ2us8jed9C2Cp04fCEH0rKjdYsJDVvErrGrexQYsVunGB5w13dm9N6L_bXW1ofckRrW79puwY3fy6-yYuFBSQCb3npBBhPYIzTri5-fR2ednsfR18LgGP7rukyy8DjK88xMSjKHr6XfocCKIvdtEVWgk4-cELCyYeA-LcpivklruZO0RSBvwiFE7LOuQ1M');"></div>
                                    <div class="absolute bottom-4 left-0 right-0 flex justify-center opacity-0 translate-y-4 transition-all duration-500 card-btn">
                                        <button class="bg-[#131b0e] text-[#fafcf8] hover:bg-primary hover:text-white px-6 py-3 rounded-full text-xs font-bold tracking-[0.2em] uppercase shadow-xl shadow-zen-200/50 transition-colors">
                                            Add to Cart
                                        </button>
                                    </div>
                                </div>
                                <div class="text-center md:text-left space-y-1">
                                    <h3 class="text-base font-light tracking-[0.15em] uppercase text-zen-text">Mountain Agarwood</h3>
                                    <div class="flex items-center justify-center md:justify-start gap-3">
                                        <span class="text-sm font-medium tracking-widest text-zen-accent">$85.00</span>
                                        <span class="text-[10px] uppercase tracking-widest text-zen-text/40 border-l border-zen-200 pl-3">Meditation</span>
                                    </div>
                                </div>
                            </div>
                            <!-- Product 5 -->
                            <div class="group-card flex flex-col gap-4">
                                <div class="relative w-full aspect-[3/4] overflow-hidden rounded-lg bg-zen-100">
                                    <div class="absolute inset-0 bg-cover bg-center transition-transform duration-[2000ms] ease-out group-card-hover:scale-105" data-alt="Ceramic incense burner with smoke rising elegantly" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuApoa0yJ7xcsz8C4MeaYaqBxROoH8qIHxvpKdpjo07PNXGXQ2qv4sl32wfNjNAzO73OdnEirO1DKnppY-RbcdaK_j-JvGdCABFBH-t618b7FebOp_Wvx-60oTTNBUeGNl-X6uph6L6weqKtGxRvA321aoBAQSbuH1aXzXwhEiu2rlaUy-1tebJ8WtJ7EHGRBRVpw94U7eNmaYx2c8-6CFn9bYsaO8aLJHM5Q24ViPuOGg8_8DwWNDsoPKBzG_nfXduVe32GhkR6gG6Q');"></div>
                                    <div class="absolute top-3 left-3 flex flex-col gap-2">
                                        <span class="bg-[#fafcf8]/80 backdrop-blur-sm border border-zen-200 px-2 py-1 text-[10px] font-bold tracking-[0.1em] uppercase text-zen-text rounded-sm">New Arrival</span>
                                    </div>
                                    <div class="absolute bottom-4 left-0 right-0 flex justify-center opacity-0 translate-y-4 transition-all duration-500 card-btn">
                                        <button class="bg-[#131b0e] text-[#fafcf8] hover:bg-primary hover:text-white px-6 py-3 rounded-full text-xs font-bold tracking-[0.2em] uppercase shadow-xl shadow-zen-200/50 transition-colors">
                                            Add to Cart
                                        </button>
                                    </div>
                                </div>
                                <div class="text-center md:text-left space-y-1">
                                    <h3 class="text-base font-light tracking-[0.15em] uppercase text-zen-text">Ceramic Burner Set</h3>
                                    <div class="flex items-center justify-center md:justify-start gap-3">
                                        <span class="text-sm font-medium tracking-widest text-zen-accent">$55.00</span>
                                        <span class="text-[10px] uppercase tracking-widest text-zen-text/40 border-l border-zen-200 pl-3">Accessory</span>
                                    </div>
                                </div>
                            </div>
                            <!-- Product 6 -->
                            <div class="group-card flex flex-col gap-4">
                                <div class="relative w-full aspect-[3/4] overflow-hidden rounded-lg bg-zen-100">
                                    <div class="absolute inset-0 bg-cover bg-center transition-transform duration-[2000ms] ease-out group-card-hover:scale-105" data-alt="Small glass bottle of dark agarwood oil on a wooden surface" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuAIBeWQF8Pb3_Zr6Px7lZri9NhFz3jkeykGBmqVrVphoT25BFPbjMuqd8b3r8Ln_HXrSZu0x0JN4yiMOWG4iz42EIRT1b9tw424FgOZQsbLFEv3Rpr3EH63FOcKdnc1sydlL2Hy30XV_DnrJKu2FgEF63hTXNerVOERc3bMvCEw3beRx1R0tO5sWE4aeXQTl5CV4ST-bD64jodWCyUO-kZcxGAKbmWttHTJ2xJcE8paK_IRo-0m0b3U7OcZZs8EdyRO127zcqY0FHz5');"></div>
                                    <div class="absolute bottom-4 left-0 right-0 flex justify-center opacity-0 translate-y-4 transition-all duration-500 card-btn">
                                        <button class="bg-[#131b0e] text-[#fafcf8] hover:bg-primary hover:text-white px-6 py-3 rounded-full text-xs font-bold tracking-[0.2em] uppercase shadow-xl shadow-zen-200/50 transition-colors">
                                            Add to Cart
                                        </button>
                                    </div>
                                </div>
                                <div class="text-center md:text-left space-y-1">
                                    <h3 class="text-base font-light tracking-[0.15em] uppercase text-zen-text">Pure Oud Oil</h3>
                                    <div class="flex items-center justify-center md:justify-start gap-3">
                                        <span class="text-sm font-medium tracking-widest text-zen-accent">$210.00</span>
                                        <span class="text-[10px] uppercase tracking-widest text-zen-text/40 border-l border-zen-200 pl-3">Extract</span>
                                    </div>
                                </div>
                            </div>
                            <!-- Product 7 -->
                            <div class="group-card flex flex-col gap-4">
                                <div class="relative w-full aspect-[3/4] overflow-hidden rounded-lg bg-zen-100">
                                    <div class="absolute inset-0 bg-cover bg-center transition-transform duration-[2000ms] ease-out group-card-hover:scale-105" data-alt="Stack of incense boxes with minimalist packaging" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuDKjT4rn-yGIHuRwL3wdY5hEGfIpFzMaga-_dnqz-zcKHYYTvDYYFAWD4xoXPIPF9hG3I6J4FlJQmh-qCO37tBlKlRk1VIySQjnsQ6qp5pIns5UYm8wSV7d3fAAyTPgW34FCQyyf2KneM8Ss6xxl9g8y_Bquhf4K1yuNU_LK-ngQjarjBvHhyL8ibhHXLYhUiYYkFIv1yrV42HkV-c6df7vRJ_czk9kf8DreQQZR7byptM4NCEi-eINu4AeLyON7QNP3lFzNmkEUBRd');"></div>
                                    <div class="absolute bottom-4 left-0 right-0 flex justify-center opacity-0 translate-y-4 transition-all duration-500 card-btn">
                                        <button class="bg-[#131b0e] text-[#fafcf8] hover:bg-primary hover:text-white px-6 py-3 rounded-full text-xs font-bold tracking-[0.2em] uppercase shadow-xl shadow-zen-200/50 transition-colors">
                                            Add to Cart
                                        </button>
                                    </div>
                                </div>
                                <div class="text-center md:text-left space-y-1">
                                    <h3 class="text-base font-light tracking-[0.15em] uppercase text-zen-text">Temple Gift Set</h3>
                                    <div class="flex items-center justify-center md:justify-start gap-3">
                                        <span class="text-sm font-medium tracking-widest text-zen-accent">$95.00</span>
                                        <span class="text-[10px] uppercase tracking-widest text-zen-text/40 border-l border-zen-200 pl-3">Gift</span>
                                    </div>
                                </div>
                            </div>
                            <!-- Product 8 -->
                            <div class="group-card flex flex-col gap-4">
                                <div class="relative w-full aspect-[3/4] overflow-hidden rounded-lg bg-zen-100">
                                    <div class="absolute inset-0 bg-cover bg-center transition-transform duration-[2000ms] ease-out group-card-hover:scale-105" data-alt="Calm spa setting with stones and incense" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuAmMCVaNwH6deBmzM1brq9iHb-6h3_WedfkWUtvBAqWAu5GMrN42xVxvl6FBYs8FHtd9KVM9PnoO_lWMQyp4Ygj9MqTub1S5PglkkO_KQXL8IYG7o3GCHcI_u8_dfb549G1Z8z-lz8vjvJ0tkwnwXKnF-bvGndJOCr4HajFOCz_nX58HFQ0SJwNWa9jjG6XQslOoLGoL0uhFamCcgYloX_cSPOaRVI5YjV-Ihmq3_Dwp4QwCARH4l5EPh7YwSY4Shbk2YDHtMRPTFke');"></div>
                                    <div class="absolute bottom-4 left-0 right-0 flex justify-center opacity-0 translate-y-4 transition-all duration-500 card-btn">
                                        <button class="bg-[#131b0e] text-[#fafcf8] hover:bg-primary hover:text-white px-6 py-3 rounded-full text-xs font-bold tracking-[0.2em] uppercase shadow-xl shadow-zen-200/50 transition-colors">
                                            Add to Cart
                                        </button>
                                    </div>
                                </div>
                                <div class="text-center md:text-left space-y-1">
                                    <h3 class="text-base font-light tracking-[0.15em] uppercase text-zen-text">Daily Ritual Bundle</h3>
                                    <div class="flex items-center justify-center md:justify-start gap-3">
                                        <span class="text-sm font-medium tracking-widest text-zen-accent">$75.00</span>
                                        <span class="text-[10px] uppercase tracking-widest text-zen-text/40 border-l border-zen-200 pl-3">Set</span>
                                    </div>
                                </div>
                            </div>
                            <!-- Product 9 -->
                            <div class="group-card flex flex-col gap-4">
                                <div class="relative w-full aspect-[3/4] overflow-hidden rounded-lg bg-zen-100">
                                    <div class="absolute inset-0 bg-cover bg-center transition-transform duration-[2000ms] ease-out group-card-hover:scale-105" data-alt="Macro shot of smoke patterns against a dark background" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuBBOXZ9govuHb579-102sJ97gDdYUlPpGCxxaVEQX9TDeczjDCKcTlQOppIlPAMr74mVb0oMqQY87T9rkH0hgFo0vCSzyJ2EXaxGvQ9xP9xpd2pJN3H0WmVGntmibZeit1_X4hmFJKubrIKfFIipID1BxB_qJQ0_zpzheK593O8P11x7L9oRwKkmY6Ni_5oaBmA9a0lJVpu5QY9-ohQ-NCQtj5WtC03AS4l-ky3qCRVRH_wKeo07fiir-1s5qde7C2fwENtHc3H-hoj');"></div>
                                    <div class="absolute bottom-4 left-0 right-0 flex justify-center opacity-0 translate-y-4 transition-all duration-500 card-btn">
                                        <button class="bg-[#131b0e] text-[#fafcf8] hover:bg-primary hover:text-white px-6 py-3 rounded-full text-xs font-bold tracking-[0.2em] uppercase shadow-xl shadow-zen-200/50 transition-colors">
                                            Add to Cart
                                        </button>
                                    </div>
                                </div>
                                <div class="text-center md:text-left space-y-1">
                                    <h3 class="text-base font-light tracking-[0.15em] uppercase text-zen-text">Limited Reserve</h3>
                                    <div class="flex items-center justify-center md:justify-start gap-3">
                                        <span class="text-sm font-medium tracking-widest text-zen-accent">$350.00</span>
                                        <span class="text-[10px] uppercase tracking-widest text-zen-text/40 border-l border-zen-200 pl-3">Collector</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <!-- Minimal Pagination -->
                        <div class="mt-20 flex justify-center items-center gap-8">
                            <button class="text-xs font-bold tracking-[0.2em] uppercase text-zen-text/40 hover:text-zen-text transition-colors disabled:opacity-20" disabled="">Prev</button>
                            <div class="flex items-center gap-4">
                                <a class="w-8 h-8 flex items-center justify-center rounded-full bg-zen-text text-[#fafcf8] text-xs font-bold" href="#">1</a>
                                <a class="w-8 h-8 flex items-center justify-center rounded-full text-zen-text hover:bg-zen-100 transition-colors text-xs font-bold" href="#">2</a>
                                <a class="w-8 h-8 flex items-center justify-center rounded-full text-zen-text hover:bg-zen-100 transition-colors text-xs font-bold" href="#">3</a>
                            </div>
                            <button class="text-xs font-bold tracking-[0.2em] uppercase text-zen-text hover:text-primary transition-colors">Next</button>
                        </div>
                    </div>
                </div>
            </main>
            <!-- Footer Preview (Minimal) -->
            <footer class="border-t border-[#ecf3e7] py-12 bg-[#fafcf8]">
                <div class="max-w-[1440px] mx-auto px-6 lg:px-12 flex flex-col md:flex-row justify-between items-center gap-6">
                    <h2 class="text-zen-text text-lg font-bold tracking-[0.1em] uppercase">Zen Agarwood</h2>
                    <div class="text-[10px] tracking-[0.1em] text-zen-text/60 uppercase">© 2024 Zen Agarwood. All rights reserved.</div>
                </div>
            </footer>
        </body></html>