'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useOnClickOutside } from '@/hooks/use-on-click-outside';
import ChatMessage from './ChatMessage';
import { chatWithAIStream } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { X, Send, Sparkles, MessageSquare, Trash2, Square } from 'lucide-react';
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

export default function ChatWidget() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');
    const chatRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const prevUserIdRef = useRef<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

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
            } else {
                const errorMsg: Message = { role: 'model', content: "Xin lỗi, hiện tại tôi không thể kết nối. Vui lòng thử lại sau." };
                setMessages([...newHistory, errorMsg]);
                setStreamingContent('');
            }
        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
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
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-4 font-sans text-trad-text-main">
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

            {/* Launcher Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-colors z-50 ${isOpen ? 'bg-gray-600 text-white' : 'bg-trad-primary text-white'}`}
            >
                {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
            </motion.button>
        </div>
    );
}
