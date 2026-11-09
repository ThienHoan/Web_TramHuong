'use client';

import { useState, useRef, type ReactNode } from 'react';
import { useLocale } from 'next-intl';
import Image from 'next/image';
import { uploadProductImage, deleteProductImage, validateImageFile } from '@/lib/upload';
import { shrinkImageIfNeeded } from '@/lib/shrink-image';
import { toast } from 'sonner';
import { AppIcon } from "@/components/icons/AppIcon";

interface ImageUploaderProps {
    images: string[];
    onChange: (images: string[]) => void;
    maxImages?: number;
    disabled?: boolean;
}

export function ImageDropzone({ onFiles, count, maxImages, busy = false, disabled = false }: {
    onFiles: (files: File[]) => void;
    count: number;
    maxImages: number;
    busy?: boolean;
    disabled?: boolean;
}) {
    const locale = useLocale();
    const t = (vi: string, en: string) => locale === 'en' ? en : vi;
    const [dragActive, setDragActive] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const locked = disabled || busy || count >= maxImages;

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

        if (!locked && e.dataTransfer.files) {
            onFiles(Array.from(e.dataTransfer.files));
        }
    };

    const handleClick = () => {
        if (!locked) inputRef.current?.click();
    };

    return (
        <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer ${dragActive
                ? 'border-primary bg-primary/5 scale-[1.02]'
                : disabled
                    ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                    : 'border-gray-300 hover:border-primary hover:bg-gray-50'
                }`}
            role="button"
            tabIndex={locked ? -1 : 0}
            aria-disabled={locked}
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
                onChange={(e) => {
                    if (e.target.files) onFiles(Array.from(e.target.files));
                    e.target.value = '';
                }}
                className="hidden"
                disabled={locked}
            />

            <div className="space-y-2">
                <div className="flex justify-center">
                    <AppIcon name={busy ? 'hourglass_empty' : 'cloud_upload'} className="text-5xl text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-700">
                    {busy ? t('Đang tải ảnh…', 'Uploading…') : count >= maxImages ? t('Đã đủ số lượng ảnh', 'Image limit reached') : t('Chọn ảnh hoặc kéo thả vào đây', 'Choose images or drag and drop here')}
                </p>
                <p className="text-xs text-gray-500">
                    <span className="block">JPEG, PNG, WebP, AVIF</span><span className="inline-block">{t('Ảnh lớn sẽ tự thu nhỏ', 'Large photos are shrunk automatically')} · {count}/{maxImages}</span>
                </p>
            </div>

            {busy && (
                <div className="mt-4">
                    <div role="progressbar" aria-label={t("Đang tải ảnh", "Uploading images")} className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-primary animate-pulse" style={{ width: '100%' }} />
                    </div>
                </div>
            )}
        </div>
    );
}

export function ImageTileGrid({ children }: { children: ReactNode }) {
    return <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{children}</div>;
}

export function ImageTile({ src, index, removing = false, disabled = false, onRemove, onMakeMain }: {
    src: string;
    index: number;
    removing?: boolean;
    disabled?: boolean;
    onRemove: () => void;
    onMakeMain?: () => void;
}) {
    const locale = useLocale();
    const t = (vi: string, en: string) => locale === 'en' ? en : vi;
    return (
        <div className="relative group aspect-square">
            <div className="relative w-full h-full rounded-lg overflow-hidden border border-gray-200">
                <Image
                    src={src}
                    alt={`Product image ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 25vw"
                    unoptimized
                />
            </div>

            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                }}
                disabled={disabled}
                aria-label={t(`Gỡ ảnh ${index + 1}`, `Remove image ${index + 1}`)}
                className="absolute top-2 right-2 bg-white text-rose-700 hover:bg-rose-50 p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
            >
                {removing ? (
                    <AppIcon name="progress_activity" className="text-sm animate-spin" />
                ) : (
                    <AppIcon name="delete" className="text-sm" />
                )}
            </button>

            {index === 0 && (
                <div className="absolute bottom-2 left-2 bg-primary text-white px-2 py-1 rounded-xl text-xs font-bold shadow-md">
                    {t('Ảnh đại diện', 'Main image')}
                </div>
            )}

            {index !== 0 && onMakeMain && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onMakeMain();
                    }}
                    disabled={disabled}
                    className="absolute bottom-2 left-2 bg-white text-gray-800 hover:bg-gray-100 px-2 py-1 rounded-xl text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    type="button"
                >
                    {t('Đặt làm đại diện', 'Make main')}
                </button>
            )}

            <div className="absolute top-2 left-2 bg-black/60 text-white px-2 py-1 rounded-xl text-xs font-medium">
                {index + 1}
            </div>
        </div>
    );
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
    const [deleting, setDeleting] = useState<string | null>(null);

    const handleFileSelect = async (files: File[]) => {
        if (files.length === 0 || disabled || uploading || deleting) return;

        const remainingSlots = maxImages - images.length;
        if (remainingSlots <= 0) {
            toast.error(t(`Chỉ được tải tối đa ${maxImages} ảnh`, `Maximum ${maxImages} images allowed`));
            return;
        }

        const filesToUpload = files.slice(0, remainingSlots);
        setUploading(true);
        const newImages = [...images];

        try {
            for (const file of filesToUpload) {
                // Shrink large photos, then validate
                let prepared: File;
                try {
                    prepared = await shrinkImageIfNeeded(file);
                    validateImageFile(prepared);
                } catch (error) {
                    toast.error(`${file.name}: ${error instanceof Error ? error.message : 'Validation failed'}`);
                    continue;
                }

                // Upload to Supabase
                try {
                    const url = await uploadProductImage(prepared);
                    newImages.push(url);
                    toast.success(t(`Đã tải ${file.name}`, `Uploaded ${file.name}`));
                } catch (error) {
                    console.error('[ImageUploader] Upload failed:', error);
                    toast.error(`${file.name}: ${error instanceof Error ? error.message : 'Upload failed'}`);
                }
            }

            onChange(newImages);
        } finally {
            setUploading(false);
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

    return (
        <div className="space-y-4">
            <ImageDropzone
                onFiles={handleFileSelect}
                count={images.length}
                maxImages={maxImages}
                busy={uploading}
                disabled={disabled || !!deleting}
            />

            {images.length > 0 && (
                <ImageTileGrid>
                    {images.map((url, index) => (
                        <ImageTile
                            key={url}
                            src={url}
                            index={index}
                            removing={deleting === url}
                            disabled={!!deleting || disabled || uploading}
                            onRemove={() => handleDelete(url)}
                        />
                    ))}
                </ImageTileGrid>
            )}

            {images.length === 0 && !uploading && (
                <p className="text-sm text-gray-500 text-center">
                    {t('Ảnh đầu tiên được dùng làm ảnh đại diện.', 'The first image is used as the main product image.')}
                </p>
            )}
        </div>
    );
}
