'use client';

import { useState, useEffect } from 'react';

interface Division {
    code: number;
    name: string;
}

export interface GuestSubmitData {
    name: string;
    phone: string;
    address: string;
    province: string;
    district: string;
    ward: string;
    full_address: string;
}

interface GuestCheckoutFormProps {
    onSubmit: (data: GuestSubmitData) => void;
}

export default function GuestCheckoutForm({ onSubmit }: GuestCheckoutFormProps) {
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        address: '',
        province: '',
        district: '',
        ward: ''
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.name.trim()) newErrors.name = 'Vui lòng nhập họ tên';
        if (!formData.phone.trim()) {
            newErrors.phone = 'Vui lòng nhập số điện thoại';
        } else if (!/^\d{10,11}$/.test(formData.phone.replace(/\s/g, ''))) {
            newErrors.phone = 'Số điện thoại không hợp lệ (10-11 số)';
        }
        if (!formData.address.trim()) newErrors.address = 'Vui lòng nhập địa chỉ';
        if (!formData.province || !formData.district || !formData.ward) {
            newErrors.location = 'Vui lòng chọn đầy đủ Tỉnh/Thành, Quận/Huyện, Phường/Xã';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (validate()) {
            onSubmit({
                ...formData,
                phone: (function (p) {
                    p = p.trim().replace(/\s/g, '');
                    if (p.startsWith('0')) return '+84' + p.slice(1);
                    if (p.startsWith('84')) return '+' + p;
                    if (!p.startsWith('+')) return '+84' + p;
                    return p;
                })(formData.phone),
                full_address: `${formData.address}, ${formData.ward}, ${formData.district}, ${formData.province}`
            });
        }
    };

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Name */}
            <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-trad-text-main" htmlFor="guest-name">Họ và tên <span className="text-red-500">*</span></label>
                <input
                    id="guest-name"
                    type="text"
                    className={`w-full bg-white border rounded-lg px-4 py-3 text-base text-trad-text-main placeholder-trad-text-muted focus:ring-1 transition-all outline-none ${errors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-trad-border-warm focus:border-trad-primary focus:ring-trad-primary'}`}
                    placeholder="Ví dụ: Nguyễn Văn A"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
                {errors.name && <p className="text-xs text-red-500 font-medium">{errors.name}</p>}
            </div>

            {/* Phone */}
            <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-trad-text-main" htmlFor="guest-phone">Số điện thoại <span className="text-red-500">*</span></label>
                <input
                    id="guest-phone"
                    type="tel"
                    inputMode="numeric"
                    className={`w-full bg-white border rounded-lg px-4 py-3 text-base text-trad-text-main placeholder-trad-text-muted focus:ring-1 transition-all outline-none ${errors.phone ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-trad-border-warm focus:border-trad-primary focus:ring-trad-primary'}`}
                    placeholder="Ví dụ: 0912 345 678"
                    value={formData.phone}
                    onChange={e => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setFormData({ ...formData, phone: val });
                    }}
                />
                {errors.phone && <p className="text-xs text-red-500 font-medium">{errors.phone}</p>}
            </div>

            {/* Location Selector (Light Theme Logic) */}
            <div className="bg-trad-bg-warm/30 p-4 rounded-xl border border-trad-border-warm/50 flex flex-col gap-4">
                <p className="text-sm font-bold text-trad-text-main flex items-center gap-2">
                    <span className="material-symbols-outlined text-trad-primary">location_on</span>
                    Địa chỉ hành chính <span className="text-red-500">*</span>
                </p>
                <LightLocationSelector
                    onLocationChange={(loc) => setFormData(prev => ({ ...prev, province: loc.province, district: loc.district, ward: loc.ward }))}
                />
                {errors.location && <p className="text-xs text-red-500 font-medium">{errors.location}</p>}
            </div>

            {/* Address */}
            <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-trad-text-main" htmlFor="guest-address">Địa chỉ chi tiết <span className="text-red-500">*</span></label>
                <input
                    id="guest-address"
                    type="text"
                    className={`w-full bg-white border rounded-lg px-4 py-3 text-base text-trad-text-main placeholder-trad-text-muted focus:ring-1 transition-all outline-none ${errors.address ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-trad-border-warm focus:border-trad-primary focus:ring-trad-primary'}`}
                    placeholder="Số nhà, tên đường, tòa nhà..."
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                />
                {errors.address && <p className="text-xs text-red-500 font-medium">{errors.address}</p>}
            </div>

            {/* Submit Button (Sticky on Mobile via logic or utility, here standard flow) */}
            {/* Note: The parent page can handle sticky if needed, or we can make this sticky. 
                For clean integration, we'll keep it as flow content, but high contrast. */}
            <button
                onClick={handleSubmit}
                className="mt-6 w-full bg-trad-primary hover:bg-trad-primary-dark text-white font-bold py-4 px-6 rounded-lg shadow-lg shadow-orange-900/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 group text-lg"
            >
                Tiếp tục thanh toán
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </button>
            <p className="text-xs text-center text-trad-text-muted">Thông tin của bạn được bảo mật tuyệt đối.</p>
        </div>
    );
}

