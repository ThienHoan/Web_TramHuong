'use client';

import { Link } from '@/i18n/routing';

export default function TraditionalFooter() {
    return (
        <footer className="mt-auto bg-trad-red-900 text-[#fcfaf8] pt-16 pb-8 relative">
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/wood-pattern.png')" }}></div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                    {/* Brand */}
                    <div className="md:col-span-1">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="text-[#fcfaf8] h-10 w-10 flex items-center justify-center bg-white/10 rounded-full">
                                <span className="material-symbols-outlined !text-[28px]">spa</span>
                            </div>
                            <h2 className="text-2xl font-bold">Trầm Hương Việt</h2>
                        </div>
                        <p className="text-white/70 text-sm leading-relaxed mb-6">
                            Mang tinh hoa trầm hương Việt đến mọi gia đình. Sản phẩm thiên nhiên, an toàn và đậm đà bản sắc dân tộc.
                        </p>
                        <div className="flex gap-4">
                            <a className="h-8 w-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors" href="#"><span className="material-symbols-outlined !text-[18px]">public</span></a>
                            <a className="h-8 w-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors" href="#"><span className="material-symbols-outlined !text-[18px]">mail</span></a>
                            <a className="h-8 w-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors" href="#"><span className="material-symbols-outlined !text-[18px]">call</span></a>
                        </div>
                    </div>
                    {/* Links 1 */}
                    <div>
                        <h3 className="font-bold text-lg mb-4">Về chúng tôi</h3>
                        <ul className="space-y-3 text-sm text-white/70">
                            <li><Link className="hover:text-white transition-colors" href="#">Câu chuyện thương hiệu</Link></li>
                            <li><Link className="hover:text-white transition-colors" href="#">Chứng nhận chất lượng</Link></li>
                            <li><Link className="hover:text-white transition-colors" href="#">Vùng nguyên liệu</Link></li>
                            <li><Link className="hover:text-white transition-colors" href="#">Tin tức &amp; Sự kiện</Link></li>
                        </ul>
                    </div>
                    {/* Links 2 */}
                    <div>
                        <h3 className="font-bold text-lg mb-4">Hỗ trợ khách hàng</h3>
                        <ul className="space-y-3 text-sm text-white/70">
                            <li><Link className="hover:text-white transition-colors" href="#">Hướng dẫn mua hàng</Link></li>
                            <li><Link className="hover:text-white transition-colors" href="#">Chính sách đổi trả</Link></li>
                            <li><Link className="hover:text-white transition-colors" href="#">Chính sách bảo mật</Link></li>
                            <li><Link className="hover:text-white transition-colors" href="#">Liên hệ</Link></li>
                        </ul>
                    </div>
                    {/* Newsletter */}
                    <div>
                        <h3 className="font-bold text-lg mb-4">Đăng ký nhận tin</h3>
                        <p className="text-white/70 text-sm mb-4">Nhận ưu đãi và thông tin mới nhất từ Trầm Hương Việt.</p>
                        <div className="flex">
                            <input className="bg-white/10 border-none text-white placeholder:text-white/50 rounded-l-lg focus:ring-1 focus:ring-white/50 w-full text-sm" placeholder="Email của bạn" type="email" />
                            <button className="bg-[#b35309] hover:bg-[#8a3e05] px-4 rounded-r-lg font-bold text-sm transition-colors">Gửi</button>
                        </div>
                    </div>
                </div>
                <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-white/50">
                    <p>© 2024 Trầm Hương Việt. All rights reserved.</p>
                    <div className="flex gap-6">
                        <Link className="hover:text-white" href="#">Điều khoản</Link>
                        <Link className="hover:text-white" href="#">Bảo mật</Link>
                        <Link className="hover:text-white" href="#">Sitemap</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
