'use client';

import { useEffect, useState } from 'react';
import { Link } from '@/i18n/routing';
import { getPosts, deletePost } from '@/lib/api-client';
import { BlogPost } from '@/types/blog';
import { toast } from 'sonner';

export default function AdminBlogPage() {
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPosts = async () => {
        setLoading(true);
        try {
            const res = await getPosts({ limit: 100, status: 'all' as any }); // Need to update API types to allow fetching all status
            setPosts(res.data || []);
        } catch (error) {
            console.error(error);
            toast.error('Failed to fetch posts');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPosts();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this post?')) return;
        try {
            await deletePost(id);
            toast.success('Post deleted successfully');
            fetchPosts();
        } catch (error) {
            toast.error('Failed to delete post');
        }
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Blog Management</h1>
                <Link href="/admin/blog/new" className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90">
                    Create New Post
                </Link>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden border">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-6 py-3 font-medium text-gray-500">Title</th>
                            <th className="px-6 py-3 font-medium text-gray-500">Status</th>
                            <th className="px-6 py-3 font-medium text-gray-500">Category</th>
                            <th className="px-6 py-3 font-medium text-gray-500">Created At</th>
                            <th className="px-6 py-3 font-medium text-gray-500 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-10 text-center text-gray-500">Loading...</td>
                            </tr>
                        ) : posts.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-10 text-center text-gray-500">No posts found.</td>
                            </tr>
                        ) : (
                            posts.map((post) => (
                                <tr key={post.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        <div className="line-clamp-1 max-w-xs">{post.title}</div>
                                        <div className="text-xs text-gray-400 font-normal">{post.slug}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${post.status === 'published'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {post.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">{post.category || '-'}</td>
                                    <td className="px-6 py-4 text-gray-600">
                                        {new Date(post.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        <Link href={`/admin/blog/${post.id}`} className="text-blue-600 hover:text-blue-800 font-medium">Edit</Link>
                                        <button onClick={() => handleDelete(post.id)} className="text-red-600 hover:text-red-800 font-medium">Delete</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
