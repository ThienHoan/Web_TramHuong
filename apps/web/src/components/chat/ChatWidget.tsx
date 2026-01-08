'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useOnClickOutside } from '@/hooks/use-on-click-outside';
import ChatMessage from './ChatMessage';
import { chatWithAIStream } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { X, Send, Sparkles, MessageSquare, Trash2, Square, RotateCcw } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { toast } from 'sonner';

interface Message {
    role: 'user' | 'model';
    content: string;
}

const SUGGESTIONS = [
    "Tư vấn quà tặng sếp",
    "Trầm hương xông phòng ngủ",
    "Nụ trầm giá dưới 500k",
    "Vòng tay trầm hương nữ"
];

const MAX_MESSAGES = 30;

// Helper to get storage key based on user
const getChatStorageKey = (userId: string | null): string => {
    return userId ? `chat_history_${userId}` : 'chat_history_guest';
};

// Welcome bubble constants
const WELCOME_SHOWN_KEY = 'chat_welcome_shown';
const WELCOME_DELAY_MS = 8000; // 8 seconds

export default function ChatWidget() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');
    const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
    const [showWelcomeBubble, setShowWelcomeBubble] = useState(false);
    const chatRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const prevUserIdRef = useRef<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Auto-welcome bubble (first visit only)
    useEffect(() => {
        if (isOpen) {
            setShowWelcomeBubble(false);
            return;
        }

        try {
            const alreadyShown = localStorage.getItem(WELCOME_SHOWN_KEY);
            if (alreadyShown) return;
        } catch {
            return; // Storage blocked
        }

        const timer = setTimeout(() => {
            setShowWelcomeBubble(true);
            try {
                localStorage.setItem(WELCOME_SHOWN_KEY, 'true');
            } catch { /* ignore */ }
        }, WELCOME_DELAY_MS);

        return () => clearTimeout(timer);
    }, [isOpen]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ctrl+/ to toggle chat (desktop only)
            if (e.ctrlKey && e.key === '/') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
            // Esc to close when chat is open and focused
            if (e.key === 'Escape' && isOpen && chatRef.current?.contains(document.activeElement)) {
                setIsOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    // Get current storage key
    const storageKey = getChatStorageKey(user?.id ?? null);

    // Load chat history when user changes or on mount
    useEffect(() => {
        const currentUserId = user?.id ?? null;

        // Reload history when user changes (login/logout/switch)
        if (prevUserIdRef.current !== currentUserId) {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    // Ensure we only load up to MAX_MESSAGES
                    setMessages(Array.isArray(parsed) ? parsed.slice(-MAX_MESSAGES) : []);
                } catch {
                    setMessages([]);
                }
            } else {
                setMessages([]);
            }
            prevUserIdRef.current = currentUserId;
        }
    }, [user?.id, storageKey]);

    // Scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen, streamingContent]);

    useOnClickOutside(chatRef, () => {
        // Optional: close on outside click. 
        // setIsOpen(false); 
    });

    // Save messages to localStorage with limit
    const saveMessages = useCallback((msgs: Message[]) => {
        const trimmed = msgs.slice(-MAX_MESSAGES);
        localStorage.setItem(storageKey, JSON.stringify(trimmed));
        return trimmed;
    }, [storageKey]);

    const handleStopStream = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
    };

    const handleSend = async (text: string = input) => {
        if (!text.trim() || isLoading) return;

        const userMsg: Message = { role: 'user', content: text };
        const newHistory = [...messages, userMsg];

        setMessages(newHistory);
        setInput('');
        setIsLoading(true);
        setStreamingContent('');
        saveMessages(newHistory);

        // Create abort controller for cancellation
        abortControllerRef.current = new AbortController();
        let fullContent = '';

        try {
            await chatWithAIStream(
                text,
                messages, // Pass old history (before user message)
                // onChunk
                (chunk) => {
                    fullContent += chunk;
                    setStreamingContent(fullContent);
                },
                // onWarning
                (warning) => {
                    toast.warning(warning);
                },
                // onError
                (error) => {
                    toast.error(error);
                },
                // signal
                abortControllerRef.current.signal
            );

            // Stream complete - finalize message
            const botMsg: Message = { role: 'model', content: fullContent };
            const updatedHistory = [...newHistory, botMsg];
            const trimmed = saveMessages(updatedHistory);
            setMessages(trimmed);
            setStreamingContent('');

            setStreamingContent('');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: fix type
        } catch (error: any) {
            if (error.name === 'AbortError') {
                // User cancelled - save partial content if any
                if (fullContent) {
                    const botMsg: Message = { role: 'model', content: fullContent + '\n\n*(Đã dừng)*' };
                    const updatedHistory = [...newHistory, botMsg];
                    saveMessages(updatedHistory);
                    setMessages(updatedHistory);
                }
                setStreamingContent('');
                setLastFailedMessage(null);
            } else {
                const errorMsg: Message = { role: 'model', content: "Xin lỗi, hiện tại tôi không thể kết nối. Vui lòng thử lại sau." };
                setMessages([...newHistory, errorMsg]);
                setStreamingContent('');
                setLastFailedMessage(text); // Save for retry
            }
        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
        }
    };

    const handleRetry = () => {
        if (lastFailedMessage) {
            // Remove the last error message
            setMessages(prev => prev.slice(0, -2));
            handleSend(lastFailedMessage);
            setLastFailedMessage(null);
        }
    };

    const handleSuggestionClick = (text: string) => {
        handleSend(text);
    };

    const handleClearHistory = () => {
        localStorage.removeItem(storageKey);
        setMessages([]);
        toast.success('Đã xóa lịch sử chat trên thiết bị này');
    };

    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-4 font-[family-name:var(--font-display)] text-trad-text-main">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="bg-white w-[350px] md:w-[400px] h-[500px] md:h-[600px] rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden"
                        ref={chatRef}
                    >
                        {/* Header */}
                        <div className="bg-trad-primary px-4 py-3 flex items-center justify-between text-white shadow-sm shrink-0">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-white/20 rounded-full">
                                    <Sparkles size={16} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm">Chuyên gia Trầm Hương</h3>
                                    <p className="text-[10px] opacity-90 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                                        {isLoading ? 'Đang trả lời...' : 'Sẵn sàng hỗ trợ'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                {messages.length > 0 && (
                                    <button
                                        onClick={handleClearHistory}
                                        className="hover:bg-white/20 p-1.5 rounded transition-colors"
                                        title="Xóa lịch sử chat"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                                <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div
                            className="flex-1 overflow-y-auto p-4 bg-slate-50 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent overscroll-y-contain"
                            ref={scrollRef}
                            data-lenis-prevent
                        >
                            {messages.length === 0 && !streamingContent && (
                                <div className="text-center mt-10 space-y-4">
                                    <div className="w-16 h-16 bg-trad-primary/10 rounded-full flex items-center justify-center mx-auto text-trad-primary">
                                        <Sparkles size={32} />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="font-semibold text-gray-800">Xin chào!</p>
                                        <p className="text-sm text-gray-500 max-w-[200px] mx-auto">
                                            Tôi là AI tư vấn viên của Thiên Phúc. Bạn cần tìm sản phẩm gì hôm nay?
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2 pt-4">
                                        {SUGGESTIONS.map(s => (
                                            <button
                                                key={s}
                                                onClick={() => handleSuggestionClick(s)}
                                                className="text-xs bg-white border border-gray-200 hover:border-trad-primary hover:text-trad-primary px-3 py-2 rounded-full transition-all shadow-sm"
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-4">
                                {messages.map((m, i) => (
                                    <ChatMessage key={i} role={m.role} content={m.content} />
                                ))}
                                {/* Streaming message */}
                                {streamingContent && (
                                    <ChatMessage role="model" content={streamingContent} />
                                )}
                                {/* Typing indicator when waiting for first chunk */}
                                {isLoading && !streamingContent && (
                                    <ChatMessage role="model" content="" isTyping />
                                )}
                            </div>
                        </div>

                        {/* Input */}
                        <div className="p-3 border-t bg-white shrink-0">
                            <form
                                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                                className="flex gap-2 items-center"
                            >
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Đặt câu hỏi..."
                                    className="flex-1 text-sm bg-gray-50 border-gray-200 rounded-full px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-trad-primary"
                                    disabled={isLoading}
                                />
                                {isLoading ? (
                                    <Button
                                        type="button"
                                        size="icon"
                                        className="rounded-full w-10 h-10 bg-red-500 hover:bg-red-600"
                                        onClick={handleStopStream}
                                        title="Dừng"
                                    >
                                        <Square size={14} />
                                    </Button>
                                ) : lastFailedMessage ? (
                                    <Button
                                        type="button"
                                        size="icon"
                                        className="rounded-full w-10 h-10 bg-amber-500 hover:bg-amber-600"
                                        onClick={handleRetry}
                                        title="Thử lại"
                                    >
                                        <RotateCcw size={16} />
                                    </Button>
                                ) : (
                                    <Button
                                        type="submit"
                                        size="icon"
                                        className="rounded-full w-10 h-10 bg-trad-primary hover:bg-trad-primary-dark"
                                        disabled={!input.trim()}
                                    >
                                        <Send size={16} />
                                    </Button>
                                )}
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Welcome Bubble */}
            <AnimatePresence>
                {showWelcomeBubble && !isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                        className="absolute bottom-20 right-0 w-72 bg-white rounded-2xl shadow-xl border border-border p-4 z-40"
                    >
                        <button
                            onClick={() => setShowWelcomeBubble(false)}
                            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 p-1"
                        >
                            <X size={16} />
                        </button>
                        <div className="flex items-start gap-2 mb-3">
                            <div className="p-3 bg-trad-primary/10 rounded-full text-trad-primary shrink-0">
                                <Sparkles size={16} />
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed">
                                Chào bạn! 👋 Mình là trợ lý trầm hương <strong>Thiên Phúc</strong>. Mình có thể giúp bạn chọn trầm hợp gu hoặc gợi ý quà tặng tinh tế.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            <button
                                onClick={() => { setShowWelcomeBubble(false); setIsOpen(true); setTimeout(() => handleSend('Tư vấn chọn trầm hương'), 100); }}
                                className="text-xs bg-trad-primary/10 hover:bg-trad-primary/20 text-trad-primary px-3 py-1.5 rounded-full transition-colors"
                            >
                                🌿 Chọn trầm
                            </button>
                            <button
                                onClick={() => { setShowWelcomeBubble(false); setIsOpen(true); setTimeout(() => handleSend('Gợi ý quà tặng trầm hương'), 100); }}
                                className="text-xs bg-trad-primary/10 hover:bg-trad-primary/20 text-trad-primary px-3 py-1.5 rounded-full transition-colors"
                            >
                                🎁 Quà tặng
                            </button>
                            <button
                                onClick={() => { setShowWelcomeBubble(false); setIsOpen(true); setTimeout(() => handleSend('Hướng dẫn cách đốt trầm'), 100); }}
                                className="text-xs bg-trad-primary/10 hover:bg-trad-primary/20 text-trad-primary px-3 py-1.5 rounded-full transition-colors"
                            >
                                🔥 Cách đốt
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Launcher Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { setIsOpen(!isOpen); setShowWelcomeBubble(false); }}
                className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-colors z-50 ${isOpen ? 'bg-gray-600 text-white' : 'bg-trad-primary text-white'}`}
            >
                {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
            </motion.button>
        </div>
    );
}
