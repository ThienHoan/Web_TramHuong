'use client';

import { Link } from '@/i18n/routing';
import { Phone, Mail, MapPin, Clock, Facebook } from 'lucide-react';

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
                            <h2 className="text-2xl font-bold">Trầm Hương<br /> Thiên Phúc</h2>
                        </div>
                        <p className="text-white/70 text-sm leading-relaxed mb-6">
                            Mang tinh hoa trầm hương Việt Nam đến mọi gia đình. Sản phẩm thiên nhiên, an toàn và đậm đà bản sắc dân tộc.
                        </p>
                        <div className="flex gap-4">
                            <a
                                href="https://www.facebook.com/profile.php?id=61585286954215"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="h-11 w-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-blue-600 transition-colors"
                                title="Facebook"
                            >
                                <Facebook size={18} />
                            </a>
                            <a
                                href="mailto:Hoan64735@gmail.com"
                                className="h-11 w-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                                title="Email"
                            >
                                <Mail size={18} />
                            </a>
                            <a
                                href="tel:0356176878"
                                className="h-11 w-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-green-600 transition-colors"
                                title="Gọi ngay"
                            >
                                <Phone size={18} />
                            </a>
                        </div>
                    </div>

                    {/* Contact Info */}
                    <div>
                        <h3 className="font-bold text-lg mb-4">Liên hệ</h3>
                        <ul className="space-y-4 text-sm text-white/70">
                            <li className="flex items-start gap-2">
                                <MapPin size={16} className="shrink-0 mt-0.5" />
                                <span>153 Lý Thái Tổ, Hương Trà, Thành Phố Huế</span>
                            </li>
                            <li>
                                <a href="tel:0356176878" className="flex items-center gap-2 hover:text-white transition-colors">
                                    <Phone size={16} />
                                    <span>0356.176.878</span>
                                </a>
                            </li>
                            <li>
                                <a href="mailto:Hoan64735@gmail.com" className="flex items-center gap-2 hover:text-white transition-colors">
                                    <Mail size={16} />
                                    <span>Hoan64735@gmail.com</span>
                                </a>
                            </li>
                            <li className="flex items-center gap-2">
                                <Clock size={16} />
                                <span>8:00 - 21:00 (Thứ 2 - CN)</span>
                            </li>
                        </ul>
                    </div>

                    {/* Links */}
                    <div>
                        <h3 className="font-bold text-lg mb-4">Hỗ trợ khách hàng</h3>
                        <ul className="space-y-4 md:space-y-3 text-sm text-white/70">
                            <li><Link className="hover:text-white transition-colors py-1 block" href="/products">Sản phẩm</Link></li>
                            <li><Link className="hover:text-white transition-colors py-1 block" href="/order-lookup">Tra cứu đơn hàng</Link></li>
                            <li><Link className="hover:text-white transition-colors py-1 block" href="/blog">Thư viện hương trầm</Link></li>
                            <li><Link className="hover:text-white transition-colors py-1 block" href="/contact">Liên hệ</Link></li>
                        </ul>
                    </div>

                    {/* Newsletter */}
                    <div>
                        <h3 className="font-bold text-lg mb-4">Đăng ký nhận tin</h3>
                        <p className="text-white/70 text-sm mb-4">Nhận ưu đãi và thông tin mới nhất từ Trầm Hương Thiên Phúc.</p>
                        <div className="flex">
                            <input className="bg-white/10 border-none text-white placeholder:text-white/50 rounded-l-lg focus:ring-1 focus:ring-white/50 w-full text-sm px-4 py-2.5" placeholder="Email của bạn" type="email" />
                            <button className="bg-[#b35309] hover:bg-[#8a3e05] px-4 rounded-r-lg font-bold text-sm transition-colors">Gửi</button>
                        </div>
                    </div>
                </div>
                <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-white/50">
                    <p>© 2024 Trầm Hương Thiên Phúc. All rights reserved.</p>
                    <div className="flex gap-6">
                        <Link className="hover:text-white" href="/contact">Liên hệ</Link>
                        <Link className="hover:text-white" href="/blog">Blog</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}

