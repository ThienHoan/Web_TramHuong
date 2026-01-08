import { Link } from '@/i18n/routing';
import TraditionalHeader from '@/components/traditional/TraditionalHeader';
import TraditionalFooter from '@/components/traditional/TraditionalFooter';
import { getPostBySlug, getPosts } from '@/lib/api-client';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { BlogPost } from '@/types/blog';
import ZenBlogDetail from '@/components/zen/ZenBlogDetail';
import ZenFooter from '@/components/zen/ZenFooter';

interface PageProps {
    params: Promise<{
        slug: string;
        locale: string;
    }>;
}

const CATEGORIES = [
    { id: 'all', name: 'Tất Cả' },
    { id: 'knowledge', name: 'Kiến Thức' },
    { id: 'culture', name: 'Văn Hóa' },
    { id: 'health', name: 'Sức Khỏe' }
];

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    try {
        const { data: post } = await getPostBySlug(slug);
        return {
            title: post?.seo_title || post?.title || 'Bài viết Trầm Hương',
            description: post?.seo_description || post?.excerpt || 'Khám phá kiến thức trầm hương.',
            openGraph: {
                images: post?.cover_image ? [post.cover_image] : []
            }
        };
    } catch {
        return {
            title: 'Bài viết không tồn tại'
        };
    }
}

