'use client';

import { motion } from 'framer-motion';
import { pageTransition } from '@/lib/motion';

export default function Template({ children }: { children: React.ReactNode }) {
    return (
        <motion.div
            variants={pageTransition}
            initial="initial"
            animate="animate"
            exit="exit"
            className="w-full"
        >
            {children}
        </motion.div>
    );
}
