import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                "primary": "#f4c025",
                "primary-dark": "#e0b020", // Added for hover states
                "background-light": "#fcfbf8",
                "background-dark": "#221e10",
                "trad-red": {
                    DEFAULT: "#541e1b",
                    900: "#421614", // Darker shade for backgrounds
                },
                "trad-gold": "#f4c025",
                "trad-cream": "#f4f0e7",
                "trad-border-warm": "#e8e2ce", // Added from usage
                "trad-bg-warm": "#f4f0e7", // Added Match
                "trad-text-main": "#1c180d", // Added Match
                "trad-text-muted": "#9c8749", // Added Match
                // New UI Colors from Order Detail Template
                "accent-gold": "#D4AF37",
                "accent-gold-dark": "#B8860B",
                "surface-accent": "#F5EFE6",
                "text-main": "#2D1810",
                "trad-gray": "#78716c",
                "trad-red-bright": "#c62828",
                "paper": "#fdfbf7",
            },
            fontFamily: {
                "display": ["Noto Serif", "serif"],
                "sans": ["Noto Sans", "sans-serif"],
            },
            borderRadius: {
                "lg": "0.5rem",
                "xl": "0.75rem",
                "2xl": "1rem",
            },
            backgroundImage: {
                'texture-paper': "url(\"data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.05'/%3E%3C/svg%3E\")",
            },
            animation: {
                blob: "blob 7s infinite",
            },
            keyframes: {
                blob: {
                    "0%": {
                        transform: "translate(0px, 0px) scale(1)",
                    },
                    "33%": {
                        transform: "translate(30px, -50px) scale(1.1)",
                    },
                    "66%": {
                        transform: "translate(-20px, 20px) scale(0.9)",
                    },
                    "100%": {
                        transform: "translate(0px, 0px) scale(1)",
                    },
                },
            },
        },
    },
    plugins: [],
};
export default config;
