'use client';

import { getContacts, updateContactStatus } from '@/lib/api-client';
import useSWR from 'swr';
import { toast } from 'sonner';
import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function AdminContactsPage() {
    const { data, error, isLoading, mutate } = useSWR('/contacts', () => getContacts());
    const [selectedContact, setSelectedContact] = useState<any>(null);

    const contacts = data?.data || [];
    const meta = data?.meta;

    const handleMarkAsRead = async (id: string, currentStatus: string) => {
        if (currentStatus !== 'new') return;
        try {
            await updateContactStatus(id, 'read');
            toast.success('Đã đánh dấu là đã đọc');
            mutate();
            // Update selected contact if open
            if (selectedContact && selectedContact.id === id) {
                setSelectedContact({ ...selectedContact, status: 'read' });
            }
        } catch (e) {
            toast.error('Lỗi khi cập nhật trạng thái');
        }
    };

    const StatusBadge = ({ status }: { status: string }) => {
        if (status === 'new') return <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">Mới</span>;
        if (status === 'read') return <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded">Đã xem</span>;
        return <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">Đã trả lời</span>;
    };

    if (isLoading) return <div className="p-8 text-center text-gray-500">Đang tải dữ liệu...</div>;
    if (error) return <div className="p-8 text-center text-red-500">Lỗi: {error.message || 'Không thể tải dữ liệu'}</div>;

    return (
        <div className="bg-white rounded-lg shadow border border-gray-200">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Danh sách Liên hệ</h1>
                <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                    Tổng: {meta?.total || 0}
                </span>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th className="px-6 py-3">Ngày gửi</th>
                            <th className="px-6 py-3">Người gửi</th>
                            <th className="px-6 py-3">Chủ đề</th>
                            <th className="px-6 py-3">Lời nhắn</th>
                            <th className="px-6 py-3">Trạng thái</th>
                            <th className="px-6 py-3 text-right">Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {contacts.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                                    Chưa có liên hệ nào.
                                </td>
                            </tr>
                        ) : (
                            contacts.map((contact: any) => (
                                <tr
                                    key={contact.id}
                                    className="bg-white border-b hover:bg-gray-50 cursor-pointer transition-colors"
                                    onClick={() => setSelectedContact(contact)}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {new Date(contact.created_at).toLocaleDateString('vi-VN', {
                                            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                        })}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900">{contact.full_name}</div>
                                        <div className="text-gray-400 text-xs">{contact.email}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2 py-0.5 rounded border border-gray-200">
                                            {contact.topic || 'Khác'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 max-w-xs truncate" title={contact.message}>
                                        {contact.message}
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={contact.status} />
                                    </td>
                                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setSelectedContact(contact)}
                                            className="text-blue-600 hover:text-blue-800"
                                        >
                                            Chi tiết
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Detail Dialog */}
            <Dialog open={!!selectedContact} onOpenChange={(open) => !open && setSelectedContact(null)}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    {selectedContact && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="text-xl font-bold flex items-center justify-between">
                                    <span>Chi tiết Liên hệ</span>
                                    <StatusBadge status={selectedContact.status} />
                                </DialogTitle>
                                <DialogDescription>
                                    Gửi lúc: {new Date(selectedContact.created_at).toLocaleString('vi-VN')}
                                </DialogDescription>
                            </DialogHeader>

                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-gray-50 rounded-lg">
                                        <p className="text-sm font-medium text-gray-500 mb-1">Người gửi</p>
                                        <p className="font-bold text-gray-900">{selectedContact.full_name}</p>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-lg">
                                        <p className="text-sm font-medium text-gray-500 mb-1">Email</p>
                                        <p className="font-bold text-gray-900 break-words">{selectedContact.email}</p>
                                    </div>
                                </div>

                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <p className="text-sm font-medium text-gray-500 mb-1">Chủ đề</p>
                                    <p className="font-bold text-gray-900">{selectedContact.topic || 'Khác'}</p>
                                </div>

                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <p className="text-sm font-medium text-gray-500 mb-2">Nội dung tin nhắn</p>
                                    <div className="bg-white p-4 rounded border border-gray-200 text-gray-800 whitespace-pre-wrap font-sans text-sm leading-relaxed">
                                        {selectedContact.message}
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="gap-2 sm:gap-0">
                                {selectedContact.status === 'new' && (
                                    <Button
                                        onClick={() => handleMarkAsRead(selectedContact.id, 'new')}
                                        variant="outline"
                                        className="w-full sm:w-auto"
                                    >
                                        <span className="material-symbols-outlined text-[18px] mr-2">check</span>
                                        Đánh dấu đã đọc
                                    </Button>
                                )}
                                <Button
                                    className="w-full ml-3 sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
                                    onClick={() => window.location.href = `mailto:${selectedContact.email}?subject=Phản hồi: ${selectedContact.topic}`}
                                >
                                    <span className="material-symbols-outlined text-[18px] mr-2">reply</span>
                                    Phản hồi qua Email
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
