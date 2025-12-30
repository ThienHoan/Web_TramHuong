'use client';

import { BlogPost } from '@/types/blog';
import { Link } from '@/i18n/routing';
import Image from 'next/image';
import { useEffect, useState } from 'react';

interface ZenBlogDetailProps {
    post: BlogPost;
    relatedPosts: BlogPost[];
}

export default function ZenBlogDetail({ post, relatedPosts }: ZenBlogDetailProps) {
    const [scrollProgress, setScrollProgress] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
            const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrolled = (winScroll / height) * 100;
            setScrollProgress(scrolled);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Format Date
    const formattedDate = new Date(post.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    return (
        <div className="bg-background-light dark:bg-background-dark text-zen-text-main dark:text-white transition-colors duration-300 min-h-screen flex flex-col items-center">

            {/* Progress Bar */}
            <div
                className="fixed top-0 left-0 h-1 bg-primary w-full origin-left z-[60]"
                style={{ transform: `scaleX(${scrollProgress / 100})` }}
            ></div>

            {/* Back Link */}
            <div className="w-full max-w-[1200px] px-6 md:px-10 mt-10 md:mt-16">
                <Link href="/blog" className="inline-flex items-center gap-2 text-[#6d974e] text-xs font-semibold tracking-[0.2em] uppercase hover:text-primary transition-colors group">
                    <span className="transition-transform group-hover:-translate-x-1">←</span> BACK TO JOURNAL
                </Link>
            </div>

            {/* Title & Meta */}
            <article className="w-full max-w-[960px] px-6 md:px-10 mt-12 text-center">
                <h1 className="text-[#131b0e] dark:text-white text-3xl md:text-5xl lg:text-6xl font-extralight tracking-widest leading-tight uppercase mb-8">
                    {post.title}
                </h1>
                <div className="flex flex-wrap justify-center items-center gap-3 md:gap-6 text-xs md:text-sm font-medium tracking-[0.15em] text-[#6d974e] uppercase mb-16">
                    <span>By {post.author?.full_name || 'Zen Team'}</span>
                    <span className="text-zen-100">•</span>
                    <time dateTime={post.created_at}>{formattedDate}</time>
                    <span className="text-zen-100">•</span>
                    <span>{post.category || 'Journal'}</span>
                </div>
            </article>

            {/* Hero Image */}
            <div className="w-full max-w-[1200px] px-4 md:px-10 mb-20">
                <div className="w-full aspect-[16/9] md:aspect-[21/9] rounded-lg overflow-hidden relative group">
                    <div className="absolute inset-0 bg-black/10 z-10 transition-opacity group-hover:opacity-0"></div>
                    <Image
                        src={post.cover_image || 'https://lh3.googleusercontent.com/aida-public/AB6AXuBLG_F57zSQN41Sqew_HF0X_-7bgkMOtqxKXBVhpGgPfW_FtUPn0v4tCG_MQkfwaK0abkHY4D9oyHCFQCHOkW9RY5ilO3Kz3-h1pnlMaJYL_Lg5prchGW-hpAxSoQ3GNJTwm_Rj6N8qHh1vkxQOzDd2QAPpIvokmV9qMYMOt2BPx59iUz3BuvPxJ6iXuRDk6D3joaSUZzMhVlFiagL3qsGOTuSEkKmSRWiuQBPftbrWJZ6lfDCELrFzXzoBy-IdvnHgZZw2V04IniZF'}
                        alt={post.title}
                        fill
                        className="object-cover transition-transform duration-[2s] ease-out group-hover:scale-105"
                        priority
                    />
                </div>
            </div>

            {/* Content Body */}
            <div className="w-full max-w-[720px] px-6 md:px-0 mb-24">
                {/* Excerpt as Intro */}
                {post.excerpt && (
                    <>
                        <p className="text-xl md:text-2xl font-light leading-relaxed text-[#131b0e] dark:text-gray-200 mb-12 first-letter:text-5xl first-letter:float-left first-letter:mr-3 first-letter:mt-[-6px] first-letter:font-thin first-letter:text-primary">
                            {post.excerpt}
                        </p>
                        <div className="h-px w-24 bg-primary/30 my-12 mx-auto"></div>
                    </>
                )}

                {/* Main Content */}
                <div
                    className="prose prose-lg dark:prose-invert prose-headings:font-light prose-headings:uppercase prose-headings:tracking-widest prose-p:font-light prose-p:leading-loose prose-a:text-primary hover:prose-a:text-[#5bc115] prose-img:rounded-lg prose-img:shadow-sm"
                    dangerouslySetInnerHTML={{ __html: post.content || '' }}
                />

                {/* Tags */}
                <div className="mt-20 pt-10 border-t border-[#ecf3e7] dark:border-white/10 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex gap-3">
                        <span className="text-xs font-bold tracking-widest uppercase text-gray-400 mr-2">Tags:</span>
                        {(post.tags || ['Mindfulness', 'Agarwood']).map((tag, idx) => (
                            <span key={idx} className="text-xs font-medium tracking-wider uppercase text-[#131b0e] dark:text-white hover:text-primary underline decoration-1 underline-offset-4 cursor-pointer">
                                {tag}
                            </span>
                        ))}
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-xs font-bold tracking-widest uppercase text-gray-400 mr-2">Share:</span>
                        <button className="size-8 rounded-full border border-[#ecf3e7] hover:border-primary hover:text-primary flex items-center justify-center transition-colors">
                            <span className="text-sm font-serif">Fb</span>
                        </button>
                        <button className="size-8 rounded-full border border-[#ecf3e7] hover:border-primary hover:text-primary flex items-center justify-center transition-colors">
                            <span className="text-sm font-serif">Tw</span>
                        </button>
                        <button className="size-8 rounded-full border border-[#ecf3e7] hover:border-primary hover:text-primary flex items-center justify-center transition-colors">
                            <span className="text-sm font-serif">Pi</span>
                        </button>
                    </div>
                </div>

                {/* Author Bio */}
                <div className="mt-16 bg-[#f7f9f5] dark:bg-white/5 p-8 rounded-lg flex flex-col md:flex-row gap-6 items-center md:items-start text-center md:text-left">
                    <div className="size-20 rounded-full bg-gray-200 overflow-hidden shrink-0 relative">
                        {post.author?.avatar_url ? (
                            <Image
                                src={post.author.avatar_url}
                                alt={post.author.full_name || 'Author'}
                                fill
                                className="object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-300 text-gray-500 font-bold text-xl">
                                {post.author?.full_name?.charAt(0) || 'A'}
                            </div>
                        )}
                    </div>
                    <div>
                        <h4 className="text-sm font-bold tracking-widest uppercase text-[#131b0e] dark:text-white mb-2">About The Author</h4>
                        <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400 mb-3">
                            {post.author?.full_name || 'Zen Team'} writes about the intersection of traditional Vietnamese incense culture and modern mindfulness practices.
                        </p>
                        <a className="text-xs font-bold tracking-widest uppercase text-primary hover:text-[#5bc115]" href="#">Read more from {post.author?.full_name || 'Author'} →</a>
                    </div>
                </div>
            </div>

            {/* Further Reflections (Related Posts) */}
            {relatedPosts.length > 0 && (
                <section className="w-full bg-white dark:bg-[#131b0e] py-20 px-6 border-t border-[#ecf3e7] dark:border-white/5">
                    <div className="max-w-[1200px] mx-auto">
                        <h3 className="text-2xl font-light tracking-[0.2em] uppercase text-center mb-16 text-[#131b0e] dark:text-white">
                            Further Reflections
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                            {relatedPosts.map((rel) => (
                                <Link key={rel.id} href={`/blog/${rel.slug}`} className="group flex flex-col gap-4">
                                    <div className="w-full aspect-[4/3] overflow-hidden rounded-md bg-gray-100 relative">
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors z-10"></div>
                                        <Image
                                            src={rel.cover_image || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDv8vYWF9HXY8ExuHRXH4eOLw1oOkJJSVSk3xuXidpP6FxBTDKgyXdmkIoKFV79oyPNa2Ec-1BTURxXfB4T8Y0J3uEsH0RR892FM20GOb9zn98ybrnoYc5Qn3kKnvJLBZTUdnJacAHMM_eaoWr1rhPtWTkLY0P2Zxe4jsYTxcAwaipWloQc3ozgT5UphBHiG9Hese-4RWn3d3qxqi19v888CB7rDcE_sjgUrpDY4JukczuGpbyAsnyhfprihZ7xf7stxW4bv05JyP82'}
                                            alt={rel.title}
                                            fill
                                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <span className="text-[10px] font-bold tracking-widest uppercase text-[#6d974e]">{rel.category || 'Related'}</span>
                                        <h4 className="text-lg font-light tracking-wider uppercase leading-snug group-hover:text-primary transition-colors">
                                            {rel.title}
                                        </h4>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}
