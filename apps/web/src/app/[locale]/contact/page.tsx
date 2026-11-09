'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Mail, MapPin, Phone } from 'lucide-react';
import { LegalConsent } from '@/components/legal/LegalConsent';
import { ContactProtection } from '@/components/contact/ContactProtection';
import { ShopFooter, ShopHeader } from '@/components/layout/ShopChrome';
import { legalAcceptance, SHOP_CONTACT } from '@/lib/legal';
import { submitContact } from '@/lib/api-client';
import { useContactProtection } from '@/hooks/useContactProtection';
import { useBilingual } from '@/hooks/useBilingual';

// Values stay in Vietnamese so the shop's inbox reads the same for every customer.
const TOPICS = [
    { value: 'Tư vấn sản phẩm trầm hương', en: 'Product advice' },
    { value: 'Hợp tác kinh doanh', en: 'Business partnership' },
    { value: 'Phản hồi dịch vụ', en: 'Service feedback' },
    { value: 'Khác', en: 'Something else' },
];

type ContactFormValues = { full_name: string; email: string; topic?: string; message: string };

export default function ContactPage() {
    const { en, t } = useBilingual();
    const protection = useContactProtection();
    const [privacyAccepted, setPrivacyAccepted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionError, setSubmissionError] = useState<string | null>(null);

    const schema = z.object({
        full_name: z.string().min(2, t('Vui lòng nhập tên của bạn', 'Please enter your name')),
        email: z.string().email(t('Email chưa đúng định dạng', 'Please enter a valid email')),
        topic: z.string().optional(),
        message: z.string().min(10, t('Lời nhắn hơi ngắn, bạn viết thêm vài chữ nhé', 'Please add a little more detail')),
    });
    const { register, handleSubmit, reset, formState: { errors } } = useForm<ContactFormValues>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: fix type
        resolver: zodResolver(schema as any),
        defaultValues: { topic: TOPICS[0].value },
    });

    const onSubmit = async (data: ContactFormValues) => {
        if (!protection.canSubmit || !privacyAccepted) return;
        setSubmissionError(null);
        setIsSubmitting(true);
        try {
            await submitContact({ ...data, legalAcceptance: legalAcceptance(), ...(protection.token ? { turnstileToken: protection.token } : {}) });
            toast.success(t('Đã gửi lời nhắn', 'Message sent'), {
                description: t('Thiên Phúc sẽ phản hồi bạn sớm nhất có thể.', 'Thiên Phúc will reply as soon as possible.'),
            });
            reset();
            setPrivacyAccepted(false);
        } catch {
            setSubmissionError(t('Chưa gửi được lời nhắn. Vui lòng thử lại sau ít phút.', 'Your message did not go through. Please try again shortly.'));
        } finally {
            protection.resetToken();
            setIsSubmitting(false);
        }
    };

    const fieldError = (id: keyof ContactFormValues) => errors[id]?.message
        ? <span id={`${id}-error`} role="alert" className="shop-error">{errors[id]?.message}</span>
        : null;
    const fieldProps = (id: keyof ContactFormValues) => ({
        id,
        'aria-invalid': !!errors[id],
        'aria-describedby': errors[id] ? `${id}-error` : undefined,
        ...register(id),
    });

    const details = [
        { icon: MapPin, label: t('Cửa hàng', 'Shop'), value: SHOP_CONTACT.address },
        { icon: Phone, label: t('Điện thoại · 8:00–21:00 mỗi ngày', 'Phone · 8:00–21:00 daily'), value: SHOP_CONTACT.phone, href: `tel:${SHOP_CONTACT.phone}` },
        { icon: Mail, label: 'Email', value: SHOP_CONTACT.email, href: `mailto:${SHOP_CONTACT.email}` },
    ];

    return (
        <div className="atelier-page flex min-h-screen flex-col bg-trad-bg-light font-display">
            <ShopHeader />
            <main className="shop-page">
                <div className="grid w-full max-w-[1120px] gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)] lg:gap-16">
                    <div>
                        <p className="shop-eyebrow">{t('Liên hệ', 'Contact')}</p>
                        <h1 className="shop-title">{t('Trò chuyện cùng Thiên Phúc', 'Talk to Thiên Phúc')}</h1>
                        <p className="shop-lede max-w-md">{t('Cần chọn món phù hợp, hỏi về đơn hàng hay muốn hợp tác, bạn cứ nhắn cho chúng tôi.', 'Whether you need help choosing a piece, have a question about an order or want to work with us, just send a note.')}</p>
                        <ul className="mt-8 flex flex-col gap-5">
                            {details.map(({ icon: Icon, label, value, href }) => (
                                <li key={label} className="flex items-start gap-3">
                                    <Icon size={20} className="mt-0.5 shrink-0 text-trad-primary" aria-hidden="true" />
                                    <div>
                                        <p className="shop-hint">{label}</p>
                                        {href ? <a href={href} className="shop-link text-[15px]">{value}</a> : <p className="text-[15px]">{value}</p>}
                                    </div>
                                </li>
                            ))}
                        </ul>
                        <div className="relative mt-10 hidden aspect-[4/3] overflow-hidden rounded-xl lg:block">
                            <Image src="/editorial/ritual.webp" alt="" fill sizes="50vw" className="object-cover" />
                        </div>
                    </div>

                    <form className="shop-card flex flex-col gap-5 self-start" onSubmit={handleSubmit(onSubmit)} noValidate>
                        <h2 className="font-serif text-2xl">{t('Gửi lời nhắn', 'Send a message')}</h2>
                        <label className="shop-field">
                            {t('Họ và tên', 'Full name')}
                            <input type="text" autoComplete="name" {...fieldProps('full_name')} />
                            {fieldError('full_name')}
                        </label>
                        <label className="shop-field">
                            Email
                            <input type="email" autoComplete="email" {...fieldProps('email')} />
                            {fieldError('email')}
                        </label>
                        <label className="shop-field">
                            {t('Chủ đề', 'Topic')}
                            <select {...register('topic')}>
                                {TOPICS.map((topic) => <option key={topic.value} value={topic.value}>{en ? topic.en : topic.value}</option>)}
                            </select>
                        </label>
                        <label className="shop-field">
                            {t('Lời nhắn', 'Message')}
                            <textarea rows={5} {...fieldProps('message')} />
                            {fieldError('message')}
                        </label>
                        <LegalConsent purpose="contact" checked={privacyAccepted} onChange={setPrivacyAccepted} disabled={isSubmitting} />
                        <ContactProtection protection={protection} locale={en ? 'en' : 'vi'} disabled={isSubmitting} />
                        {submissionError && <p role="alert" className="shop-error">{submissionError}</p>}
                        <button type="submit" disabled={isSubmitting || !protection.canSubmit || !privacyAccepted} className="w-full">
                            {isSubmitting ? t('Đang gửi…', 'Sending…') : t('Gửi lời nhắn', 'Send message')}
                        </button>
                    </form>
                </div>
            </main>
            <ShopFooter />
        </div>
    );
}
