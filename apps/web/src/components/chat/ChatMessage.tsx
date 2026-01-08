'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import ProductRecommendationCard from './ProductRecommendationCard';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface ChatMessageProps {
    role: 'user' | 'model';
    content: string;
    isTyping?: boolean;
}

export default function ChatMessage({ role, content, isTyping }: ChatMessageProps) {
    const [copied, setCopied] = useState(false);

    // Copy to clipboard handler
    const handleCopy = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            toast.success('Đã sao chép!');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error('Không thể sao chép');
        }
    };

    // 1. Extract JSON blocks if present
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: fix type
    const recommendations: any[] = [];
    let cleanContent = content;

    // Try to find JSON inside code blocks first
    const codeBlockRegex = /```json\s*([\s\S]*?)\s*```/g;
    let match;
    let hasCodeBlock = false;

    while ((match = codeBlockRegex.exec(content)) !== null) {
        hasCodeBlock = true;
        try {
            const parsed = JSON.parse(match[1]);
            if (parsed.recommendations && Array.isArray(parsed.recommendations)) {
                recommendations.push(...parsed.recommendations);
            }
        } catch (e) { console.error('JSON Parse Error (Code Block)', e); }
        // Remove the block from text
        cleanContent = cleanContent.replace(match[0], '');
    }

    // If no code blocks found, try to find raw JSON object structure for recommendations
    if (!hasCodeBlock) {
        const rawJsonRegex = /(\{\s*"recommendations":\s*\[[\s\S]*?\]\s*\})/g;
        while ((match = rawJsonRegex.exec(cleanContent)) !== null) {
            try {
                const parsed = JSON.parse(match[1]);
                if (parsed.recommendations && Array.isArray(parsed.recommendations)) {
                    recommendations.push(...parsed.recommendations);
                    // Remove raw JSON from text
                    cleanContent = cleanContent.replace(match[0], '');
                }
            } catch (e) {
                // If parsing fails (maybe incomplete), leave it as text or hide it? 
                // Better to hide potential raw JSON garbage if it looks like our schema
                console.error('JSON Parse Error (Raw)', e);
            }
        }
    }

    // Clean up any double newlines left behind
    cleanContent = cleanContent.replace(/\n\s*\n/g, '\n').trim();

    if (isTyping) {
        return (
            <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl rounded-tl-none px-4 py-3 max-w-[80%]">
                    <div className="flex gap-1 h-6 items-center">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                    </div>
                </div>
            </div>
        );
    }

    const isUser = role === 'user';

    return (
        <div className={`flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}>
            <div className="group relative max-w-[85%]">
                <div
                    className={cn(
                        "px-4 py-3 text-sm leading-relaxed shadow-sm",
                        isUser
                            ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-none"
                            : "bg-white border border-border text-foreground rounded-2xl rounded-tl-none"
                    )}
                >
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                        <ReactMarkdown>{cleanContent}</ReactMarkdown>
                    </div>
                </div>

                {/* Copy button for model responses */}
                {!isUser && cleanContent && (
                    <button
                        onClick={() => handleCopy(cleanContent)}
                        className="absolute -bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-500 shadow-sm"
                        title="Sao chép"
                    >
                        {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                    </button>
                )}
            </div>

            {/* Render Recommendations if found */}
            {recommendations.length > 0 && (
                <div className="flex flex-col gap-1 w-full max-w-[85%]">
                    <span className="text-xs text-muted-foreground ml-2">Gợi ý sản phẩm:</span>
                    {recommendations.map((prod, idx) => (
                        <ProductRecommendationCard key={idx} product={prod} />
                    ))}
                </div>
            )}
        </div>
    );
}

