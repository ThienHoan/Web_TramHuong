'use client';

import { useState, useRef } from 'react';
import { useLocale } from 'next-intl';
import Image from 'next/image';
import { uploadProductImage, deleteProductImage, validateImageFile } from '@/lib/upload';
import { toast } from 'sonner';
import { AppIcon } from "@/components/icons/AppIcon";

interface ImageUploaderProps {
    images: string[];
    onChange: (images: string[]) => void;
    maxImages?: number;
    disabled?: boolean;
}

export function ImageUploader({
    images,
    onChange,
    maxImages = 5,
    disabled = false,
}: ImageUploaderProps) {
    const locale = useLocale();
    const t = (vi: string, en: string) => locale === 'en' ? en : vi;
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (files: FileList | null) => {
        if (!files || files.length === 0 || disabled || uploading || deleting) return;

        const remainingSlots = maxImages - images.length;
        if (remainingSlots <= 0) {
            toast.error(t(`Chỉ được tải tối đa ${maxImages} ảnh`, `Maximum ${maxImages} images allowed`));
            return;
        }

        const filesToUpload = Array.from(files).slice(0, remainingSlots);
        setUploading(true);
        const newImages = [...images];

        console.log('[ImageUploader] Starting upload, current images:', images);

        try {
            for (const file of filesToUpload) {
                // Validate file
                try {
                    validateImageFile(file);
                } catch (error) {
                    toast.error(`${file.name}: ${error instanceof Error ? error.message : 'Validation failed'}`);
                    continue;
                }

                // Upload to Supabase
                try {
                    const url = await uploadProductImage(file);
                    console.log('[ImageUploader] Upload success! URL:', url);
                    newImages.push(url);
                    toast.success(t(`Đã tải ${file.name}`, `Uploaded ${file.name}`));
                } catch (error) {
                    console.error('[ImageUploader] Upload failed:', error);
                    toast.error(`${file.name}: ${error instanceof Error ? error.message : 'Upload failed'}`);
                }
            }

            console.log('[ImageUploader] All uploads complete. New images array:', newImages);
            onChange(newImages);
        } finally {
            setUploading(false);
            // Reset file input
            if (inputRef.current) {
                inputRef.current.value = '';
            }
        }
    };

    const handleDelete = async (urlToDelete: string) => {
        if (disabled) return;

        setDeleting(urlToDelete);
        try {
            await deleteProductImage(urlToDelete);
            onChange(images.filter(url => url !== urlToDelete));
            toast.success(t('Đã gỡ ảnh khỏi danh sách.', 'Image removed from the list.'));
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Delete failed');
        } finally {
            setDeleting(null);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (disabled) return;

        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (disabled) return;

        if (e.dataTransfer.files) {
            handleFileSelect(e.dataTransfer.files);
        }
    };

    const handleClick = () => {
        if (!disabled && !uploading && !deleting && images.length < maxImages) {
            inputRef.current?.click();
        }
    };

    return (
        <div className="space-y-4">
            {/* Upload Zone */}
            <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer ${dragActive
                    ? 'border-primary bg-primary/5 scale-[1.02]'
                    : disabled
                        ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                        : 'border-gray-300 hover:border-primary hover:bg-gray-50'
                    }`}
                role="button"
                tabIndex={disabled || uploading || !!deleting || images.length >= maxImages ? -1 : 0}
                aria-disabled={disabled || uploading || !!deleting || images.length >= maxImages}
                aria-label={t('Chọn ảnh sản phẩm', 'Choose product images')}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } }}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={handleClick}
            >
                <input
                    ref={inputRef}
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    onChange={(e) => handleFileSelect(e.target.files)}
                    className="hidden"
                    disabled={disabled || uploading || !!deleting || images.length >= maxImages}
                />

                <div className="space-y-2">
                    <div className="flex justify-center">
                        <AppIcon name={uploading ? 'hourglass_empty' : 'cloud_upload'} className="text-5xl text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-700">
                        {uploading ? t('Đang tải ảnh…', 'Uploading…') : images.length >= maxImages ? t('Đã đủ số lượng ảnh', 'Image limit reached') : t('Chọn ảnh hoặc kéo thả vào đây', 'Choose images or drag and drop here')}
                    </p>
                    <p className="text-xs text-gray-500">
                        <span className="block">JPEG, PNG, WebP, AVIF</span><span className="inline-block">{t('Tối đa 5 MB/ảnh', 'Up to 5 MB each')} · {images.length}/{maxImages}</span>
                    </p>
                </div>

                {uploading && (
                    <div className="mt-4">
                        <div role="progressbar" aria-label={t("Đang tải ảnh", "Uploading images")} className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-primary animate-pulse" style={{ width: '100%' }} />
                        </div>
                    </div>
                )}
            </div>

            {/* Image Grid */}
            {images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {images.map((url, index) => (
                        <div key={url} className="relative group aspect-square">
                            <div className="relative w-full h-full rounded-lg overflow-hidden border border-gray-200">
                                <Image
                                    src={url}
                                    alt={`Product image ${index + 1}`}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 768px) 50vw, 25vw"
                                    unoptimized
                                />
                            </div>

                            {/* Delete Button */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(url);
                                }}
                                disabled={!!deleting || disabled || uploading}
                                aria-label={t(`Gỡ ảnh ${index + 1}`, `Remove image ${index + 1}`)}
                                className="absolute top-2 right-2 bg-white text-rose-700 hover:bg-rose-50 p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                type="button"
                            >
                                {deleting === url ? (
                                    <AppIcon name="progress_activity" className="text-sm animate-spin" />
                                ) : (
                                    <AppIcon name="delete" className="text-sm" />
                                )}
                            </button>

                            {/* Primary Badge */}
                            {index === 0 && (
                                <div className="absolute bottom-2 left-2 bg-primary text-white px-2 py-1 rounded-xl text-xs font-bold shadow-md">
                                    {t('Ảnh đại diện', 'Main image')}
                                </div>
                            )}

                            {/* Index Badge */}
                            <div className="absolute top-2 left-2 bg-black/60 text-white px-2 py-1 rounded-xl text-xs font-medium">
                                {index + 1}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Help Text */}
            {images.length === 0 && !uploading && (
                <p className="text-sm text-gray-500 text-center">
                    {t('Ảnh đầu tiên được dùng làm ảnh đại diện.', 'The first image is used as the main product image.')}
                </p>
            )}
        </div>
    );
}
