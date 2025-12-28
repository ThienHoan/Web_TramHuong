'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { getProfile, updateProfile, setAccessToken } from '@/lib/api-client';
import { useRouter } from '@/i18n/routing';
import TraditionalHeader from '@/components/traditional/TraditionalHeader';
import TraditionalFooter from '@/components/traditional/TraditionalFooter';

interface Division {
    code: number;
    name: string;
}

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function ProfilePage() {
    const { session, refreshProfile } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [alertState, setAlertState] = useState<{ type: 'success' | 'destructive'; title: string; message: string } | null>(null);

    // Location State
    const [provinces, setProvinces] = useState<Division[]>([]);
    const [districts, setDistricts] = useState<Division[]>([]);
    const [wards, setWards] = useState<Division[]>([]);

    const [formData, setFormData] = useState({
        full_name: '',
        phone_number: '',
        avatar_url: '',
        province: '',
        district: '',
        ward: '',
        street_address: ''
    });

    useEffect(() => {
        if (!session) {
            router.push('/login');
            return;
        }

        setAccessToken(session.access_token);

        // Fetch Profile and Provinces in parallel
        Promise.all([
            getProfile(),
            fetch('https://provinces.open-api.vn/api/?depth=1').then(res => res.json())
        ])
            .then(([profileData, provinceData]) => {
                setProvinces(provinceData);

                if (profileData) {
                    setFormData({
                        full_name: profileData.full_name || '',
                        phone_number: profileData.phone_number || '',
                        avatar_url: profileData.avatar_url || '',
                        province: profileData.province || '',
                        district: profileData.district || '',
                        ward: profileData.ward || '',
                        street_address: profileData.street_address || ''
                    });

                    // Pre-load districts and wards if data exists
                    if (profileData.province) {
                        const p = provinceData.find((d: Division) => d.name === profileData.province);
                        if (p) {
                            fetch(`https://provinces.open-api.vn/api/p/${p.code}?depth=2`)
                                .then(res => res.json())
                                .then(dData => {
                                    setDistricts(dData.districts);
                                    if (profileData.district) {
                                        const d = dData.districts.find((d: Division) => d.name === profileData.district);
                                        if (d) {
                                            fetch(`https://provinces.open-api.vn/api/d/${d.code}?depth=2`)
                                                .then(res => res.json())
                                                .then(wData => setWards(wData.wards));
                                        }
                                    }
                                });
                        }
                    }
                }
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [session, router]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const code = Number(e.target.value);
        const province = provinces.find(p => p.code === code);

        setFormData(prev => ({
            ...prev,
            province: province?.name || '',
            district: '',
            ward: ''
        }));
        setDistricts([]);
        setWards([]);

        if (province) {
            fetch(`https://provinces.open-api.vn/api/p/${code}?depth=2`)
                .then(res => res.json())
                .then(data => setDistricts(data.districts));
        }
    };

    const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const code = Number(e.target.value);
        const district = districts.find(d => d.code === code);

        setFormData(prev => ({
            ...prev,
            district: district?.name || '',
            ward: ''
        }));
        setWards([]);

        if (district) {
            fetch(`https://provinces.open-api.vn/api/d/${code}?depth=2`)
                .then(res => res.json())
                .then(data => setWards(data.wards));
        }
    };

    const handleWardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const code = Number(e.target.value);
        const ward = wards.find(w => w.code === code);
        setFormData(prev => ({ ...prev, ward: ward?.name || '' }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setAlertState(null);
        try {
            await updateProfile(formData);
            await refreshProfile();
            setAlertState({
                type: 'success',
                title: 'Thành công',
                message: 'Cập nhật hồ sơ thành công!'
            });
            window.scrollTo({ top: 0, behavior: 'smooth' });
            router.refresh();
        } catch (error: any) {
            setAlertState({
                type: 'destructive',
                title: 'Lỗi',
                message: error.message || 'Cập nhật thất bại'
            });
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="bg-trad-bg-light min-h-screen flex flex-col font-display selection:bg-trad-primary selection:text-white">
            <TraditionalHeader />
            <main className="flex-grow flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-trad-primary border-t-transparent rounded-full animate-spin"></div>
            </main>
            <TraditionalFooter />
        </div>
    );

    return (
        <div className="bg-trad-bg-light dark:bg-black text-trad-text-main font-display transition-colors duration-300 min-h-screen flex flex-col relative selection:bg-trad-primary selection:text-white">
            {/* Background Patterns */}
            <div className="absolute inset-0 opacity-40 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] mix-blend-multiply z-0"></div>

            <TraditionalHeader />

            <main className="relative z-10 container mx-auto px-4 py-12 max-w-6xl flex-grow">
                <header className="mb-12 text-center">
                    <h1 className="font-display text-4xl md:text-5xl font-bold text-trad-red-900 mb-3">Hồ Sơ Của Tôi</h1>
                    <p className="text-trad-text-muted italic font-serif text-lg">"Hành trình của hương thơm, lưu giữ từng khoảnh khắc"</p>
                </header>



                <AnimatePresence>
                    {alertState && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.4, ease: "easeInOut" }}
                            className="mb-8"
                        >
                            <Alert variant={alertState.type}>
                                <AlertDescription>
                                    {alertState.message}
                                </AlertDescription>
                            </Alert>
                        </motion.div>
                    )}
                </AnimatePresence>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Sidebar / Left Column */}
                    <div className="lg:col-span-4 flex flex-col gap-8">
                        <div className="bg-white dark:bg-stone-900 rounded-xl shadow-soft border border-trad-border-warm overflow-hidden relative group">
                            <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-trad-gold opacity-20 rounded-tl-xl"></div>
                            <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-trad-gold opacity-20 rounded-br-xl"></div>

                            <div className="p-8 flex flex-col items-center text-center">
                                <h2 className="font-display text-2xl font-bold mb-2 text-trad-primary">Chân Dung Hương Trầm</h2>
                                <p className="text-sm text-trad-text-muted mb-6">Nơi lưu giữ dấu ấn của bạn</p>

                                <div className="relative w-40 h-40 mb-6 group cursor-pointer">
                                    <div className="absolute inset-0 rounded-full border-2 border-trad-gold border-dashed animate-spin-slow opacity-50"></div>
                                    <div className="absolute inset-2 rounded-full border-2 border-trad-primary shadow-glow overflow-hidden bg-gray-100">
                                        {formData.avatar_url ? (
                                            <img alt="User Avatar" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" src={formData.avatar_url} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-trad-bg-warm text-trad-primary text-4xl font-display font-bold">
                                                {formData.full_name?.charAt(0) || 'T'}
                                            </div>
                                        )}
                                    </div>
                                    <button type="button" className="absolute bottom-2 right-2 bg-trad-primary text-white p-2 rounded-full shadow-lg hover:bg-trad-red-900 transition-colors">
                                        <span className="material-symbols-outlined text-sm">edit</span>
                                    </button>
                                </div>

                                <div className="w-full mb-8">
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-trad-text-muted mb-2 text-left">Đường dẫn ảnh đại diện</label>
                                    <input
                                        name="avatar_url"
                                        value={formData.avatar_url}
                                        onChange={handleChange}
                                        className="w-full bg-trad-bg-light border-b-2 border-trad-border-warm focus:border-trad-primary focus:ring-0 text-sm px-0 py-2 transition-colors placeholder-stone-400 focus:outline-none"
                                        placeholder="https://..."
                                        type="url"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-stone-900 rounded-xl shadow-soft p-8 border border-trad-border-warm">
                            <h3 className="font-display text-xl font-bold mb-6 flex items-center gap-2 text-trad-text-main">
                                <span className="material-symbols-outlined text-trad-gold">person</span>
                                Thông tin cá nhân
                            </h3>
                            <div className="space-y-5">
                                <div className="group">
                                    <label className="block text-sm font-medium text-trad-text-muted mb-1">Họ và tên</label>
                                    <input
                                        name="full_name"
                                        value={formData.full_name}
                                        onChange={handleChange}
                                        className="block w-full rounded-md border-trad-border-warm shadow-sm focus:border-trad-gold focus:ring-trad-gold sm:text-sm py-3 transition-all group-hover:border-trad-gold"
                                        type="text"
                                        required
                                    />
                                </div>
                                <div className="group">
                                    <label className="block text-sm font-medium text-trad-text-muted mb-1">Số điện thoại</label>
                                    <input
                                        name="phone_number"
                                        value={formData.phone_number}
                                        onChange={handleChange}
                                        className="block w-full rounded-md border-trad-border-warm shadow-sm focus:border-trad-gold focus:ring-trad-gold sm:text-sm py-3 transition-all group-hover:border-trad-gold"
                                        type="tel"
                                        placeholder="0912..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content / Right Column */}
                    <div className="lg:col-span-8">
                        <div className="bg-white dark:bg-stone-900 rounded-xl shadow-soft border border-trad-border-warm overflow-hidden h-full flex flex-col">
                            <div className="relative h-48 w-full overflow-hidden bg-trad-bg-dark">
                                <img alt="Traditional Vietnamese Landscape Silk Painting Style" className="w-full h-full object-cover opacity-80 mix-blend-overlay" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD5M3Hxs-r5S6jSon1zANp9U9E_swJAZcH-ns9joJszLE2lpWR0-yLTYCfNtLdTijd34Udo0o6cesH6U3SrwKbfPZAVdq86yHk0xBRjNBINwrDw1P_DVFrimKDS4QoVj_8r9seYPtApGrNqrr0v9MJDnoyV_ghsmFj8P6mgwfkdfUC_bD8Hg4mRExEXrbFr-8yT-p3qiTI2v_vJSTFtlK7fge9ZssXfqXqpzatG-7dtWfkdOk-SnNDU4FsZUlVIwV_x3VZBP7CWF52z" />
                                <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-black to-transparent"></div>
                                <div className="absolute bottom-6 left-8">
                                    <h2 className="font-display text-3xl font-bold text-trad-primary mb-1 shadow-black drop-shadow-sm">Dấu Chân Hương Trầm</h2>
                                    <p className="text-trad-text-main font-medium italic">"Hương trầm tìm về chốn an yên"</p>
                                </div>
                            </div>

                            <div className="p-8 pt-4 flex-grow">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    <div className="col-span-1">
                                        <label className="block text-sm font-semibold text-trad-text-muted mb-2">Tỉnh / Thành phố</label>
                                        <div className="relative">
                                            <select
                                                onChange={handleProvinceChange}
                                                value={provinces.find(p => p.name === formData.province)?.code || ''}
                                                className="block w-full rounded-lg border-trad-border-warm bg-trad-bg-light text-trad-text-main shadow-sm focus:border-trad-primary focus:ring-trad-primary sm:text-sm py-3 pl-3 pr-10 appearance-none cursor-pointer"
                                            >
                                                <option value="">Chọn Tỉnh/Thành phố</option>
                                                {provinces.map(p => (
                                                    <option key={p.code} value={p.code}>{p.name}</option>
                                                ))}
                                            </select>
                                            <span className="material-symbols-outlined absolute right-3 top-3 text-stone-400 pointer-events-none">expand_more</span>
                                        </div>
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-sm font-semibold text-trad-text-muted mb-2">Quận / Huyện</label>
                                        <div className="relative">
                                            <select
                                                onChange={handleDistrictChange}
                                                value={districts.find(d => d.name === formData.district)?.code || ''}
                                                disabled={!formData.province}
                                                className="block w-full rounded-lg border-trad-border-warm bg-trad-bg-light text-trad-text-main shadow-sm focus:border-trad-primary focus:ring-trad-primary sm:text-sm py-3 pl-3 pr-10 appearance-none cursor-pointer disabled:opacity-50"
                                            >
                                                <option value="">Chọn Quận/Huyện</option>
                                                {districts.map(d => (
                                                    <option key={d.code} value={d.code}>{d.name}</option>
                                                ))}
                                            </select>
                                            <span className="material-symbols-outlined absolute right-3 top-3 text-stone-400 pointer-events-none">expand_more</span>
                                        </div>
                                    </div>
                                    <div className="col-span-1 md:col-span-2">
                                        <label className="block text-sm font-semibold text-trad-text-muted mb-2">Phường / Xã</label>
                                        <div className="relative">
                                            <select
                                                onChange={handleWardChange}
                                                value={wards.find(w => w.name === formData.ward)?.code || ''}
                                                disabled={!formData.district}
                                                className="block w-full rounded-lg border-trad-border-warm bg-trad-bg-light text-trad-text-main shadow-sm focus:border-trad-primary focus:ring-trad-primary sm:text-sm py-3 pl-3 pr-10 appearance-none cursor-pointer disabled:opacity-50"
                                            >
                                                <option value="">Chọn Phường/Xã</option>
                                                {wards.map(w => (
                                                    <option key={w.code} value={w.code}>{w.name}</option>
                                                ))}
                                            </select>
                                            <span className="material-symbols-outlined absolute right-3 top-3 text-stone-400 pointer-events-none">expand_more</span>
                                        </div>
                                    </div>
                                    <div className="col-span-1 md:col-span-2">
                                        <label className="block text-sm font-semibold text-trad-text-muted mb-2">Địa chỉ cụ thể</label>
                                        <div className="relative group">
                                            <span className="material-symbols-outlined absolute left-3 top-3 text-stone-400 group-focus-within:text-trad-primary transition-colors">home</span>
                                            <input
                                                name="street_address"
                                                value={formData.street_address}
                                                onChange={handleChange}
                                                className="block w-full rounded-lg border-trad-border-warm bg-trad-bg-light text-trad-text-main shadow-sm focus:border-trad-primary focus:ring-trad-primary sm:text-sm py-3 pl-10"
                                                type="text"
                                                placeholder="123 Nguyen Hue..."
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-trad-amber-50 border-l-4 border-trad-gold p-4 rounded-r-md mb-8 flex items-start gap-3">
                                    <span className="material-symbols-outlined text-trad-gold mt-0.5">place</span>
                                    <div>
                                        <p className="text-sm font-medium text-trad-text-main">Địa chỉ hiện tại:</p>
                                        <p className="text-sm text-trad-text-main/80">
                                            {[formData.street_address, formData.ward, formData.district, formData.province].filter(Boolean).join(', ') || 'Chưa có thông tin địa chỉ chi tiết.'}
                                        </p>
                                    </div>
                                </div>

                                <div className="border-t border-trad-border-warm pt-6 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="bg-trad-primary hover:bg-trad-red-900 text-white px-8 py-3 rounded-lg shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2 font-display font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {saving ? (
                                            <>
                                                <span className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></span>
                                                Đang lưu...
                                            </>
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined">save</span>
                                                Lưu Thay Đổi
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </main>

            <TraditionalFooter />
        </div>
    );
}
