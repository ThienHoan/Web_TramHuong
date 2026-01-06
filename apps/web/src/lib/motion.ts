import { Variants } from 'framer-motion';

export const DURATION = {
    FAST: 0.2, // 200ms - micro interactions
    MEDIUM: 0.5, // 500ms - entrance animations
    SLOW: 0.8, // 800ms - large hero transitions
};

export const EASING = {
    DEFAULT: [0.25, 0.46, 0.45, 0.94] as const, // cubic-bezier
    SPRING: { type: 'spring', stiffness: 300, damping: 30 },
};

// Fade In Up - Standard entrance for sections/cards
export const fadeInUp: Variants = {
    initial: {
        opacity: 0,
        y: 20,
    },
    animate: {
        opacity: 1,
        y: 0,
        transition: {
            duration: DURATION.MEDIUM,
            ease: EASING.DEFAULT,
        },
    },
    exit: {
        opacity: 0,
        transition: { duration: DURATION.FAST }
    }
};

// Hover Lift - Subtle feedback for clickable cards
export const hoverLift: Variants = {
    hover: {
        y: -4,
        boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
        transition: {
            duration: DURATION.FAST,
            ease: "easeOut"
        }
    }
};

// Active Press - Physical button feel
export const activePress: Variants = {
    tap: {
        scale: 0.95,
        transition: {
            duration: 0.1, // very fast
            ease: "easeInOut"
        }
    }
};

// Page Transition
export const pageTransition: Variants = {
    initial: {
        opacity: 0,
        y: 10,
    },
    animate: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.3,
            ease: EASING.DEFAULT,
        }
    },
    exit: {
        opacity: 0,
        transition: { duration: 0.2 }
    }
};

export const REDUCED_MOTION = {
    transition: { duration: 0.3, ease: 'linear' },
    viewport: { once: true },
    variants: {
        initial: { opacity: 0 },
        animate: { opacity: 1, y: 0, x: 0, scale: 1 } // Reset transforms, keep fade
    }
};
