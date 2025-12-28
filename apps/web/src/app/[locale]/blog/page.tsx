import { getPosts } from '@/lib/api-client';
import TraditionalHeader from '@/components/traditional/TraditionalHeader';
import TraditionalFooter from '@/components/traditional/TraditionalFooter';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { BlogToolbar } from '@/components/blog/BlogToolbar';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Thư Viện Trầm Hương - Kiến Thức & Văn Hóa',
    description: 'Khám phá thế giới Trầm Hương, văn hóa tâm linh và sức khỏe.',
};

export default async function BlogListPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    // Await searchParams before accessing properties
    const params = await searchParams;
    const page = typeof params.page === 'string' ? parseInt(params.page) : 1;
    const category = typeof params.category === 'string' ? params.category : undefined;
    const search = typeof params.search === 'string' ? params.search : undefined;

    // Fetch on Server
    const { data: posts, meta } = await getPosts({
        page,
        limit: 10,
        category,
        search,
        status: 'published'
    });

    const featuredPost = (posts && posts.length > 0 && !search && !category)
        ? posts.find(p => p.is_featured) || posts[0]
        : null;

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
        <div className="bg-trad-bg-light font-display text-trad-text-main antialiased min-h-screen flex flex-col selection:bg-trad-primary selection:text-white bg-pattern-lotus">
            <TraditionalHeader />

            <main className="min-h-screen pb-20 flex-grow">
                {/* Hero Section */}
                <section className="relative h-[60vh] min-h-[500px] flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 z-0">
                        <Image
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCnK_XjLPiB3glbU1xH5EDARsmY6II7-YfflRk1LCKk3e75qMPsVis3xtp2PUl8-GKTx4-FHrGdDg00tThlipTvONNe-UG6VC62x9cdkeMrPSQfjv4hgw7U8sbAOJ9vVPBLo206UtpKs3dEdfiPuH6OtZy_W29M1ViOBOAdMI_jtPL0mwvsN6zVQJ6TWXVGCc47HJxYGHNc_HGBAetu-n0jc5PSN33qEHXnRyU1ZrMaGEx11Cx9yrs_QgDyKLIC5IKmtizUwn2a0-wH"
                            alt="Trầm Hương Blog Banner"
                            fill
                            className="object-cover brightness-[0.6]"
                            priority
                        />
                    </div>
                    <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto space-y-6">
                        <div className="inline-block border border-white/30 bg-white/10 backdrop-blur-sm px-6 py-2 rounded-full text-sm font-bold tracking-widest uppercase mb-4">
                            Góc Nhìn Chuyên Gia
                        </div>
                        <h1 className="text-5xl md:text-7xl font-bold leading-tight font-display mb-6 drop-shadow-lg">
                            Thư Viện <span className="text-trad-secondary italic">Trầm Hương</span>
                        </h1>
                        <p className="text-lg md:text-xl font-light opacity-90 leading-relaxed max-w-2xl mx-auto">
                            Nơi lưu giữ những câu chuyện, kiến thức và giá trị văn hóa ngàn năm của hương trầm Việt Nam.
                        </p>
                    </div>
                </section>

                {/* Toolbar (Search & Filter) - Client Component */}
                <div className="-mt-8 relative z-20">
                    <BlogToolbar />
                </div>

                {/* Featured Post (Only show if no search/filter) */}
                {featuredPost && !search && !category && (
                    <section className="container mx-auto px-4 mb-20 max-w-6xl">
                        <div className="flex items-center gap-4 mb-8">
                            <h2 className="text-3xl font-bold uppercase tracking-wide text-trad-text-main">Tiêu Điểm</h2>
                            <div className="h-px bg-trad-primary flex-grow opacity-30"></div>
                        </div>

                        <Link href={`/blog/${featuredPost.slug}`} className="group relative block w-full aspect-[21/9] rounded-2xl overflow-hidden shadow-2xl">
                            <Image
                                src={featuredPost.cover_image || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDFL_XVrAUKC05bRAjNW5Ld8gDiiE7fNpJw4dmkeZTavDUAPUfXDgg2ZM_lEL5wdG7k2g039g424F7MDHIhNWUkZrn8oa6KzCFSzdpotZxJq4IYMfdEj8x8-hXgyR7yPtBE20w-uDJ_p9bJobwDbmfEt8WSAjvehCk94ghXkH7TggFP52XAza6YlNyx3k4dSypMdck1TzYhtWzfoMpQ-P2l8_Op5GmsAbjbDM1HSGDmvYAc-ROwEopVAUEx2QAVPEgs4YCWbew9DOq9'}
                                alt={featuredPost.title}
                                fill
                                className="object-cover transition-transform duration-1000 group-hover:scale-105"
                                priority
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-8 md:p-12 text-white">
                                <div className="max-w-3xl transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                                    <span className="inline-block bg-trad-primary px-3 py-1 text-xs font-bold uppercase rounded-md mb-4 shadow-lg">
                                        {CATEGORIES.find(c => c.id === featuredPost.category)?.name || featuredPost.category}
                                    </span>
                                    <h3 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
                                        {featuredPost.title}
                                    </h3>
                                    <p className="text-white/80 text-lg line-clamp-2 md:line-clamp-3 mb-6 font-light">
                                        {featuredPost.excerpt}
                                    </p>
                                    <span className="inline-flex items-center font-bold uppercase tracking-wider text-sm border-b-2 border-trad-primary pb-1">
                                        Đọc ngay <span className="material-symbols-outlined text-sm ml-2">arrow_forward</span>
                                    </span>
                                </div>
                            </div>
                        </Link>
                    </section>
                )}

                {/* Post Grid */}
                <section className="container mx-auto px-4 max-w-6xl">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-2xl font-bold text-trad-text-main h-full flex items-center">
                            <span className="w-2 h-8 bg-trad-primary mr-3 rounded-full"></span>
                            {search ? `Kết quả tìm kiếm: "${search}"` : (category ? 'Danh Mục Bài Viết' : 'Bài Viết Mới Nhất')}
                        </h2>
                    </div>

                    {listPosts && listPosts.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {listPosts.map((post) => (
                                <Link key={post.id} href={`/blog/${post.slug}`} className="group flex flex-col h-full bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-trad-primary/20">
                                    <div className="relative aspect-[4/3] overflow-hidden">
                                        <Image
                                            src={post.cover_image || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDFL_XVrAUKC05bRAjNW5Ld8gDiiE7fNpJw4dmkeZTavDUAPUfXDgg2ZM_lEL5wdG7k2g039g424F7MDHIhNWUkZrn8oa6KzCFSzdpotZxJq4IYMfdEj8x8-hXgyR7yPtBE20w-uDJ_p9bJobwDbmfEt8WSAjvehCk94ghXkH7TggFP52XAza6YlNyx3k4dSypMdck1TzYhtWzfoMpQ-P2l8_Op5GmsAbjbDM1HSGDmvYAc-ROwEopVAUEx2QAVPEgs4YCWbew9DOq9'}
                                            alt={post.title}
                                            fill
                                            className="object-cover group-hover:scale-110 transition-transform duration-700"
                                        />
                                        <div className="absolute top-4 left-4">
                                            <span className="bg-white/90 backdrop-blur text-trad-text-main text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm">
                                                {CATEGORIES.find(c => c.id === post.category)?.name || post.category}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="p-6 flex flex-col flex-grow">
                                        <div className="flex items-center text-xs text-gray-400 mb-3 space-x-2">
                                            <span className="flex items-center"><span className="material-symbols-outlined text-[14px] mr-1">calendar_today</span> {new Date(post.created_at).toLocaleDateString('vi-VN')}</span>
                                        </div>

                                        <h3 className="text-xl font-bold text-trad-text-main mb-3 line-clamp-2 group-hover:text-trad-primary transition-colors">
                                            {post.title}
                                        </h3>

                                        <p className="text-gray-500 text-sm line-clamp-3 mb-6 flex-grow font-light leading-relaxed">
                                            {post.excerpt}
                                        </p>

                                        <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-center text-sm">
                                            <span className="text-trad-primary font-bold group-hover:underline">Đọc tiếp</span>
                                            <span className="material-symbols-outlined text-gray-300 group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                            <div className="inline-block p-4 bg-gray-50 rounded-full mb-4">
                                <span className="material-symbols-outlined text-4xl text-gray-300">sentiment_dissatisfied</span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Không tìm thấy bài viết nào</h3>
                            <p className="text-gray-500">Thử thay đổi từ khóa hoặc danh mục tìm kiếm xem sao nhé.</p>
                        </div>
                    )}
                </section>
            </main>
            <TraditionalFooter />
        </div>
    );
}
