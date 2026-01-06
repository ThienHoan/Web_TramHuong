import React from 'react';

interface EmptyStateProps {
    title?: string;
    description?: string;
    icon?: string;
    action?: React.ReactNode;
}

export default function EmptyState({
    title = 'Không có dữ liệu',
    description = 'Hiện tại chưa có nội dung nào để hiển thị.',
    icon = 'inbox',
    action
}: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center animate-fade-in-up">
            <div className="bg-trad-bg-warm rounded-full p-6 mb-4">
                <span className="material-symbols-outlined text-4xl text-trad-text-muted/50">{icon}</span>
            </div>
            <h3 className="text-lg font-bold text-trad-text-main mb-2 font-display">{title}</h3>
            <p className="text-trad-text-muted text-sm max-w-sm mb-6">{description}</p>
            {action && (
                <div className="mt-2">
                    {action}
                </div>
            )}
        </div>
    );
}
