'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/i18n/routing';
import { useForm } from 'react-hook-form';
import { Link } from '@/i18n/routing';
import { createPost, updatePost, getPostBySlug } from '@/lib/api-client';
import { BlogPost } from '@/types/blog';
import { toast } from 'sonner';

// Simplified form handling for now
export default function AdminBlogEditPage() {
    // Note: We use 'new' as a magic ID for creating
    const params = useParams();
    const id = params.id as string;
    const isNew = id === 'new';
    const router = useRouter();
    const [loading, setLoading] = useState(!isNew);

    const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<Partial<BlogPost>>({
        defaultValues: {
            status: 'draft',
            is_featured: false
        }
    });

    useEffect(() => {
        if (!isNew) {
            // Fetch post by ID directly (Backend now supports ID lookup via slug param)
            const fetchPost = async () => {
                try {
                    const result = await getPostBySlug(id); // Returns { data, error }
                    if (result.data) {
                        Object.entries(result.data).forEach(([key, value]) => {
                            setValue(key as keyof BlogPost, value);
                        });
                    } else {
                        toast.error(result.error || 'Post not found');
                        router.push('/admin/blog');
                    }
                } catch (e) {
                    console.error(e);
                    toast.error('Failed to load post');
                    router.push('/admin/blog');
                } finally {
                    setLoading(false);
                }
            };
            fetchPost();
        }
    }, [id, isNew, setValue, router]);

    const onSubmit = async (data: Partial<BlogPost>) => {
        try {
            if (isNew) {
                await createPost(data);
                toast.success('Post created successfully');
            } else {
                await updatePost(id, data);
                toast.success('Post updated successfully');
            }
            router.push('/admin/blog');
        } catch (error) {
            console.error(error);
            toast.error('Failed to save post');
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">{isNew ? 'Create Post' : 'Edit Post'}</h1>
                <Link href="/admin/blog" className="text-gray-500 hover:text-gray-900">Cancel</Link>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white p-6 rounded-lg shadow border">

                <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2">
                        <label className="block text-sm font-medium mb-1">Title</label>
                        <input {...register('title', { required: true })} className="w-full border rounded-md p-2" placeholder="Enter post title" />
                        {errors.title && <span className="text-red-500 text-xs">Title is required</span>}
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                        <label className="block text-sm font-medium mb-1">Slug (URL)</label>
                        <input {...register('slug')} className="w-full border rounded-md p-2" placeholder="Auto-generated if empty" />
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                        <label className="block text-sm font-medium mb-1">Category</label>
                        <select {...register('category')} className="w-full border rounded-md p-2">
                            <option value="knowledge">Kiến Thức</option>
                            <option value="culture">Văn Hóa</option>
                            <option value="health">Sức Khỏe</option>
                        </select>
                    </div>

                    <div className="col-span-2">
                        <label className="block text-sm font-medium mb-1">Excerpt (Short Description)</label>
                        <textarea {...register('excerpt')} className="w-full border rounded-md p-2 h-20" placeholder="Brief summary displayed on list page" />
                    </div>

                    <div className="col-span-2">
                        <label className="block text-sm font-medium mb-1">Cover Image URL</label>
                        <input {...register('cover_image')} className="w-full border rounded-md p-2" placeholder="https://..." />
                        {watch('cover_image') && (
                            <div className="mt-2 relative w-full h-40 bg-gray-100 rounded overflow-hidden">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={watch('cover_image')} alt="Preview" className="w-full h-full object-cover" />
                            </div>
                        )}
                    </div>

                    <div className="col-span-2">
                        <label className="block text-sm font-medium mb-1">Content (Rich Text / HTML)</label>
                        <div className="text-xs text-gray-500 mb-2">Since no Rich Editor is installed, please input simplified HTML. Paragraphs &lt;p&gt; are recommended.</div>
                        <textarea {...register('content')} className="w-full border rounded-md p-2 h-96 font-mono text-sm" placeholder="<p>Write your content here...</p>" />
                    </div>

                    <div className="col-span-1">
                        <label className="block text-sm font-medium mb-1">Status</label>
                        <select {...register('status')} className="w-full border rounded-md p-2">
                            <option value="draft">Draft</option>
                            <option value="published">Published</option>
                        </select>
                    </div>

                    <div className="col-span-1 flex items-center pt-6">
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="checkbox" {...register('is_featured')} className="rounded border-gray-300" />
                            <span className="text-sm font-medium">Is Featured Post?</span>
                        </label>
                    </div>
                </div>

                <div className="pt-4 border-t flex justify-end gap-3">
                    <Link href="/admin/blog" className="px-4 py-2 border rounded-md hover:bg-gray-50">Cancel</Link>
                    <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                        {isNew ? 'Create Post' : 'Save Changes'}
                    </button>
                </div>

            </form>
        </div>
    );
}