export default async function BlogDetailPage({ params }: PageProps) {
    const { slug, locale } = await params;

    let post: BlogPost | null;
    let relatedPosts: BlogPost[] = [];

    try {
        const { data } = await getPostBySlug(slug);
        post = data;
        if (!post) notFound();

        // Fetch related posts (parallel)
        if (post.category) {
            const currentPostId = post.id;
            const related = await getPosts({
                limit: 3,
                category: post.category
            });
            relatedPosts = related.data?.filter(i => i.id !== currentPostId).slice(0, 3) || [];
        }
    } catch (error) {
        console.error('Failed to fetch post', error);
        notFound();
    }

    if (!post) return notFound(); // Should be handled by catch/notFound above but typescript might complain

    if (locale !== 'vi') {
        return (
            <>
                <ZenBlogDetail post={post} relatedPosts={relatedPosts} />
                <ZenFooter />
            </>
        );
    }

    return (
        <div className="bg-trad-bg-light font-display text-trad-text-main antialiased min-h-screen flex flex-col selection:bg-trad-primary selection:text-white bg-pattern-lotus">
            <TraditionalHeader />

            <main className="min-h-screen pb-20 flex-grow">
                {/* Breadcrumb & Back Link */}
                <div className="container mx-auto px-4 py-8 max-w-4xl">
                    <Link className="inline-flex items-center text-trad-primary hover:text-trad-primary-dark transition-colors group mb-6" href="/blog">
                        <span className="material-symbols-outlined text-xl mr-1 group-hover:-translate-x-1 transition-transform">arrow_back</span>
                        <span className="font-medium italic">Quay lại Thư Viện</span>
                    </Link>

                    {/* Article Header */}
                    <div className="text-center mb-10 space-y-6">
                        {post.category && (
                            <div className="inline-block px-4 py-1 rounded-full bg-trad-primary/10 text-trad-primary text-sm font-bold uppercase tracking-wider border border-trad-primary/20">
                                {CATEGORIES.find(c => c.id === post.category)?.name || post.category}
                            </div>
                        )}
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-trad-red-900 leading-tight font-display">
                            {post.title}
                        </h1>
                        {/* Meta Info Strip */}
                        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-trad-text-muted border-t border-b border-trad-primary/20 py-4 mx-auto max-w-2xl">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-trad-primary text-lg">edit</span>
                                <span>Viết bởi: <span className="font-bold text-trad-text-main">Nghệ nhân Thiên Phúc</span></span>
                            </div>
                            <div className="hidden sm:block w-1 h-1 bg-trad-primary rounded-full"></div>
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-trad-primary text-lg">calendar_today</span>
                                <span>{new Date(post.created_at).toLocaleDateString('vi-VN')}</span>
                            </div>
                            <div className="hidden sm:block w-1 h-1 bg-trad-primary rounded-full"></div>
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-trad-primary text-lg">timer</span>
                                <span>5 phút đọc</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Hero Image */}
                <div className="container mx-auto px-4 mb-16 max-w-5xl">
                    <div className="relative aspect-video w-full rounded-xl overflow-hidden shadow-2xl border-4 border-white">
                        <Image
                            src={post.cover_image || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCnK_XjLPiB3glbU1xH5EDARsmY6II7-YfflRk1LCKk3e75qMPsVis3xtp2PUl8-GKTx4-FHrGdDg00tThlipTvONNe-UG6VC62x9cdkeMrPSQfjv4hgw7U8sbAOJ9vVPBLo206UtpKs3dEdfiPuH6OtZy_W29M1ViOBOAdMI_jtPL0mwvsN6zVQJ6TWXVGCc47HJxYGHNc_HGBAetu-n0jc5PSN33qEHXnRyU1ZrMaGEx11Cx9yrs_QgDyKLIC5IKmtizUwn2a0-wH'}
                            alt={post.title}
                            fill
                            className="object-cover transform hover:scale-105 transition-transform duration-700"
                            priority
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none"></div>
                        <div className="absolute bottom-6 right-6 text-white/80 text-sm italic font-light">
                            Ảnh: Thiên Phúc
                        </div>
                    </div>
                </div>

                {/* Narrative Content */}
                <article className="container mx-auto px-4 max-w-3xl prose prose-base md:prose-lg prose-headings:text-trad-red-900 prose-headings:font-display prose-headings:font-bold prose-a:text-trad-primary hover:prose-a:text-trad-primary-dark prose-img:shadow-lg prose-img:rounded-xl">
                    {post.excerpt && (
                        <p className="lead text-lg md:text-2xl text-trad-gray italic font-light leading-relaxed mb-8 border-l-4 border-trad-primary pl-4 md:pl-6">
                            &quot;{post.excerpt}&quot;
                        </p>
                    )}

                    <div dangerouslySetInnerHTML={{ __html: post.content || '' }} />

                    {/* Author Bio */}
                    <div className="mt-12 bg-white p-8 rounded-xl shadow-sm border border-trad-primary/10 flex flex-col md:flex-row gap-6 items-center md:items-start text-center md:text-left">
                        <Image
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuD7DCXj3XsW8cpLTzrzMlp26-JVZrCNG2myVfgXHB9EM0H_RtrOgpU4xKN1fu6qIs1vzHvwXbF3OHepUrtFtQYMtowk460dNyCc-OpvQcHuLywE8BwUfW8CjTDu-b2GbvXHTcN9Uyk5Xr4scnoUl3IlWoleUvDaAavPzkmcvd1G_bIGuT7tZ3620MI9Y5pdHHYJC_6zf-IZXbzxboAqeId1u8hdLqmkvLslKMT1UpgzPZNzvixfex6VpxZb-yWuiyR5YafgaVvb2YUJ"
                            alt="Nghệ nhân Thiên Phúc"
                            width={96}
                            height={96}
                            className="rounded-full object-cover border-4 border-trad-primary/20"
                        />
                        <div>
                            <h4 className="text-xl font-bold text-trad-primary mb-2">Lời Người Kể: Nghệ Nhân Thiên Phúc</h4>
                            <p className="text-trad-gray text-sm leading-relaxed">
                                Với hơn 20 năm gắn bó với nghề làm trầm, tôi mong muốn mang những giá trị văn hóa truyền thống tốt đẹp nhất đến với mọi gia đình Việt.
                            </p>
                            <Link className="inline-block mt-4 text-trad-primary hover:text-trad-primary-dark font-bold text-sm uppercase tracking-wide" href="/blog">
                                Xem các bài viết khác →
                            </Link>
                        </div>
                    </div>
                </article>

                {/* Related Posts */}
                {relatedPosts.length > 0 && (
                    <section className="container mx-auto px-4 mt-24 max-w-6xl">
                        <div className="flex items-center justify-between mb-10">
                            <h2 className="text-3xl font-bold text-trad-text-main border-l-4 border-trad-primary pl-4">
                                Những Chương Tiếp Theo
                            </h2>
                            <Link className="hidden md:flex items-center text-trad-primary font-bold hover:underline" href="/blog">
                                Xem tất cả <span className="material-symbols-outlined ml-1">arrow_forward</span>
                            </Link>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {relatedPosts.map(rel => (
                                <Link key={rel.id} className="group block h-full" href={`/blog/${rel.slug}`}>
                                    <article className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 h-full border border-gray-100 flex flex-col">
                                        <div className="relative overflow-hidden aspect-[4/3]">
                                            <Image
                                                src={rel.cover_image || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDFL_XVrAUKC05bRAjNW5Ld8gDiiE7fNpJw4dmkeZTavDUAPUfXDgg2ZM_lEL5wdG7k2g039g424F7MDHIhNWUkZrn8oa6KzCFSzdpotZxJq4IYMfdEj8x8-hXgyR7yPtBE20w-uDJ_p9bJobwDbmfEt8WSAjvehCk94ghXkH7TggFP52XAza6YlNyx3k4dSypMdck1TzYhtWzfoMpQ-P2l8_Op5GmsAbjbDM1HSGDmvYAc-ROwEopVAUEx2QAVPEgs4YCWbew9DOq9'}
                                                alt={rel.title}
                                                fill
                                                className="object-cover transform group-hover:scale-110 transition-transform duration-500"
                                            />
                                            <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/60 to-transparent"></div>
                                            <span className="absolute bottom-4 left-4 text-white text-xs font-bold uppercase tracking-wide bg-trad-primary px-2 py-1 rounded-md">
                                                {CATEGORIES.find(c => c.id === rel.category)?.name || 'Bài viết'}
                                            </span>
                                        </div>
                                        <div className="p-6 flex flex-col flex-grow">
                                            <h3 className="text-xl font-bold text-trad-text-main mb-3 group-hover:text-trad-primary transition-colors line-clamp-2">
                                                {rel.title}
                                            </h3>
                                            <p className="text-trad-text-muted text-sm line-clamp-3 mb-4 flex-grow">
                                                {rel.excerpt}
                                            </p>
                                            <div className="text-xs text-black/40 mt-auto flex items-center gap-2">
                                                <span className="material-symbols-outlined text-sm">schedule</span> {new Date(rel.created_at).toLocaleDateString('vi-VN')}
                                            </div>
                                        </div>
                                    </article>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}
            </main>
            <TraditionalFooter />
        </div>
    );
}
