'use client';

interface PaginationProps {
    meta: {
        page: number;
        last_page: number;
        total: number;
        limit: number;
    };
    onPageChange: (page: number) => void;
}

export default function Pagination({ meta, onPageChange }: PaginationProps) {
    if (meta.total === 0) return null;

    return (
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
                Showing page <span className="font-bold">{meta.page}</span> of <span className="font-bold">{meta.last_page}</span>
                <span className="mx-2">|</span>
                Total <span className="font-bold">{meta.total}</span> items
            </p>
            <div className="flex gap-2">
                <button
                    onClick={() => onPageChange(meta.page - 1)}
                    disabled={meta.page <= 1}
                    className="px-3 py-1 bg-white border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-gray-700"
                >
                    Previous
                </button>
                <div className="flex gap-1">
                </div>
                <button
                    onClick={() => onPageChange(meta.page + 1)}
                    disabled={meta.page >= meta.last_page}
                    className="px-3 py-1 bg-white border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-gray-700"
                >
                    Next
                </button>
            </div>
        </div>
    );
}
