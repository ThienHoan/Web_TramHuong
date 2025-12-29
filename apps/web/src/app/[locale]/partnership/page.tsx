'use client';

import TraditionalHeader from '@/components/traditional/TraditionalHeader';
import TraditionalFooter from '@/components/traditional/TraditionalFooter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { submitContact } from '@/lib/api-client';
import { toast } from 'sonner';
import { useState } from 'react';

// Schema Validation
const partnershipSchema = z.object({
    full_name: z.string().min(2, 'Vui lòng nhập họ và tên'),
    phone: z.string().min(10, 'Số điện thoại không hợp lệ').regex(/^[0-9+]+$/, 'Chỉ nhập số'),
    email: z.string().email('Email không hợp lệ'),
    region: z.string(),
    experience: z.string().min(10, 'Vui lòng chia sẻ thêm về kinh nghiệm'),
    reason: z.string().min(10, 'Vui lòng chia sẻ lý do hợp tác'),
});

type PartnershipFormValues = z.infer<typeof partnershipSchema>;

export default function PartnershipPage() {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { register, handleSubmit, reset, formState: { errors } } = useForm<PartnershipFormValues>({
        resolver: zodResolver(partnershipSchema as any),
        defaultValues: {
            region: 'Toàn Quốc'
        }
    });

    const onSubmit = async (data: PartnershipFormValues) => {
        setIsSubmitting(true);
        try {
            // Format the message to include all partnership details
            const formattedMessage = `
--- ĐĂNG KÝ HỢP TÁC ---
SĐT: ${data.phone}
Khu vực: ${data.region}
Kinh nghiệm: ${data.experience}
Lý do hợp tác: ${data.reason}
            `.trim();

            await submitContact({
                full_name: data.full_name,
                email: data.email,
                topic: 'Đăng Ký Đại Lý / Hợp Tác', // Special topic
                message: formattedMessage
            });

            toast.success('Đăng ký thành công!', {
                description: 'Chúng tôi sẽ liên hệ lại với bạn trong thời gian sớm nhất.',
            });
            reset();
        } catch (error) {
            console.error(error);
            toast.error('Gửi đăng ký thất bại', {
                description: 'Vui lòng thử lại sau.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-trad-bg-light font-display text-trad-text-main antialiased">
            <TraditionalHeader />

            <main className="flex flex-col min-h-screen">
                {/* Hero Section */}
                <section className="relative">
                    <div className="px-4 sm:px-10 lg:px-40 py-6 lg:py-10 flex justify-center">
                        <div className="w-full max-w-[1024px]">
                            <div className="overflow-hidden rounded-xl lg:rounded-2xl shadow-lg relative min-h-[400px] lg:min-h-[500px] flex flex-col justify-end group">
                                {/* Background Image */}
                                <div className="absolute inset-0 w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAwQ84CItcxeXHZ6J4VoV_HbCGwDSD9KOzx2m54XVC423-viv1BLtqfCbcgywMZZYhRlSug0Nx-ZgpjCPmsT9mUrN6TeEGIbm_XE9hUhVMXuYj855Mu9w8qw3UGpgVPj5jY4QZ5RTCqqCzp8_x9YVdDvJ-yNdEQZjeArofKn8Ogh7OglgLzZqRbME0Gwy5FG8Qnc0CfbAiugljxjCcpCTbrlNat8Cq1mf2s-Ke2pK6CrzqSmIpmAyKvPpYKG0foA_ylFtve7Vn8VXUV")' }}>
                                </div>
                                {/* Overlay Gradient */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                                {/* Content */}
                                <div className="relative z-10 p-6 lg:p-12 max-w-3xl">
                                    <span className="inline-block px-3 py-1 mb-4 text-xs font-bold tracking-widest text-white uppercase bg-trad-primary rounded-full">Lời Mời Hợp Tác</span>
                                    <h1 className="text-white font-display font-bold text-3xl lg:text-5xl leading-tight mb-4 text-shadow-sm">
                                        Cùng Lan Tỏa Hương Trầm Việt - Xây Dựng Hành Trình Thịnh Vượng
                                    </h1>
                                    <p className="text-white/90 text-lg lg:text-xl font-sans font-light max-w-xl">
                                        Nâng tầm giá trị từ thiên nhiên, gìn giữ nét đẹp văn hóa truyền thống.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Story/Introduction Section */}
                <section className="px-4 sm:px-10 lg:px-40 py-8 lg:py-12 flex justify-center bg-white">
                    <div className="w-full max-w-[800px] text-center">
                        <span className="material-symbols-outlined text-4xl text-trad-primary/50 mb-4">format_quote</span>
                        <p className="text-trad-text-muted text-lg lg:text-xl font-display font-medium leading-relaxed italic">
                            &quot;Chúng tôi trân trọng kính mời quý đối tác cùng tham gia vào hành trình gìn giữ và lan tỏa nét đẹp văn hóa tâm linh Việt. Mỗi nén hương là một câu chuyện, mỗi sự hợp tác là một chương mới của sự thịnh vượng và an lạc.&quot;
                        </p>
                        <div className="w-24 h-1 bg-trad-primary/20 mx-auto mt-8 rounded-full"></div>
                    </div>
                </section>

                {/* Benefits Section */}
                <section className="px-4 sm:px-10 lg:px-40 py-12 lg:py-16 flex justify-center bg-trad-bg-light">
                    <div className="w-full max-w-[1024px] flex flex-col">
                        <div className="mb-10 text-center">
                            <h2 className="text-trad-text-main text-2xl lg:text-3xl font-bold leading-tight tracking-[-0.015em] mb-2">
                                Những Quyền Lợi Đặc Biệt
                            </h2>
                            <p className="text-trad-text-muted font-sans">Các chương của sự thành công chúng ta cùng viết</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {/* Benefit Items */}
                            {[
                                { icon: 'verified', title: 'Sản Phẩm Tinh Hoa', desc: 'Nguồn nguyên liệu trầm hương 100% tự nhiên, được tuyển chọn kỹ lưỡng.' },
                                { icon: 'trending_up', title: 'Lợi Nhuận Bền Vững', desc: 'Chính sách chiết khấu hấp dẫn, cơ chế thưởng linh hoạt tối ưu hóa lợi nhuận.' },
                                { icon: 'campaign', title: 'Hỗ Trợ Truyền Thông', desc: 'Cung cấp tài liệu marketing chuyên nghiệp, hình ảnh, video và hỗ trợ quảng cáo.' },
                                { icon: 'school', title: 'Đào Tạo Chuyên Sâu', desc: 'Được tham gia các khóa đào tạo về kiến thức trầm hương và kỹ năng bán hàng.' },
                            ].map((item, idx) => (
                                <div key={idx} className="group flex flex-col gap-4 p-6 bg-white rounded-xl border border-trad-border-warm hover:border-trad-primary/50 hover:shadow-lg transition-all duration-300">
                                    <div className="size-12 rounded-full bg-trad-primary/10 flex items-center justify-center text-trad-primary group-hover:bg-trad-primary group-hover:text-white transition-colors">
                                        <span className="material-symbols-outlined text-[28px]">{item.icon}</span>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <h3 className="text-trad-text-main text-lg font-bold">{item.title}</h3>
                                        <p className="text-stone-600 text-sm font-sans leading-relaxed">
                                            {item.desc}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Application Form Section */}
                <section className="px-4 sm:px-10 lg:px-40 py-12 lg:py-20 flex justify-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#b35309 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                    <div className="w-full max-w-[800px] relative z-10">
                        <div className="bg-white rounded-2xl shadow-xl border border-trad-border-warm overflow-hidden">
                            <div className="bg-trad-bg-dark p-6 text-center border-b-4 border-trad-primary">
                                <h2 className="text-white text-2xl font-bold font-display">Gửi Thông Tin Hợp Tác</h2>
                                <p className="text-white/70 text-sm font-sans mt-2">Hãy để lại thông tin, chúng tôi sẽ liên hệ sớm nhất</p>
                            </div>
                            <div className="p-6 md:p-10">
                                <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Name */}
                                        <div className="space-y-2">
                                            <label className="text-trad-text-main text-sm font-bold font-display">Họ và Tên</label>
                                            <div className="flex items-center rounded-lg border border-trad-border-warm bg-trad-bg-light px-3 py-3 focus-within:border-trad-primary focus-within:ring-1 focus-within:ring-trad-primary/20 transition-all">
                                                <span className="material-symbols-outlined text-trad-text-muted mr-2 text-[20px]">person</span>
                                                <input {...register('full_name')} className="w-full bg-transparent border-none p-0 text-sm focus:ring-0 placeholder:text-stone-400 font-sans outline-none" placeholder="Nguyễn Văn A" type="text" />
                                            </div>
                                            {errors.full_name && <p className="text-red-500 text-xs">{errors.full_name.message}</p>}
                                        </div>
                                        {/* Phone */}
                                        <div className="space-y-2">
                                            <label className="text-trad-text-main text-sm font-bold font-display">Số Điện Thoại</label>
                                            <div className="flex items-center rounded-lg border border-trad-border-warm bg-trad-bg-light px-3 py-3 focus-within:border-trad-primary focus-within:ring-1 focus-within:ring-trad-primary/20 transition-all">
                                                <span className="material-symbols-outlined text-trad-text-muted mr-2 text-[20px]">call</span>
                                                <input {...register('phone')} className="w-full bg-transparent border-none p-0 text-sm focus:ring-0 placeholder:text-stone-400 font-sans outline-none" placeholder="09xxxxxxx" type="tel" />
                                            </div>
                                            {errors.phone && <p className="text-red-500 text-xs">{errors.phone.message}</p>}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Email */}
                                        <div className="space-y-2">
                                            <label className="text-trad-text-main text-sm font-bold font-display">Email</label>
                                            <div className="flex items-center rounded-lg border border-trad-border-warm bg-trad-bg-light px-3 py-3 focus-within:border-trad-primary focus-within:ring-1 focus-within:ring-trad-primary/20 transition-all">
                                                <span className="material-symbols-outlined text-trad-text-muted mr-2 text-[20px]">mail</span>
                                                <input {...register('email')} className="w-full bg-transparent border-none p-0 text-sm focus:ring-0 placeholder:text-stone-400 font-sans outline-none" placeholder="example@email.com" type="email" />
                                            </div>
                                            {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
                                        </div>
                                        {/* Region */}
                                        <div className="space-y-2">
                                            <label className="text-trad-text-main text-sm font-bold font-display">Khu Vực Hoạt Động</label>
                                            <div className="relative">
                                                <div className="flex items-center rounded-lg border border-trad-border-warm bg-trad-bg-light px-3 py-3 focus-within:border-trad-primary focus-within:ring-1 focus-within:ring-trad-primary/20 transition-all">
                                                    <span className="material-symbols-outlined text-trad-text-muted mr-2 text-[20px]">map</span>
                                                    <select {...register('region')} className="w-full bg-transparent border-none p-0 text-sm focus:ring-0 text-trad-text-main font-sans outline-none appearance-none">
                                                        <option>Miền Bắc</option>
                                                        <option>Miền Trung</option>
                                                        <option>Miền Nam</option>
                                                        <option>Toàn Quốc</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Experience */}
                                    <div className="space-y-2">
                                        <label className="text-trad-text-main text-sm font-bold font-display">Kinh Nghiệm Bán Hàng</label>
                                        <textarea {...register('experience')} className="w-full rounded-lg border border-trad-border-warm bg-trad-bg-light px-3 py-3 text-sm focus:border-trad-primary focus:ring-1 focus:ring-trad-primary/20 transition-all resize-none font-sans outline-none" placeholder="Chia sẻ ngắn gọn về kinh nghiệm của bạn..." rows={3}></textarea>
                                        {errors.experience && <p className="text-red-500 text-xs">{errors.experience.message}</p>}
                                    </div>
                                    {/* Reason */}
                                    <div className="space-y-2">
                                        <label className="text-trad-text-main text-sm font-bold font-display">Lý Do Muốn Hợp Tác</label>
                                        <textarea {...register('reason')} className="w-full rounded-lg border border-trad-border-warm bg-trad-bg-light px-3 py-3 text-sm focus:border-trad-primary focus:ring-1 focus:ring-trad-primary/20 transition-all resize-none font-sans outline-none" placeholder="Mong muốn của bạn khi trở thành đối tác..." rows={3}></textarea>
                                        {errors.reason && <p className="text-red-500 text-xs">{errors.reason.message}</p>}
                                    </div>
                                    {/* Submit Botton */}
                                    <div className="pt-4">
                                        <button
                                            disabled={isSubmitting}
                                            type="submit"
                                            className="w-full bg-trad-primary hover:bg-trad-primary-dark text-white font-bold py-3.5 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-center gap-2 font-display text-lg disabled:opacity-70 disabled:cursor-not-allowed"
                                        >
                                            {isSubmitting ? (
                                                <span className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></span>
                                            ) : (
                                                <>
                                                    <span>Gửi Đăng Ký Hợp Tác</span>
                                                    <span className="material-symbols-outlined text-[20px]">send</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                        {/* Contact Support */}
                        <div className="mt-8 flex flex-col items-center gap-2">
                            <p className="text-trad-text-muted text-sm font-sans">Cần hỗ trợ tư vấn trực tiếp?</p>
                            <div className="flex gap-6">
                                <a className="flex items-center gap-2 text-trad-text-main font-bold hover:text-trad-primary transition-colors" href="tel:0909123456">
                                    <span className="material-symbols-outlined text-trad-primary">call</span>
                                    0909 123 456
                                </a>
                                <a className="flex items-center gap-2 text-trad-text-main font-bold hover:text-trad-primary transition-colors" href="#">
                                    <span className="material-symbols-outlined text-trad-primary">chat</span>
                                    Zalo Support
                                </a>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <TraditionalFooter />
        </div>
    );
}
