< !DOCTYPE html >

    <html class="light" lang="en"><head>
        <meta charset="utf-8" />
        <meta content="width=device-width, initial-scale=1.0" name="viewport" />
        <title>Page Not Found - Zen Incense</title>
        <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@200;300;400;500;700&amp;display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet" />
        <script>
            tailwind.config = {
                darkMode: "class",
            theme: {
                extend: {
                colors: {
                "primary": "#54ae13",
            "background-light": "#f7f8f6",
            "background-dark": "#182111",
            "zen-50": "#f7f9f5",
            "zen-100": "#ecf3e7",
            "zen-800": "#1f2b18",
            "zen-900": "#131b0e",
            },
            fontFamily: {
                "display": ["Manrope", "sans-serif"]
            },
            letterSpacing: {
                "zen-wide": "0.2em",
            },
            borderRadius: {
                "DEFAULT": "0.25rem",
            "lg": "0.5rem",
            "xl": "0.75rem",
            "full": "9999px"
            },
            animation: {
                "fade-in-slow": "fadeIn 1.5s ease-out forwards",
            },
            keyframes: {
                fadeIn: {
                "0%": {opacity: "0", transform: "translateY(10px)" },
            "100%": {opacity: "1", transform: "translateY(0)" },
                }
            }
          },
        },
      }
        </script>
    </head>
        <body class="bg-background-light dark:bg-background-dark text-zen-900 dark:text-white font-display antialiased transition-colors duration-300">
            <div class="relative flex min-h-screen w-full flex-col overflow-x-hidden">
                <!-- Top Navigation (Reused & Simplified) -->
                <header class="flex items-center justify-between whitespace-nowrap px-10 py-6 absolute top-0 w-full z-10 bg-transparent">
                    <div class="flex items-center gap-8">
                        <a class="flex items-center gap-4 text-zen-900 dark:text-white group transition-opacity hover:opacity-80" href="#">
                            <div class="size-6 text-primary">
                                <svg class="w-full h-full" fill="none" viewbox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M39.5563 34.1455V13.8546C39.5563 15.708 36.8773 17.3437 32.7927 18.3189C30.2914 18.916 27.263 19.2655 24 19.2655C20.737 19.2655 17.7086 18.916 15.2073 18.3189C11.1227 17.3437 8.44365 15.708 8.44365 13.8546V34.1455C8.44365 35.9988 11.1227 37.6346 15.2073 38.6098C17.7086 39.2069 20.737 39.5564 24 39.5564C27.263 39.5564 30.2914 39.2069 32.7927 38.6098C36.8773 37.6346 39.5563 35.9988 39.5563 34.1455Z" fill="currentColor"></path>
                                    <path clip-rule="evenodd" d="M10.4485 13.8519C10.4749 13.9271 10.6203 14.246 11.379 14.7361C12.298 15.3298 13.7492 15.9145 15.6717 16.3735C18.0007 16.9296 20.8712 17.2655 24 17.2655C27.1288 17.2655 29.9993 16.9296 32.3283 16.3735C34.2508 15.9145 35.702 15.3298 36.621 14.7361C37.3796 14.246 37.5251 13.9271 37.5515 13.8519C37.5287 13.7876 37.4333 13.5973 37.0635 13.2931C36.5266 12.8516 35.6288 12.3647 34.343 11.9175C31.79 11.0295 28.1333 10.4437 24 10.4437C19.8667 10.4437 16.2099 11.0295 13.657 11.9175C12.3712 12.3647 11.4734 12.8516 10.9365 13.2931C10.5667 13.5973 10.4713 13.7876 10.4485 13.8519ZM37.5563 18.7877C36.3176 19.3925 34.8502 19.8839 33.2571 20.2642C30.5836 20.9025 27.3973 21.2655 24 21.2655C20.6027 21.2655 17.4164 20.9025 14.7429 20.2642C13.1498 19.8839 11.6824 19.3925 10.4436 18.7877V34.1275C10.4515 34.1545 10.5427 34.4867 11.379 35.027C12.298 35.6207 13.7492 36.2054 15.6717 36.6644C18.0007 37.2205 20.8712 37.5564 24 37.5564C27.1288 37.5564 29.9993 37.2205 32.3283 36.6644C34.2508 36.2054 35.702 35.6207 36.621 35.027C37.4573 34.4867 37.5485 34.1546 37.5563 34.1275V18.7877ZM41.5563 13.8546V34.1455C41.5563 36.1078 40.158 37.5042 38.7915 38.3869C37.3498 39.3182 35.4192 40.0389 33.2571 40.5551C30.5836 41.1934 27.3973 41.5564 24 41.5564C20.6027 41.5564 17.4164 41.1934 14.7429 40.5551C12.5808 40.0389 10.6502 39.3182 9.20848 38.3869C7.84205 37.5042 6.44365 36.1078 6.44365 34.1455L6.44365 13.8546C6.44365 12.2684 7.37223 11.0454 8.39581 10.2036C9.43325 9.3505 10.8137 8.67141 12.343 8.13948C15.4203 7.06909 19.5418 6.44366 24 6.44366C28.4582 6.44366 32.5797 7.06909 35.657 8.13948C37.1863 8.67141 38.5667 9.3505 39.6042 10.2036C40.6278 11.0454 41.5563 12.2684 41.5563 13.8546Z" fill="currentColor" fill-rule="evenodd"></path>
                                </svg>
                            </div>
                            <h2 class="text-base font-bold tracking-widest text-zen-900 dark:text-white">ZEN INCENSE</h2>
                        </a>
                    </div>
                    <div class="hidden md:flex items-center gap-9">
                        <a class="text-zen-900 dark:text-zen-100 text-xs tracking-zen-wide font-medium hover:text-primary transition-colors" href="#">SHOP</a>
                        <a class="text-zen-900 dark:text-zen-100 text-xs tracking-zen-wide font-medium hover:text-primary transition-colors" href="#">COLLECTIONS</a>
                        <a class="text-zen-900 dark:text-zen-100 text-xs tracking-zen-wide font-medium hover:text-primary transition-colors" href="#">JOURNAL</a>
                    </div>
                    <div class="flex items-center gap-4">
                        <button class="text-zen-900 dark:text-white hover:text-primary transition-colors">
                            <span class="material-symbols-outlined text-2xl">search</span>
                        </button>
                        <button class="text-zen-900 dark:text-white hover:text-primary transition-colors">
                            <span class="material-symbols-outlined text-2xl">shopping_bag</span>
                        </button>
                    </div>
                </header>
                <!-- Main Content Area: Centered, Calm, Spacious -->
                <main class="flex-1 flex flex-col items-center justify-center p-6 md:p-12 min-h-screen relative animate-fade-in-slow">
                    <!-- Abstract Background Decoration -->
                    <div class="absolute inset-0 z-0 opacity-30 pointer-events-none overflow-hidden flex items-center justify-center">
                        <div class="w-[800px] h-[800px] rounded-full border-[1px] border-primary/10"></div>
                        <div class="absolute w-[600px] h-[600px] rounded-full border-[1px] border-primary/10"></div>
                        <div class="absolute w-[400px] h-[400px] rounded-full border-[1px] border-primary/20"></div>
                    </div>
                    <!-- Content Container -->
                    <div class="z-10 flex flex-col items-center max-w-3xl text-center gap-10">
                        <!-- Main Visual: Minimalist Iconography -->
                        <div class="mb-6 relative">
                            <!-- Subtle '404' integration or just abstract -->
                            <div class="flex items-center justify-center">
                                <!-- Abstract leaf/smoke path SVG -->
                                <svg class="text-zen-800 dark:text-zen-100 opacity-80" fill="none" height="180" viewbox="0 0 120 180" width="120" xmlns="http://www.w3.org/2000/svg">
                                    <path class="opacity-50" d="M60 0C60 0 80 40 80 90C80 140 60 180 60 180C60 180 40 140 40 90C40 40 60 0 60 0Z" stroke="currentColor" stroke-width="1.5"></path>
                                    <path class="opacity-40" d="M60 20C60 20 20 60 20 90C20 120 60 160 60 160" stroke="currentColor" stroke-width="1"></path>
                                    <path class="opacity-60" d="M60 40C60 40 90 70 90 90C90 110 60 140 60 140" stroke="currentColor" stroke-width="0.5"></path>
                                    <!-- A line diverging away -->
                                    <path d="M60 90C60 90 90 80 110 60" stroke="#54ae13" stroke-dasharray="4 4" stroke-width="1.5"></path>
                                </svg>
                            </div>
                        </div>
                        <!-- Text Block -->
                        <div class="space-y-6">
                            <h1 class="text-3xl md:text-5xl font-thin tracking-zen-wide text-zen-900 dark:text-white uppercase leading-relaxed">
                                The Path Diverged
                            </h1>
                            <div class="h-px w-16 bg-primary/40 mx-auto my-4"></div>
                            <p class="text-sm md:text-base font-light tracking-widest text-zen-800/70 dark:text-zen-100/70 uppercase max-w-lg mx-auto leading-loose">
                                Lost in thought. The essence remains.<br />Let us guide you back to tranquility.
                            </p>
                        </div>
                        <!-- Call to Action Buttons -->
                        <div class="flex flex-col sm:flex-row gap-5 mt-8 w-full justify-center">
                            <a class="group relative flex items-center justify-center min-w-[240px] px-8 py-3 bg-zen-800 dark:bg-zen-100 text-white dark:text-zen-900 text-xs font-light tracking-zen-wide uppercase rounded-md overflow-hidden transition-all hover:bg-primary dark:hover:bg-primary hover:text-white dark:hover:text-white shadow-sm hover:shadow-md" href="#">
                                <span class="relative z-10">Return to Homepage</span>
                            </a>
                            <a class="group relative flex items-center justify-center min-w-[240px] px-8 py-3 bg-transparent border border-zen-800/30 dark:border-zen-100/30 text-zen-900 dark:text-zen-100 text-xs font-light tracking-zen-wide uppercase rounded-md transition-all hover:border-primary hover:text-primary dark:hover:border-primary dark:hover:text-primary" href="#">
                                <span>Explore Collections</span>
                            </a>
                        </div>
                    </div>
                </main>
                <!-- Minimal Footer -->
                <footer class="w-full py-8 text-center border-t border-zen-100 dark:border-white/5 bg-background-light dark:bg-background-dark z-10">
                    <div class="flex flex-col gap-6 px-5">
                        <div class="flex flex-wrap items-center justify-center gap-8 md:gap-12">
                            <a class="text-zen-800/60 dark:text-zen-100/60 text-xs font-light tracking-widest hover:text-primary transition-colors" href="#">CONTACT</a>
                            <a class="text-zen-800/60 dark:text-zen-100/60 text-xs font-light tracking-widest hover:text-primary transition-colors" href="#">SHIPPING</a>
                            <a class="text-zen-800/60 dark:text-zen-100/60 text-xs font-light tracking-widest hover:text-primary transition-colors" href="#">RETURNS</a>
                        </div>
                        <p class="text-zen-800/40 dark:text-zen-100/40 text-[10px] tracking-widest uppercase">© 2024 Zen Incense. All rights reserved.</p>
                    </div>
                </footer>
            </div>
        </body></html>