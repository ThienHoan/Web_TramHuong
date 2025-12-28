'use client';

import { motion, AnimatePresence } from 'framer-motion';

export function ProcessingOrderOverlay({ isVisible }: { isVisible: boolean }) {
    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-md"
                >
                    <div className="relative">
                        {/* Outer rotating ring */}
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            className="w-24 h-24 rounded-full border-4 border-trad-border-warm border-t-trad-primary"
                        />
                        {/* Inner pulsing icon */}
                        <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="absolute inset-0 flex items-center justify-center"
                        >
                            <span className="material-symbols-outlined text-4xl text-trad-primary">local_shipping</span>
                        </motion.div>
                    </div>

                    <motion.h2
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="mt-8 text-2xl font-bold font-display text-trad-red-900"
                    >
                        Đang xử lý đơn hàng...
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="mt-2 text-trad-text-muted"
                    >
                        Vui lòng không tắt trình duyệt
                    </motion.p>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
