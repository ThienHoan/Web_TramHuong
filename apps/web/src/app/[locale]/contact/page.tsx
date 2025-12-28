'use client';

import TraditionalHeader from '@/components/traditional/TraditionalHeader';
import TraditionalFooter from '@/components/traditional/TraditionalFooter';

export default function ContactPage() {
    return (
        <div className="bg-trad-bg-light font-display text-trad-text-main antialiased selection:bg-trad-primary/20 selection:text-trad-primary">
            <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-pattern">
                {/* Navigation */}
                <TraditionalHeader />

                <main className="flex-1">
                    <div className="layout-container flex h-full grow flex-col py-10 md:py-16">
                        <div className="px-4 md:px-10 lg:px-40 flex flex-1 justify-center">
                            <div className="layout-content-container flex max-w-6xl flex-1 flex-col gap-12 lg:flex-row">
                                {/* Left Column: Storytelling & Info */}
                                <div className="flex flex-1 flex-col gap-8 lg:pr-10">
                                    {/* Heading Section */}
                                    <div className="flex flex-col gap-4">
                                        <span className="text-trad-primary font-bold tracking-widest uppercase text-xs">Liên hệ với chúng tôi</span>
                                        <h1 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight text-trad-text-main">
                                            Gửi gắm tâm tình cùng <br /><span className="text-trad-primary italic">Thiên Phúc</span>
                                        </h1>
                                        <p className="text-lg text-stone-600 leading-relaxed max-w-lg">
                                            Hương trầm quyện tỏa, kết nối tâm giao. Chúng tôi ở đây để lắng nghe câu chuyện của bạn, như một người tri kỷ bên chén trà thơm.
                                        </p>
                                    </div>
                                    {/* Illustration Image */}
                                    <div className="relative w-full overflow-hidden rounded-xl shadow-md aspect-[4/3] group">
                                        <div className="absolute inset-0 bg-black/10 transition-colors group-hover:bg-black/0 z-10"></div>
                                        <div className="h-full w-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDcZvsV-bntgwDDtGh684_4_eNhhPOr6m3PQRYmYS9dxYL7UQR7-WMWL7ChKXu73xmrrGmnyP_qCiNFog0Zcd21WNizWWnmJrXj9JrqZ1b5aO-6wNh9n9Ohu9jTHjbY5Hl2uG7BkLXTAzm_guwa6CqUsBlxx9dEwNt-83iKqJh6wzD-GLNtPZJ_LNkFhG2puezQ2Lm0A00iL42KT9LlJKJAI-Ixxw3c1UjSZKv3_Ns6mZZH6TXXLZtF7ednwb4oY-MYIu0GvNKaswEn')" }}>
                                        </div>
                                        <div className="absolute bottom-4 left-4 z-20 rounded-lg bg-white/80 backdrop-blur-sm px-4 py-2 shadow-sm">
                                            <p className="text-xs font-bold text-trad-primary uppercase tracking-wider">Góc bình yên</p>
                                        </div>
                                    </div>
                                    {/* Contact Details */}
                                    <div className="flex flex-col gap-6 pt-4">
                                        <h3 className="text-xl font-bold text-trad-text-main">Nơi chúng tôi chờ bạn</h3>
                                        <div className="grid gap-6 sm:grid-cols-2">
                                            <div className="flex items-start gap-4">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-trad-primary/10 text-trad-primary">
                                                    <span className="material-symbols-outlined">storefront</span>
                                                </div>
                                                <div>
                                                    <p className="font-bold text-trad-text-main">Chốn đi về</p>
                                                    <p className="text-sm text-stone-600 mt-1">123 Đường Tơ Lụa, Phố Cổ<br />Hoàn Kiếm, Hà Nội</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-4">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-trad-primary/10 text-trad-primary">
                                                    <span className="material-symbols-outlined">call</span>
                                                </div>
                                                <div>
                                                    <p className="font-bold text-trad-text-main">Đường dây kết nối</p>
                                                    <p className="text-sm text-stone-600 mt-1">035.617.68.78</p>
                                                    <p className="text-xs text-stone-500/70">Thứ 2 - Chủ Nhật: 8:00 - 21:00</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-4">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-trad-primary/10 text-trad-primary">
                                                    <span className="material-symbols-outlined">mail</span>
                                                </div>
                                                <div>
                                                    <p className="font-bold text-trad-text-main">Thư tín</p>
                                                    <p className="text-sm text-stone-600 mt-1">tamgiao@thienphuc.vn</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-4">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-trad-primary/10 text-trad-primary">
                                                    <span className="material-symbols-outlined">share</span>
                                                </div>
                                                <div>
                                                    <p className="font-bold text-trad-text-main">Mạng xã hội</p>
                                                    <div className="flex gap-3 mt-2">
                                                        <a className="text-stone-600 hover:text-trad-primary transition-colors" href="#"><span className="material-symbols-outlined">public</span></a>
                                                        <a className="text-stone-600 hover:text-trad-primary transition-colors" href="#"><span className="material-symbols-outlined">chat_bubble</span></a>
                                                        <a className="text-stone-600 hover:text-trad-primary transition-colors" href="#"><span className="material-symbols-outlined">photo_camera</span></a>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* Right Column: The Narrative Form */}
                                <div className="w-full lg:max-w-md xl:max-w-lg">
                                    <div className="sticky top-28 rounded-2xl bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-trad-border-warm">
                                        <div className="mb-8 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-4xl text-trad-primary/40">stylus</span>
                                        </div>
                                        <h2 className="mb-6 text-center text-2xl font-bold text-trad-text-main">Chia sẻ câu chuyện</h2>
                                        <form className="flex flex-col gap-5">
                                            {/* Name Field */}
                                            <div className="group">
                                                <label className="mb-2 block text-sm font-medium text-trad-text-main" htmlFor="name">Quý danh của bạn</label>
                                                <div className="relative">
                                                    <input className="w-full rounded-xl border border-trad-border-warm bg-trad-bg-light px-4 py-3 pl-10 text-trad-text-main placeholder:text-stone-400 focus:border-trad-primary focus:ring-1 focus:ring-trad-primary outline-none transition-all" id="name" placeholder="Để chúng tôi tiện xưng hô" type="text" />
                                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-trad-primary">person</span>
                                                </div>
                                            </div>
                                            {/* Email Field */}
                                            <div className="group">
                                                <label className="mb-2 block text-sm font-medium text-trad-text-main" htmlFor="email">Nơi chúng tôi phản hồi</label>
                                                <div className="relative">
                                                    <input className="w-full rounded-xl border border-trad-border-warm bg-trad-bg-light px-4 py-3 pl-10 text-trad-text-main placeholder:text-stone-400 focus:border-trad-primary focus:ring-1 focus:ring-trad-primary outline-none transition-all" id="email" placeholder="Địa chỉ thư điện tử" type="email" />
                                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-trad-primary">alternate_email</span>
                                                </div>
                                            </div>
                                            {/* Topic Field */}
                                            <div className="group">
                                                <label className="mb-2 block text-sm font-medium text-trad-text-main" htmlFor="subject">Chủ đề quan tâm</label>
                                                <div className="relative">
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
                                                        <span className="material-symbols-outlined">expand_more</span>
                                                    </div>
                                                    <select className="w-full appearance-none rounded-xl border border-trad-border-warm bg-trad-bg-light px-4 py-3 pl-10 text-trad-text-main placeholder:text-stone-400 focus:border-trad-primary focus:ring-1 focus:ring-trad-primary outline-none transition-all" id="subject">
                                                        <option>Tư vấn sản phẩm trầm hương</option>
                                                        <option>Hợp tác kinh doanh</option>
                                                        <option>Phản hồi dịch vụ</option>
                                                        <option>Khác</option>
                                                    </select>
                                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-trad-primary">topic</span>
                                                </div>
                                            </div>
                                            {/* Message Field */}
                                            <div className="group">
                                                <label className="mb-2 block text-sm font-medium text-trad-text-main" htmlFor="message">Lời nhắn gửi</label>
                                                <div className="relative">
                                                    <textarea className="w-full resize-none rounded-xl border border-trad-border-warm bg-trad-bg-light px-4 py-3 pl-10 text-trad-text-main placeholder:text-stone-400 focus:border-trad-primary focus:ring-1 focus:ring-trad-primary outline-none transition-all" id="message" placeholder="Hãy kể cho chúng tôi nghe..." rows={5}></textarea>
                                                    <span className="material-symbols-outlined absolute left-3 top-4 text-stone-400 group-focus-within:text-trad-primary">edit_note</span>
                                                </div>
                                            </div>
                                            {/* Submit Button */}
                                            <button className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-trad-primary px-8 py-4 text-base font-bold text-white shadow-lg shadow-trad-primary/25 transition-all hover:bg-trad-primary-dark hover:shadow-trad-primary/40 active:scale-[0.98]">
                                                <span>Gửi câu chuyện của bạn</span>
                                                <span className="material-symbols-outlined text-sm">send</span>
                                            </button>
                                            <p className="text-center text-xs text-stone-500 italic mt-2">
                                                Mọi thông tin của bạn đều được bảo mật tuyệt đối.
                                            </p>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <TraditionalFooter />
            </div>
        </div>
    );
}
