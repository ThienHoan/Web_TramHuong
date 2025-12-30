import { getPosts } from '@/lib/api-client';
import TraditionalHeader from '@/components/traditional/TraditionalHeader';
import TraditionalFooter from '@/components/traditional/TraditionalFooter';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { BlogToolbar } from '@/components/blog/BlogToolbar';
import { Metadata } from 'next';
import ZenBlogList from '@/components/zen/ZenBlogList';
import ZenFooter from '@/components/zen/ZenFooter';

export const metadata: Metadata = {
    title: 'Thư Viện Trầm Hương - Kiến Thức & Văn Hóa',
    description: 'Khám phá thế giới Trầm Hương, văn hóa tâm linh và sức khỏe.',
};

export default async function BlogListPage({
    params,
    searchParams,
}: {
    params: Promise<{ locale: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const { locale } = await params;
    const search = await searchParams;

    const page = typeof search.page === 'string' ? parseInt(search.page) : 1;
    const categoryQuery = typeof search.category === 'string' ? search.category : undefined;
    const searchQuery = typeof search.search === 'string' ? search.search : undefined;

    // Fetch on Server
    const { data: posts, meta } = await getPosts({
        page,
        limit: 10,
        category: categoryQuery,
        search: searchQuery,
        status: 'published'
    });

    const featuredPost = (posts && posts.length > 0 && !searchQuery && !categoryQuery && page === 1)
        ? posts.find(p => p.is_featured) || posts[0]
        : null;

    if (locale !== 'vi') {
        const zenMeta = meta ? {
            currentPage: meta.currentPage || page,
            totalPages: meta.totalPages || 1,
            totalItems: meta.totalItems || 0
        } : {
            currentPage: 1,
            totalPages: 1,
            totalItems: 0
        };

        return (
            <>
                <ZenBlogList
                    posts={posts || []}
                    meta={zenMeta}
                    featuredPost={featuredPost || null}
                    searchParams={{
                        page,
                        category: categoryQuery,
                        search: searchQuery
                    }}
                />
                <ZenFooter />
            </>
        );
    }

    // Traditional UI (Vietnamese)
    const listPosts = featuredPost
        ? posts.filter(p => p.id !== featuredPost.id)
        : posts;

    const CATEGORIES = [
        { id: 'all', name: 'Tất Cả' },
        { id: 'knowledge', name: 'Kiến Thức Trầm Hương' },
        { id: 'culture', name: 'Văn Hóa & Tâm Linh' },
        { id: 'health', name: 'Sức Khỏe & Đời Sống' }
    ];

    return (
        <div className="bg-trad-bg-light font-display text-trad-text-main antialiased min-h-screen flex flex-col selection:bg-trad-primary selection:text-white">
            <TraditionalHeader />

            <div className="w-full bg-trad-cream/50">
                {/* Breadcrumbs */}
                <div className="w-full flex justify-center pt-6">
                    <div className="max-w-[1200px] w-full px-4 lg:px-10">
                        <div className="flex flex-wrap gap-2 items-center text-sm">
                            <Link className="text-trad-text-muted hover:text-trad-primary transition-colors font-medium leading-normal" href="/">Trang Chủ</Link>
                            <span className="material-symbols-outlined text-[14px] text-trad-text-muted">chevron_right</span>
                            <span className="text-trad-text-main font-medium leading-normal">Thư Viện Hương Trầm</span>
                        </div>
                    </div>
                </div>

                {/* Page Heading & Intro */}
                <div className="w-full flex justify-center py-8 lg:py-12 bg-pattern">
                    <div className="max-w-[1200px] w-full px-4 lg:px-10">
                        <div className="flex flex-col gap-4 text-center items-center">
                            <h1 className="text-trad-text-main text-4xl lg:text-5xl font-black leading-tight tracking-[-0.02em] font-display">Thư Viện Hương Trầm</h1>
                            <div className="w-24 h-1 bg-trad-primary rounded-full mb-2"></div>
                            <p className="text-trad-text-muted text-lg lg:text-xl font-normal leading-relaxed max-w-2xl font-serif italic">
                                "Nơi Câu Chuyện Khởi Nguồn - Khám phá những câu chuyện sâu sắc về văn hóa, sức khỏe và nghệ thuật thưởng trầm truyền thống."
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <main className="w-full flex justify-center py-8 lg:py-12 flex-grow">
                <div className="max-w-[1200px] w-full px-4 lg:px-10 flex flex-col gap-12">

                    {/* Featured Article (Highlight Chapter) */}
                    {featuredPost && (
                        <section className="w-full">
                            <Link href={`/blog/${featuredPost.slug}`} className="flex flex-col lg:flex-row items-stretch overflow-hidden rounded-2xl bg-white shadow-soft border border-trad-border-subtle hover:shadow-lg transition-all duration-300 group">
                                <div className="w-full lg:w-3/5 bg-gray-200 relative overflow-hidden min-h-[300px] lg:min-h-[400px]">
                                    <div className="absolute inset-0">
                                        <Image
                                            src={featuredPost.cover_image || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCnK_XjLPiB3glbU1xH5EDARsmY6II7-YfflRk1LCKk3e75qMPsVis3xtp2PUl8-GKTx4-FHrGdDg00tThlipTvONNe-UG6VC62x9cdkeMrPSQfjv4hgw7U8sbAOJ9vVPBLo206UtpKs3dEdfiPuH6OtZy_W29M1ViOBOAdMI_jtPL0mwvsN6zVQJ6TWXVGCc47HJxYGHNc_HGBAetu-n0jc5PSN33qEHXnRyU1ZrMaGEx11Cx9yrs_QgDyKLIC5IKmtizUwn2a0-wH'}
                                            alt={featuredPost.title}
                                            fill
                                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                                            priority
                                        />
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-black/10"></div>
                                    <div className="absolute top-4 left-4 bg-trad-primary text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Bài Viết Nổi Bật</div>
                                </div>
                                <div className="w-full lg:w-2/5 flex flex-col justify-center p-6 lg:p-10 gap-4 bg-white relative">
                                    <div className="absolute -left-3 top-1/2 w-6 h-6 bg-white rotate-45 hidden lg:block"></div>
                                    <div className="flex items-center gap-2 text-trad-text-muted text-sm font-sans mb-1">
                                        <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                                        <span>{new Date(featuredPost.created_at).toLocaleDateString('vi-VN')}</span>
                                        <span className="mx-1">•</span>
                                        <span className="material-symbols-outlined text-[16px]">person</span>
                                        <span>{featuredPost.author?.full_name || 'Admin'}</span>
                                    </div>
                                    <h2 className="text-trad-text-main text-2xl lg:text-3xl font-bold leading-tight group-hover:text-trad-primary transition-colors font-display">
                                        {featuredPost.title}
                                    </h2>
                                    <p className="text-trad-text-main/80 text-base leading-relaxed line-clamp-4 font-sans">
                                        {featuredPost.excerpt}
                                    </p>
                                    <div className="pt-4">
                                        <span className="inline-flex items-center gap-2 text-trad-primary font-bold uppercase tracking-wide text-sm hover:gap-3 transition-all">
                                            Đọc Tiếp
                                            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        </section>
                    )}

                    {/* Toolbar (Search & Filter) - Client Component */}
                    <BlogToolbar />

                    {/* Blog Grid */}
                    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {listPosts && listPosts.length > 0 ? listPosts.map((post) => (
                            <Link key={post.id} href={`/blog/${post.slug}`} className="group flex flex-col h-full bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-trad-border-subtle">
                                <div className="relative aspect-[4/3] overflow-hidden">
                                    <div className="absolute inset-0">
                                        <Image
                                            src={post.cover_image || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDFL_XVrAUKC05bRAjNW5Ld8gDiiE7fNpJw4dmkeZTavDUAPUfXDgg2ZM_lEL5wdG7k2g039g424F7MDHIhNWUkZrn8oa6KzCFSzdpotZxJq4IYMfdEj8x8-hXgyR7yPtBE20w-uDJ_p9bJobwDbmfEt8WSAjvehCk94ghXkH7TggFP52XAza6YlNyx3k4dSypMdck1TzYhtWzfoMpQ-P2l8_Op5GmsAbjbDM1HSGDmvYAc-ROwEopVAUEx2QAVPEgs4YCWbew9DOq9'}
                                            alt={post.title}
                                            fill
                                            className="object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                    </div>
                                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-trad-text-main text-xs font-bold px-2 py-1 rounded shadow-sm">
                                        {CATEGORIES.find(c => c.id === post.category)?.name || post.category}
                                    </div>
                                </div>

                                <div className="flex flex-col flex-1 p-5 gap-3">
                                    <div className="flex items-center gap-2 text-xs font-sans text-trad-text-muted">
                                        <span>{new Date(post.created_at).toLocaleDateString('vi-VN')}</span>
                                        <span>•</span>
                                        <span>{post.author?.full_name || 'Admin'}</span>
                                    </div>
                                    <h3 className="text-xl font-bold leading-snug text-trad-text-main group-hover:text-trad-primary transition-colors line-clamp-2 font-display">
                                        {post.title}
                                    </h3>
                                    <p className="text-trad-text-main/70 text-sm leading-relaxed line-clamp-3 font-sans mb-2">
                                        {post.excerpt}
                                    </p>
                                    <div className="mt-auto pt-3 border-t border-trad-border-subtle flex justify-between items-center">
                                        <span className="text-xs font-bold text-trad-text-muted uppercase tracking-wider group-hover:text-trad-primary transition-colors">Đọc Tiếp</span>
                                        <span className="material-symbols-outlined text-[18px] text-trad-text-muted group-hover:text-trad-primary transition-transform group-hover:translate-x-1">arrow_right_alt</span>
                                    </div>
                                </div>
                            </Link>
                        )) : (
                            <div className="col-span-full text-center py-20 bg-white rounded-xl border border-dashed border-trad-border-warm">
                                <span className="material-symbols-outlined text-4xl text-gray-300 mb-4">sentiment_dissatisfied</span>
                                <h3 className="text-xl font-bold text-trad-text-main mb-2">Không tìm thấy bài viết nào</h3>
                                <p className="text-trad-text-muted">Thử thay đổi từ khóa hoặc danh mục tìm kiếm xem sao nhé.</p>
                            </div>
                        )}
                    </section>

                    {/* Pagination */}
                    {meta && meta.totalPages > 1 && (
                        <div className="flex justify-center items-center gap-2 pt-8 pb-4">
                            <Link
                                href={page > 1 ? `/blog?page=${page - 1}${categoryQuery ? `&category=${categoryQuery}` : ''}${searchQuery ? `&search=${searchQuery}` : ''}` : '#'}
                                className={`flex items-center justify-center size-12 rounded-lg border border-trad-border-warm bg-white text-trad-text-muted hover:border-trad-primary hover:text-trad-primary transition-colors ${page <= 1 ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                                <span className="material-symbols-outlined">chevron_left</span>
                            </Link>

                            <span className="flex items-center justify-center size-12 rounded-lg bg-trad-primary text-white font-bold shadow-md text-lg">{page}</span>

                            <Link
                                href={page < meta.totalPages ? `/blog?page=${page + 1}${categoryQuery ? `&category=${categoryQuery}` : ''}${searchQuery ? `&search=${searchQuery}` : ''}` : '#'}
                                className={`flex items-center justify-center size-12 rounded-lg border border-trad-border-warm bg-white text-trad-text-muted hover:border-trad-primary hover:text-trad-primary transition-colors ${page >= meta.totalPages ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                                <span className="material-symbols-outlined">chevron_right</span>
                            </Link>
                        </div>
                    )}
                </div>
            </main>

            <TraditionalFooter />
        </div>
    );
}
