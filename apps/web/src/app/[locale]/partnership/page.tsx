'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { LegalConsent } from '@/components/legal/LegalConsent';
import { ContactProtection } from '@/components/contact/ContactProtection';
import { ShopFooter, ShopHeader } from '@/components/layout/ShopChrome';
import { legalAcceptance, SHOP_CONTACT } from '@/lib/legal';
import { submitContact } from '@/lib/api-client';
import { useContactProtection } from '@/hooks/useContactProtection';
import { useBilingual } from '@/hooks/useBilingual';

// Values stay in Vietnamese so the shop's inbox reads the same for every applicant.
const REGIONS = [
    { value: 'Toàn Quốc', en: 'Nationwide' },
    { value: 'Miền Bắc', en: 'Northern Vietnam' },
    { value: 'Miền Trung', en: 'Central Vietnam' },
    { value: 'Miền Nam', en: 'Southern Vietnam' },
    { value: 'Ngoài Việt Nam', en: 'Outside Vietnam' },
];

type PartnershipFormValues = { full_name: string; phone: string; email: string; region: string; experience: string; reason: string };

export default function PartnershipPage() {
    const { en, t } = useBilingual();
    const protection = useContactProtection();
    const [privacyAccepted, setPrivacyAccepted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionError, setSubmissionError] = useState<string | null>(null);

    const schema = z.object({
        full_name: z.string().min(2, t('Vui lòng nhập họ và tên', 'Please enter your full name')).max(100),
        phone: z.string().min(9, t('Số điện thoại chưa đúng', 'Please enter a valid phone number')).max(20).regex(/^[0-9+\s]+$/, t('Chỉ nhập chữ số', 'Digits only, please')),
        email: z.string().email(t('Email chưa đúng định dạng', 'Please enter a valid email')),
        region: z.string().max(100),
        experience: z.string().min(10, t('Bạn chia sẻ thêm về kinh nghiệm nhé', 'Please tell us a little more about your experience')).max(500),
        reason: z.string().min(10, t('Bạn chia sẻ thêm lý do hợp tác nhé', 'Please tell us a little more about why you would like to partner')).max(1000),
    });
    const { register, handleSubmit, reset, formState: { errors } } = useForm<PartnershipFormValues>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: fix type
        resolver: zodResolver(schema as any),
        defaultValues: { region: REGIONS[0].value },
    });

    const onSubmit = async (data: PartnershipFormValues) => {
        if (!privacyAccepted || !protection.canSubmit) return;
        setSubmissionError(null);
        setIsSubmitting(true);
        try {
            await submitContact({
                legalAcceptance: legalAcceptance(),
                ...(protection.token ? { turnstileToken: protection.token } : {}),
                full_name: data.full_name,
                email: data.email,
                topic: 'Đăng Ký Đại Lý / Hợp Tác',
                message: `--- ĐĂNG KÝ HỢP TÁC ---\nSĐT: ${data.phone}\nKhu vực: ${data.region}\nKinh nghiệm: ${data.experience}\nLý do hợp tác: ${data.reason}`,
            });
            toast.success(t('Đã gửi đăng ký', 'Application sent'), {
                description: t('Thiên Phúc sẽ liên hệ lại với bạn.', 'Thiên Phúc will get back to you.'),
            });
            reset();
            setPrivacyAccepted(false);
        } catch {
            setSubmissionError(t('Chưa gửi được đăng ký. Vui lòng thử lại sau ít phút.', 'Your application did not go through. Please try again shortly.'));
        } finally {
            protection.resetToken();
            setIsSubmitting(false);
        }
    };

    const fieldError = (id: keyof PartnershipFormValues) => errors[id]?.message
        ? <span id={`${id}-error`} role="alert" className="shop-error">{errors[id]?.message}</span>
        : null;
    const fieldProps = (id: keyof PartnershipFormValues) => ({
        id,
        'aria-invalid': !!errors[id],
        'aria-describedby': errors[id] ? `${id}-error` : undefined,
        ...register(id),
    });

    const benefits = [
        { title: t('Sản phẩm rõ nguồn gốc', 'Clear product origins'), body: t('Trao đổi thông tin thành phần và nguồn gốc theo từng sản phẩm trước khi hợp tác.', 'Ingredient and origin details are shared for each product before we start.') },
        { title: t('Chính sách chiết khấu', 'Partner pricing'), body: t('Mức chiết khấu được trao đổi riêng theo khu vực và quy mô bán hàng.', 'Pricing is agreed individually based on your region and sales volume.') },
        { title: t('Tài liệu bán hàng', 'Sales material'), body: t('Hình ảnh, video và nội dung giới thiệu sản phẩm để bạn sử dụng.', 'Photos, video and product copy ready for you to use.') },
        { title: t('Kiến thức trầm hương', 'Product knowledge'), body: t('Hướng dẫn về sản phẩm để bạn tư vấn đúng cho khách.', 'Guidance on the range so you can advise customers well.') },
    ];

    return (
        <div className="atelier-page flex min-h-screen flex-col bg-trad-bg-light font-display">
            <ShopHeader />
            <main className="flex flex-1 flex-col">
                <section className="relative flex min-h-[380px] items-end overflow-hidden lg:min-h-[460px]">
                    <Image src="/editorial/forest.webp" alt="" fill priority sizes="100vw" className="object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1f2b25]/85 via-[#1f2b25]/35 to-transparent" />
                    <div className="relative z-10 mx-auto w-full max-w-[1120px] px-5 pb-10 pt-16 lg:pb-14">
                        <p className="shop-eyebrow !text-[#d4c29c]">{t('Hợp tác', 'Partnership')}</p>
                        <h1 className="shop-title max-w-2xl !text-[#fffdf8]">{t('Cùng lan tỏa hương trầm Việt', 'Share Vietnamese agarwood with us')}</h1>
                        <p className="mt-3 max-w-xl text-[15px] leading-7 text-[#e2e4d8]">{t('Dành cho đại lý và nhà phân phối muốn đồng hành lâu dài cùng Thiên Phúc.', 'For retailers and distributors who want to build something lasting with Thiên Phúc.')}</p>
                    </div>
                </section>

                <section className="mx-auto w-full max-w-[1120px] px-5 py-12 lg:py-16">
                    <h2 className="font-serif text-3xl">{t('Khi đồng hành cùng Thiên Phúc', 'What you can expect')}</h2>
                    <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {benefits.map((item) => (
                            <li key={item.title} className="shop-card">
                                <h3 className="text-base font-medium">{item.title}</h3>
                                <p className="shop-hint mt-2">{item.body}</p>
                            </li>
                        ))}
                    </ul>
                </section>

                <section className="mx-auto w-full max-w-[720px] px-5 pb-16 lg:pb-24">
                    <form className="shop-card flex flex-col gap-5" onSubmit={handleSubmit(onSubmit)} noValidate>
                        <div>
                            <h2 className="font-serif text-2xl">{t('Gửi thông tin hợp tác', 'Apply to partner')}</h2>
                            <p className="shop-hint mt-1">{t('Để lại thông tin, Thiên Phúc sẽ liên hệ với bạn.', 'Leave your details and Thiên Phúc will be in touch.')}</p>
                        </div>
                        <div className="grid gap-5 md:grid-cols-2">
                            <label className="shop-field">
                                {t('Họ và tên', 'Full name')}
                                <input type="text" autoComplete="name" {...fieldProps('full_name')} />
                                {fieldError('full_name')}
                            </label>
                            <label className="shop-field">
                                {t('Số điện thoại', 'Phone number')}
                                <input type="tel" autoComplete="tel" {...fieldProps('phone')} />
                                {fieldError('phone')}
                            </label>
                            <label className="shop-field">
                                Email
                                <input type="email" autoComplete="email" {...fieldProps('email')} />
                                {fieldError('email')}
                            </label>
                            <label className="shop-field">
                                {t('Khu vực hoạt động', 'Where you sell')}
                                <select {...register('region')}>
                                    {REGIONS.map((region) => <option key={region.value} value={region.value}>{en ? region.en : region.value}</option>)}
                                </select>
                            </label>
                        </div>
                        <label className="shop-field">
                            {t('Kinh nghiệm bán hàng', 'Sales experience')}
                            <textarea rows={3} {...fieldProps('experience')} />
                            {fieldError('experience')}
                        </label>
                        <label className="shop-field">
                            {t('Lý do muốn hợp tác', 'Why you would like to partner')}
                            <textarea rows={3} {...fieldProps('reason')} />
                            {fieldError('reason')}
                        </label>
                        <LegalConsent purpose="partnership" checked={privacyAccepted} onChange={setPrivacyAccepted} disabled={isSubmitting} />
                        <ContactProtection protection={protection} locale={en ? 'en' : 'vi'} disabled={isSubmitting} />
                        {submissionError && <p role="alert" className="shop-error">{submissionError}</p>}
                        <button type="submit" disabled={isSubmitting || !privacyAccepted || !protection.canSubmit} className="w-full">
                            {isSubmitting ? t('Đang gửi…', 'Sending…') : t('Gửi đăng ký', 'Send application')}
                        </button>
                    </form>
                    <p className="shop-hint mt-6 text-center">
                        {t('Muốn trao đổi trực tiếp?', 'Prefer to talk?')}{' '}
                        <a href={`tel:${SHOP_CONTACT.phone}`} className="shop-link">{SHOP_CONTACT.phone}</a>
                    </p>
                </section>
            </main>
            <ShopFooter />
        </div>
    );
}