function LightLocationSelector({ onLocationChange }: { onLocationChange: (loc: { province: string, district: string, ward: string }) => void }) {
    const [provinces, setProvinces] = useState<Division[]>([]);
    const [districts, setDistricts] = useState<Division[]>([]);
    const [wards, setWards] = useState<Division[]>([]);

    const [selectedProvince, setSelectedProvince] = useState<Division | null>(null);
    const [selectedDistrict, setSelectedDistrict] = useState<Division | null>(null);
    const [selectedWard, setSelectedWard] = useState<Division | null>(null);

    const [loadingP, setLoadingP] = useState(false);
    const [loadingD, setLoadingD] = useState(false);
    const [loadingW, setLoadingW] = useState(false);

    useEffect(() => {
        const init = async () => {
            setLoadingP(true);
            try {
                const res = await fetch('https://provinces.open-api.vn/api/?depth=1');
                const data = await res.json();
                setProvinces(data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoadingP(false);
            }
        };
        init();
    }, []);

    const fetchDistricts = async (code: number) => {
        setLoadingD(true);
        try {
            const res = await fetch(`https://provinces.open-api.vn/api/p/${code}?depth=2`);
            const data = await res.json();
            setDistricts(data.districts);
        } finally {
            setLoadingD(false);
        }
    };

    const fetchWards = async (code: number) => {
        setLoadingW(true);
        try {
            const res = await fetch(`https://provinces.open-api.vn/api/d/${code}?depth=2`);
            const data = await res.json();
            setWards(data.wards);
        } finally {
            setLoadingW(false);
        }
    };

    const handleProvinceChange = (code: number) => {
        const p = provinces.find(x => x.code === code) || null;
        setSelectedProvince(p);
        setSelectedDistrict(null); setSelectedWard(null);
        setDistricts([]); setWards([]);
        onLocationChange({ province: p?.name || '', district: '', ward: '' });
        if (p) fetchDistricts(code);
    };

    const handleDistrictChange = (code: number) => {
        const d = districts.find(x => x.code === code) || null;
        setSelectedDistrict(d);
        setSelectedWard(null); setWards([]);
        onLocationChange({ province: selectedProvince?.name || '', district: d?.name || '', ward: '' });
        if (d) fetchWards(code);
    };

    const handleWardChange = (code: number) => {
        const w = wards.find(x => x.code === code) || null;
        setSelectedWard(w);
        onLocationChange({ province: selectedProvince?.name || '', district: selectedDistrict?.name || '', ward: w?.name || '' });
    };

    const selectClass = "w-full bg-white border border-trad-border-warm rounded-lg px-4 py-2.5 text-trad-text-main focus:border-trad-primary focus:ring-1 focus:ring-trad-primary transition-all outline-none appearance-none disabled:opacity-50 disabled:bg-gray-100";
    const arrowClass = "material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-trad-text-muted pointer-events-none text-xl";

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
                <select className={selectClass} onChange={e => handleProvinceChange(Number(e.target.value))} value={selectedProvince?.code || ''} disabled={loadingP}>
                    <option value="">{loadingP ? 'Đang tải...' : 'Tỉnh / Thành'}</option>
                    {provinces.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
                </select>
                <span className={arrowClass}>arrow_drop_down</span>
            </div>
            <div className="relative">
                <select className={selectClass} onChange={e => handleDistrictChange(Number(e.target.value))} value={selectedDistrict?.code || ''} disabled={!selectedProvince}>
                    <option value="">{loadingD ? 'Đang tải...' : 'Quận / Huyện'}</option>
                    {districts.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
                </select>
                <span className={arrowClass}>arrow_drop_down</span>
            </div>
            <div className="relative">
                <select className={selectClass} onChange={e => handleWardChange(Number(e.target.value))} value={selectedWard?.code || ''} disabled={!selectedDistrict}>
                    <option value="">{loadingW ? 'Đang tải...' : 'Phường / Xã'}</option>
                    {wards.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}
                </select>
                <span className={arrowClass}>arrow_drop_down</span>
            </div>
        </div>
    );
}
