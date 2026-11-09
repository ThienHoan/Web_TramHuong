'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Plus, Save } from 'lucide-react';
import { useRouter } from '@/i18n/routing';
import { useForm } from 'react-hook-form';
import { createPost, updatePost, getPostBySlug } from '@/lib/api-client';
import { BlogPost } from '@/types/blog';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdminCheck, AdminField, AdminForm, AdminFormActions, AdminFormLoading, AdminFormPage, AdminFormSection, useAdminText } from '@/components/admin/AdminForm';

export default function AdminBlogEditPage() {
    // Note: We use 'new' as a magic ID for creating
    const params = useParams();
    const id = params.id as string;
    const isNew = id === 'new';
    const { t } = useAdminText();
    const router = useRouter();
    const [loading, setLoading] = useState(!isNew);

    const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<Partial<BlogPost>>({
        defaultValues: {
            status: 'draft',
            category: 'knowledge',
            is_featured: false
        }
    });

    useEffect(() => {
        if (!isNew) {
            // Fetch post by ID directly (Backend now supports ID lookup via slug param)
            const fetchPost = async () => {
                try {
                    const result = await getPostBySlug(id, true); // Returns { data, error }
                    if (result.data) {
                        Object.entries(result.data).filter(([key]) => ['title', 'slug', 'content', 'excerpt', 'category', 'cover_image', 'is_featured', 'status', 'seo_title', 'seo_description'].includes(key)).forEach(([key, value]) => {
                            setValue(key as keyof BlogPost, value);
                        });
                    } else {
                        toast.error(result.error || t('Không tìm thấy bài viết', 'Post not found'));
                        router.push('/admin/blog');
                    }
                } catch (e) {
                    console.error(e);
                    toast.error(t('Không thể tải bài viết', 'Failed to load post'));
                    router.push('/admin/blog');
                } finally {
                    setLoading(false);
                }
            };
            fetchPost();
        }
    }, [id, isNew, setValue, router, t]);

    const onSubmit = async (data: Partial<BlogPost>) => {
        try {
            if (isNew) {
                await createPost(data);
                toast.success(t('Đã tạo bài viết', 'Post created successfully'));
            } else {
                await updatePost(id, data);
                toast.success(t('Đã cập nhật bài viết', 'Post updated successfully'));
            }
            router.push('/admin/blog');
        } catch (error) {
            console.error(error);
            toast.error(t('Không thể lưu bài viết', 'Failed to save post'));
        }
    };

    if (loading) return <AdminFormLoading />;

    const coverImage = watch('cover_image');

    return (
        <AdminFormPage
            backHref="/admin/blog"
            backLabel={t('Bài viết', 'Journal')}
            title={isNew ? t('Thêm bài viết', 'Add post') : t('Sửa bài viết', 'Edit post')}
            description={t('Soạn nội dung và thiết lập cách bài viết hiển thị.', 'Write the content and choose how the post is displayed.')}
        >
            <AdminForm
                onSubmit={handleSubmit(onSubmit)}
                busy={isSubmitting}
                actions={<AdminFormActions
                    cancelHref="/admin/blog"
                    note={t('Bài ở trạng thái Bản nháp sẽ chưa hiển thị với khách.', 'Draft posts are not visible to customers.')}
                    submitLabel={isNew ? t('Tạo bài viết', 'Create post') : t('Lưu thay đổi', 'Save changes')}
                    busyLabel={t('Đang lưu…', 'Saving…')}
                    busy={isSubmitting}
                    icon={isNew ? <Plus aria-hidden="true" /> : <Save aria-hidden="true" />}
                />}
                side={<>
                    <AdminFormSection id="post-publishing" title={t('Xuất bản', 'Publishing')}>
                        <AdminField id="post-status" label={t('Trạng thái', 'Status')}>
                            <Select value={watch('status') || 'draft'} onValueChange={value => setValue('status', value as BlogPost['status'])} disabled={isSubmitting}>
                                <SelectTrigger id="post-status"><SelectValue /></SelectTrigger>
                                <SelectContent className="admin-menu">
                                    <SelectItem value="draft">{t('Bản nháp', 'Draft')}</SelectItem>
                                    <SelectItem value="published">{t('Đã xuất bản', 'Published')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </AdminField>
                        <AdminCheck id="post-featured" label={t('Bài viết nổi bật', 'Featured post')} {...register('is_featured')} />
                    </AdminFormSection>
                    <AdminFormSection id="post-organization" title={t('Phân loại & đường dẫn', 'Organization & URL')}>
                        <AdminField id="post-category" label={t('Chuyên mục', 'Category')}>
                            <Select value={watch('category') || 'knowledge'} onValueChange={value => setValue('category', value)} disabled={isSubmitting}>
                                <SelectTrigger id="post-category"><SelectValue /></SelectTrigger>
                                <SelectContent className="admin-menu">
                                    <SelectItem value="knowledge">{t('Kiến thức', 'Knowledge')}</SelectItem>
                                    <SelectItem value="culture">{t('Văn hóa', 'Culture')}</SelectItem>
                                    <SelectItem value="health">{t('Sức khỏe', 'Health')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </AdminField>
                        <AdminField id="post-slug" label={t('Đường dẫn bài viết', 'Post URL handle')} hint={t('Để trống để tự tạo từ tiêu đề.', 'Leave blank to generate it from the title.')}>
                            <Input id="post-slug" aria-describedby="post-slug-hint" {...register('slug')} />
                        </AdminField>
                    </AdminFormSection>
                    <AdminFormSection id="post-cover" title={t('Ảnh bìa', 'Cover image')}>
                        <AdminField id="post-cover-url" label={t('Link ảnh', 'Image URL')}>
                            <Input id="post-cover-url" placeholder="https://..." {...register('cover_image')} />
                        </AdminField>
                        {coverImage && (
                            <div className="admin-form-cover">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={coverImage} alt={t('Xem trước ảnh bìa', 'Cover preview')} />
                            </div>
                        )}
                    </AdminFormSection>
                </>}
            >
                <AdminFormSection id="post-content" title={t('Nội dung bài viết', 'Post content')}>
                    <AdminField id="post-title" label={t('Tiêu đề', 'Title')} required>
                        <Input id="post-title" aria-invalid={!!errors.title} {...register('title', { required: true })} />
                        {errors.title && <p role="alert" className="text-red-700">{t('Vui lòng nhập tiêu đề.', 'Title is required.')}</p>}
                    </AdminField>
                    <AdminField id="post-excerpt" label={t('Mô tả ngắn', 'Excerpt')} hint={t('Hiển thị ở trang danh sách bài viết.', 'Shown on the post list page.')}>
                        <textarea id="post-excerpt" rows={3} aria-describedby="post-excerpt-hint" {...register('excerpt')} />
                    </AdminField>
                    <AdminField id="post-body" label={t('Nội dung (HTML)', 'Content (HTML)')} hint={t('Nhập HTML đơn giản, nên chia đoạn bằng thẻ <p>.', 'Enter simple HTML. Use <p> tags for paragraphs.')}>
                        <textarea id="post-body" rows={18} className="font-mono" aria-describedby="post-body-hint" placeholder="<p>…</p>" {...register('content')} />
                    </AdminField>
                </AdminFormSection>
            </AdminForm>
        </AdminFormPage>
    );
}
