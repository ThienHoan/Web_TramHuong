'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { uploadProductImage, deleteProductImage, validateImageFile } from '@/lib/upload';
import { toast } from 'sonner';

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
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (files: FileList | null) => {
        if (!files || files.length === 0 || disabled) return;

        const remainingSlots = maxImages - images.length;
        if (remainingSlots <= 0) {
            toast.error(`Maximum ${maxImages} images allowed`);
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
                    toast.success(`Uploaded ${file.name}`);
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
            toast.success('Image deleted');
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
        if (!disabled) {
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
                    disabled={disabled}
                />

                <div className="space-y-2">
                    <div className="flex justify-center">
                        <span className="material-symbols-outlined text-5xl text-gray-400">
                            {uploading ? 'hourglass_empty' : 'cloud_upload'}
                        </span>
                    </div>
                    <p className="text-sm font-medium text-gray-700">
                        {uploading ? 'Uploading...' : 'Drag and drop images here, or click to select'}
                    </p>
                    <p className="text-xs text-gray-500">
                        JPEG, PNG, WebP, AVIF (max 5MB each) • {images.length}/{maxImages} images
                    </p>
                </div>

                {uploading && (
                    <div className="mt-4">
                        <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-primary animate-pulse" style={{ width: '60%' }} />
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
                                disabled={!!deleting || disabled}
                                className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                                type="button"
                            >
                                {deleting === url ? (
                                    <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                                ) : (
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                )}
                            </button>

                            {/* Primary Badge */}
                            {index === 0 && (
                                <div className="absolute bottom-2 left-2 bg-primary text-white px-2 py-1 rounded text-xs font-bold shadow-md">
                                    Primary
                                </div>
                            )}

                            {/* Index Badge */}
                            <div className="absolute top-2 left-2 bg-black/60 text-white px-2 py-1 rounded text-xs font-medium">
                                {index + 1}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Help Text */}
            {images.length === 0 && !uploading && (
                <p className="text-sm text-gray-500 text-center">
                    The first image uploaded will be the primary product image
                </p>
            )}
        </div>
    );
}
