< !DOCTYPE html >

    <html class="light" lang="en"><head>
        <meta charset="utf-8" />
        <meta content="width=device-width, initial-scale=1.0" name="viewport" />
        <title>Zen Checkout - Payment Selection</title>
        <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@200;300;400;500;600;700&amp;family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet" />
        <script>
            tailwind.config = {
                darkMode: "class",
            theme: {
                extend: {
                colors: {
                "primary": "#63cf17",
            "background-light": "#f7f8f6",
            "background-dark": "#182111",
            "zen-dark": "#131b0e",
            "zen-gray": "#d9e7d0",
                    },
            fontFamily: {
                "display": ["Manrope", "sans-serif"]
                    },
            borderRadius: {"DEFAULT": "0.25rem", "lg": "0.5rem", "xl": "0.75rem", "full": "9999px" },
                },
            },
        }
        </script>
    </head>
        <body class="bg-background-light dark:bg-background-dark font-display antialiased text-zen-dark dark:text-gray-100 min-h-screen flex flex-col">
            <!-- Header -->
            <header class="w-full border-b border-[#ecf3e7] bg-white/80 dark:bg-background-dark/80 backdrop-blur-sm sticky top-0 z-50">
                <div class="max-w-7xl mx-auto px-6 lg:px-8 h-20 flex items-center justify-between">
                    <div class="flex items-center gap-4">
                        <a class="flex items-center gap-3 group" href="#">
                            <div class="w-8 h-8 text-zen-dark dark:text-white transition-transform group-hover:rotate-180 duration-700">
                                <svg fill="none" viewbox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M39.5563 34.1455V13.8546C39.5563 15.708 36.8773 17.3437 32.7927 18.3189C30.2914 18.916 27.263 19.2655 24 19.2655C20.737 19.2655 17.7086 18.916 15.2073 18.3189C11.1227 17.3437 8.44365 15.708 8.44365 13.8546V34.1455C8.44365 35.9988 11.1227 37.6346 15.2073 38.6098C17.7086 39.2069 20.737 39.5564 24 39.5564C27.263 39.5564 30.2914 39.2069 32.7927 38.6098C36.8773 37.6346 39.5563 35.9988 39.5563 34.1455Z" fill="currentColor"></path>
                                    <path clip-rule="evenodd" d="M10.4485 13.8519C10.4749 13.9271 10.6203 14.246 11.379 14.7361C12.298 15.3298 13.7492 15.9145 15.6717 16.3735C18.0007 16.9296 20.8712 17.2655 24 17.2655C27.1288 17.2655 29.9993 16.9296 32.3283 16.3735C34.2508 15.9145 35.702 15.3298 36.621 14.7361C37.3796 14.246 37.5251 13.9271 37.5515 13.8519C37.5287 13.7876 37.4333 13.5973 37.0635 13.2931C36.5266 12.8516 35.6288 12.3647 34.343 11.9175C31.79 11.0295 28.1333 10.4437 24 10.4437C19.8667 10.4437 16.2099 11.0295 13.657 11.9175C12.3712 12.3647 11.4734 12.8516 10.9365 13.2931C10.5667 13.5973 10.4713 13.7876 10.4485 13.8519ZM37.5563 18.7877C36.3176 19.3925 34.8502 19.8839 33.2571 20.2642C30.5836 20.9025 27.3973 21.2655 24 21.2655C20.6027 21.2655 17.4164 20.9025 14.7429 20.2642C13.1498 19.8839 11.6824 19.3925 10.4436 18.7877V34.1275C10.4515 34.1545 10.5427 34.4867 11.379 35.027C12.298 35.6207 13.7492 36.2054 15.6717 36.6644C18.0007 37.2205 20.8712 37.5564 24 37.5564C27.1288 37.5564 29.9993 37.2205 32.3283 36.6644C34.2508 36.2054 35.702 35.6207 36.621 35.027C37.4573 34.4867 37.5485 34.1546 37.5563 34.1275V18.7877ZM41.5563 13.8546V34.1455C41.5563 36.1078 40.158 37.5042 38.7915 38.3869C37.3498 39.3182 35.4192 40.0389 33.2571 40.5551C30.5836 41.1934 27.3973 41.5564 24 41.5564C20.6027 41.5564 17.4164 41.1934 14.7429 40.5551C12.5808 40.0389 10.6502 39.3182 9.20848 38.3869C7.84205 37.5042 6.44365 36.1078 6.44365 34.1455L6.44365 13.8546C6.44365 12.2684 7.37223 11.0454 8.39581 10.2036C9.43325 9.3505 10.8137 8.67141 12.343 8.13948C15.4203 7.06909 19.5418 6.44366 24 6.44366C28.4582 6.44366 32.5797 7.06909 35.657 8.13948C37.1863 8.67141 38.5667 9.3505 39.6042 10.2036C40.6278 11.0454 41.5563 12.2684 41.5563 13.8546Z" fill="currentColor" fill-rule="evenodd"></path>
                                </svg>
                            </div>
                            <h2 class="text-zen-dark dark:text-white text-lg font-light tracking-[0.2em] uppercase">Zen Incense</h2>
                        </a>
                    </div>
                    <div class="flex items-center gap-8 hidden md:flex">
                        <nav class="flex items-center gap-8">
                            <a class="text-xs font-light tracking-[0.15em] hover:text-primary transition-colors duration-300" href="#">SHOP</a>
                            <a class="text-xs font-light tracking-[0.15em] hover:text-primary transition-colors duration-300" href="#">STORY</a>
                            <a class="text-xs font-light tracking-[0.15em] hover:text-primary transition-colors duration-300" href="#">JOURNAL</a>
                        </nav>
                        <div class="relative">
                            <span class="material-symbols-outlined text-xl font-light">shopping_bag</span>
                            <span class="absolute -top-1 -right-1 flex h-2 w-2">
                                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                <span class="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                            </span>
                        </div>
                    </div>
                </div>
            </header>
            <main class="flex-grow w-full max-w-7xl mx-auto px-6 lg:px-8 py-10 lg:py-16">
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 xl:gap-24 items-start">
                    <!-- Left Column: Payment & Checkout Flow -->
                    <div class="lg:col-span-7 flex flex-col gap-10 fade-in-section">
                        <!-- Progress Indicator -->
                        <div class="flex flex-col gap-4">
                            <div class="flex items-center justify-between text-[10px] sm:text-xs font-medium tracking-[0.2em] text-zen-dark/60 dark:text-white/60">
                                <span>CART</span>
                                <span>SHIPPING</span>
                                <span class="text-primary font-bold">PAYMENT</span>
                            </div>
                            <div class="w-full h-[2px] bg-[#ecf3e7] rounded-full overflow-hidden">
                                <div class="h-full bg-primary w-full transition-all duration-1000 ease-out"></div>
                            </div>
                        </div>
                        <!-- Headline -->
                        <div>
                            <h1 class="text-3xl md:text-4xl font-thin tracking-[0.1em] text-zen-dark dark:text-white uppercase mb-2">Secure Payment</h1>
                            <p class="text-sm font-light text-zen-dark/60 dark:text-gray-400">Please choose your preferred payment method.</p>
                        </div>
                        <!-- Payment Methods Form -->
                        <form class="flex flex-col gap-6" onsubmit="event.preventDefault();">
                            <div class="space-y-4">
                                <!-- COD Option -->
                                <label class="group relative flex cursor-pointer rounded-xl border border-[#ecf3e7] dark:border-white/10 p-6 hover:border-primary/50 transition-all duration-300 bg-white dark:bg-white/5 shadow-sm hover:shadow-md">
                                    <input checked="" class="peer sr-only" name="payment-method" type="radio" />
                                    <span class="absolute top-6 left-6 flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 dark:border-gray-500 peer-checked:border-primary peer-checked:bg-primary transition-all">
                                        <span class="h-1.5 w-1.5 rounded-full bg-white opacity-0 peer-checked:opacity-100"></span>
                                    </span>
                                    <div class="ml-10 flex flex-col gap-1">
                                        <span class="block text-sm font-semibold uppercase tracking-wider text-zen-dark dark:text-white">Cash on Delivery (COD)</span>
                                        <span class="block text-sm font-light text-gray-500 dark:text-gray-400">Pay in cash upon delivery of your order.</span>
                                    </div>
                                    <div class="ml-auto flex items-center text-gray-400 peer-checked:text-primary">
                                        <span class="material-symbols-outlined font-light text-2xl">local_shipping</span>
                                    </div>
                                    <!-- Active Border Styling -->
                                    <div class="absolute inset-0 rounded-xl border-2 border-transparent peer-checked:border-primary pointer-events-none transition-colors"></div>
                                </label>
                                <!-- Bank Transfer Option -->
                                <label class="group relative flex cursor-pointer rounded-xl border border-[#ecf3e7] dark:border-white/10 p-6 hover:border-primary/50 transition-all duration-300 bg-white dark:bg-white/5 shadow-sm hover:shadow-md">
                                    <input class="peer sr-only" name="payment-method" type="radio" />
                                    <span class="absolute top-6 left-6 flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 dark:border-gray-500 peer-checked:border-primary peer-checked:bg-primary transition-all">
                                        <span class="h-1.5 w-1.5 rounded-full bg-white opacity-0 peer-checked:opacity-100"></span>
                                    </span>
                                    <div class="ml-10 flex flex-col gap-1">
                                        <span class="block text-sm font-semibold uppercase tracking-wider text-zen-dark dark:text-white">Bank Transfer (VietQR)</span>
                                        <span class="block text-sm font-light text-gray-500 dark:text-gray-400">Instant payment via banking app. QR code provided next.</span>
                                    </div>
                                    <div class="ml-auto flex items-center text-gray-400 peer-checked:text-primary">
                                        <span class="material-symbols-outlined font-light text-2xl">qr_code_scanner</span>
                                    </div>
                                    <div class="absolute inset-0 rounded-xl border-2 border-transparent peer-checked:border-primary pointer-events-none transition-colors"></div>
                                </label>
                            </div>
                            <!-- Additional Info / Warning for Bank Transfer (Dynamic feel) -->
                            <div class="bg-primary/10 dark:bg-primary/5 rounded-lg p-4 flex gap-3 items-start border border-primary/20">
                                <span class="material-symbols-outlined text-primary text-xl mt-0.5">info</span>
                                <p class="text-xs font-light text-zen-dark dark:text-gray-300 leading-relaxed">
                                    For Bank Transfer orders, you will be redirected to a secure payment gateway to scan your QR code immediately after clicking Complete Order. Please have your banking app ready.
                                </p>
                            </div>
                            <!-- Billing Address Checkbox -->
                            <div class="pt-2">
                                <label class="flex items-center gap-3 cursor-pointer">
                                    <input checked="" class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/20 bg-transparent" type="checkbox" />
                                    <span class="text-sm font-light text-zen-dark dark:text-gray-300">Billing address is same as shipping address</span>
                                </label>
                            </div>
                            <!-- Desktop Actions -->
                            <div class="hidden lg:flex items-center justify-between pt-8">
                                <a class="flex items-center gap-2 text-xs font-medium tracking-widest text-gray-500 hover:text-zen-dark dark:hover:text-white transition-colors uppercase group" href="#">
                                    <span class="material-symbols-outlined text-sm transition-transform group-hover:-translate-x-1">arrow_back</span>
                                    Return to Shipping
                                </a>
                                <button class="bg-zen-dark dark:bg-white hover:bg-primary dark:hover:bg-primary text-white dark:text-zen-dark hover:text-zen-dark transition-all duration-300 px-10 py-4 rounded-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 min-w-[240px]">
                                    <span class="text-sm font-bold tracking-[0.15em] uppercase">Complete Order</span>
                                </button>
                            </div>
                        </form>
                    </div>
                    <!-- Right Column: Order Summary (Sticky) -->
                    <div class="lg:col-span-5 relative">
                        <div class="sticky top-32 lg:pl-8 xl:pl-16 border-t lg:border-t-0 lg:border-l border-[#ecf3e7] dark:border-white/10 pt-10 lg:pt-0">
                            <h3 class="text-sm font-medium tracking-[0.2em] uppercase text-gray-400 mb-8">Order Summary</h3>
                            <div class="flex flex-col gap-6 mb-8">
                                <!-- Item 1 -->
                                <div class="flex gap-4 items-start group">
                                    <div class="relative w-20 h-24 overflow-hidden rounded-md bg-gray-100 shrink-0">
                                        <img alt="Agarwood Chips" class="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-700" data-alt="Premium Agarwood chips in a glass container with warm lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCFZFs5uZglFKaap8wln25ZuEit_keJ99ozhlgm7GUpalphlIQ34Zka5KBsx-giL9xBZ_lnGAzzRMiDhCWPDYTS6uXQnLZUZAHJIKtOm8gz_swp3BzQDrOkGWIjckyjo8GUwGzkf3EEiiVaAIveI49d67nwin5GPTRxrHiSrZTJDNJK8i_V62ZBCObFAx2aOfIcx6qhBog3J9BAMe1058SDyD8BmvmQZEPP1KDmreV8UsyeIEYRg9taGvqn_S0DgKVFd7S2yMda82_V" />
                                        <span class="absolute top-0 right-0 bg-primary/90 text-zen-dark text-[10px] font-bold px-1.5 py-0.5 rounded-bl-md">1</span>
                                    </div>
                                    <div class="flex-1">
                                        <h4 class="text-sm font-medium text-zen-dark dark:text-white uppercase tracking-wider mb-1">Agarwood Chips</h4>
                                        <p class="text-xs text-gray-500 font-light mb-2">Grade A / 50g</p>
                                        <p class="text-sm font-light">1,200,000 VND</p>
                                    </div>
                                </div>
                                <!-- Item 2 -->
                                <div class="flex gap-4 items-start group">
                                    <div class="relative w-20 h-24 overflow-hidden rounded-md bg-gray-100 shrink-0">
                                        <img alt="Ceramic Burner" class="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-700" data-alt="Minimalist ceramic incense burner on a clean surface" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCYBmNEaNMXqCH0jilx_zUuZMso0VJBfWmYadJb4zB9lAplcyi9FFG3DmjsPc8n3JKz0ju-Iy3ORE8aRlmTWzKAlhtC3K96tvPjlbraYgZvjEeVi-NaJg5ttFeAuuAIdt-XyUG-7v4yjSwXJnKWIlHQRHUjDWDQBbyzk7h8LLLhneXuxYSfW8Nmtleqyh-zBWdaDejf6Y3VsAFTTgxh0exIX9c04zbCVO6GYLSmuH5eYCj_ffKQyAijIeapkH2Kcc3cK2zVRYWgiYHx" />
                                        <span class="absolute top-0 right-0 bg-primary/90 text-zen-dark text-[10px] font-bold px-1.5 py-0.5 rounded-bl-md">1</span>
                                    </div>
                                    <div class="flex-1">
                                        <h4 class="text-sm font-medium text-zen-dark dark:text-white uppercase tracking-wider mb-1">Ceramic Burner</h4>
                                        <p class="text-xs text-gray-500 font-light mb-2">Matte Black</p>
                                        <p class="text-sm font-light">300,000 VND</p>
                                    </div>
                                </div>
                            </div>
                            <!-- Divider -->
                            <div class="h-px w-full bg-[#ecf3e7] dark:bg-white/10 mb-6"></div>
                            <!-- Totals -->
                            <div class="space-y-3 mb-8">
                                <div class="flex justify-between items-center text-sm font-light text-gray-600 dark:text-gray-400">
                                    <span>Subtotal</span>
                                    <span>1,500,000 VND</span>
                                </div>
                                <div class="flex justify-between items-center text-sm font-light text-gray-600 dark:text-gray-400">
                                    <span>Shipping</span>
                                    <span class="text-primary font-medium tracking-wide">FREE</span>
                                </div>
                                <div class="flex justify-between items-center text-sm font-light text-gray-600 dark:text-gray-400">
                                    <span>Taxes</span>
                                    <span>Included</span>
                                </div>
                            </div>
                            <!-- Divider -->
                            <div class="h-px w-full bg-[#ecf3e7] dark:bg-white/10 mb-6"></div>
                            <div class="flex justify-between items-end mb-8">
                                <span class="text-base font-medium uppercase tracking-widest text-zen-dark dark:text-white">Total</span>
                                <div class="flex flex-col items-end">
                                    <span class="text-sm font-light text-gray-400 mb-1">VND</span>
                                    <span class="text-2xl font-light tracking-tight text-zen-dark dark:text-white">1,500,000</span>
                                </div>
                            </div>
                            <!-- Trust Badges -->
                            <div class="flex items-center gap-6 justify-center lg:justify-start opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                                <div class="flex items-center gap-2">
                                    <span class="material-symbols-outlined text-lg">lock</span>
                                    <span class="text-[10px] uppercase tracking-widest font-medium">Secure SSL</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <span class="material-symbols-outlined text-lg">verified_user</span>
                                    <span class="text-[10px] uppercase tracking-widest font-medium">Verified</span>
                                </div>
                            </div>
                            <!-- Mobile Action (Sticky Bottom on Mobile only) -->
                            <div class="lg:hidden fixed bottom-0 left-0 w-full bg-white dark:bg-background-dark border-t border-gray-100 dark:border-white/10 p-4 z-40">
                                <button class="w-full bg-zen-dark dark:bg-white text-white dark:text-zen-dark py-4 rounded-lg shadow-lg font-bold tracking-[0.15em] uppercase text-sm">
                                    Complete Order - 1,500,000 VND
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <!-- Simple Footer -->
            <footer class="mt-auto border-t border-[#ecf3e7] dark:border-white/5 py-8">
                <div class="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p class="text-xs font-light text-gray-400 tracking-wide">© 2024 ZEN INCENSE. ALL RIGHTS RESERVED.</p>
                    <div class="flex gap-6">
                        <a class="text-xs font-light text-gray-400 hover:text-zen-dark dark:hover:text-white transition-colors" href="#">PRIVACY POLICY</a>
                        <a class="text-xs font-light text-gray-400 hover:text-zen-dark dark:hover:text-white transition-colors" href="#">TERMS OF SERVICE</a>
                    </div>
                </div>
            </footer>
            <style>
                .fade-in-section {
                    opacity: 0;
                animation: fadeIn 0.8s ease-out forwards;
        }

                @keyframes fadeIn {
                    from {opacity: 0; transform: translateY(10px); }
                to {opacity: 1; transform: translateY(0); }
        }

                /* Custom scrollbar for webkit */
                ::-webkit-scrollbar {
                    width: 8px;
        }
                ::-webkit-scrollbar-track {
                    background: transparent; 
        }
                ::-webkit-scrollbar-thumb {
                    background: #d9e7d0;
                border-radius: 4px;
        }
                ::-webkit-scrollbar-thumb:hover {
                    background: #63cf17; 
        }
            </style>
        </body></html>