'use client';

import { useEffect, useState } from 'react';

interface Division {
    code: number;
    name: string;
}

interface LocationSelectorProps {
    onLocationChange: (location: {
        province: string;
        district: string;
        ward: string;
        fullString: string;
    }) => void;
    initialProvince?: string;
    initialDistrict?: string;
    initialWard?: string;
}

export default function TraditionalLocationSelector({ onLocationChange, initialProvince, initialDistrict, initialWard }: LocationSelectorProps) {
    const [provinces, setProvinces] = useState<Division[]>([]);
    const [districts, setDistricts] = useState<Division[]>([]);
    const [wards, setWards] = useState<Division[]>([]);

    const [selectedProvince, setSelectedProvince] = useState<Division | null>(null);
    const [selectedDistrict, setSelectedDistrict] = useState<Division | null>(null);
    const [selectedWard, setSelectedWard] = useState<Division | null>(null);

    const [loadingP, setLoadingP] = useState(false);
    const [loadingD, setLoadingD] = useState(false);
    const [loadingW, setLoadingW] = useState(false);

    // Fetch Provinces
    useEffect(() => {
        setLoadingP(true);
        fetch('https://provinces.open-api.vn/api/?depth=1')
            .then(res => res.json())
            .then(data => {
                setProvinces(data);
                setLoadingP(false);

                if (initialProvince) {
                    const foundP = data.find((p: Division) => p.name === initialProvince);
                    if (foundP) {
                        setSelectedProvince(foundP);
                        fetchDistricts(foundP.code, initialDistrict, initialWard);
                    }
                }
            })
            .catch(err => {
                console.error(err);
                setLoadingP(false);
            });
    }, []);

    const fetchDistricts = (provinceCode: number, initDistrict?: string, initWard?: string) => {
        setLoadingD(true);
        fetch(`https://provinces.open-api.vn/api/p/${provinceCode}?depth=2`)
            .then(res => res.json())
            .then(data => {
                setDistricts(data.districts);
                setLoadingD(false);
                if (initDistrict) {
                    const foundD = data.districts.find((d: Division) => d.name === initDistrict);
                    if (foundD) {
                        setSelectedDistrict(foundD);
                        fetchWards(foundD.code, initWard);
                    }
                }
            });
    };

    const fetchWards = (districtCode: number, initWard?: string) => {
        setLoadingW(true);
        fetch(`https://provinces.open-api.vn/api/d/${districtCode}?depth=2`)
            .then(res => res.json())
            .then(data => {
                setWards(data.wards);
                setLoadingW(false);
                if (initWard) {
                    const foundW = data.wards.find((w: Division) => w.name === initWard);
                    if (foundW) setSelectedWard(foundW);
                }
            });
    };

    const handleProvinceChange = (code: number) => {
        const province = provinces.find(p => p.code === code) || null;
        setSelectedProvince(province);
        setSelectedDistrict(null);
        setSelectedWard(null);
        setDistricts([]);
        setWards([]);

        if (province) {
            fetchDistricts(code);
        }
        updateParent(province, null, null);
    };

    const handleDistrictChange = (code: number) => {
        const district = districts.find(d => d.code === code) || null;
        setSelectedDistrict(district);
        setSelectedWard(null);
        setWards([]);

        if (district) {
            fetchWards(code);
        }
        updateParent(selectedProvince, district, null);
    };

    const handleWardChange = (code: number) => {
        const ward = wards.find(w => w.code === code) || null;
        setSelectedWard(ward);
        updateParent(selectedProvince, selectedDistrict, ward);
    };

    const updateParent = (p: Division | null, d: Division | null, w: Division | null) => {
        if (p) {
            onLocationChange({
                province: p.name,
                district: d ? d.name : '',
                ward: w ? w.name : '',
                fullString: w && d ? `${w.name}, ${d.name}, ${p.name}` : ''
            });
        }
    };

    const selectClass = "w-full appearance-none bg-black/20 border border-trad-amber-600/50 rounded-lg px-4 py-2.5 text-white focus:border-trad-amber-600 focus:ring-1 focus:ring-trad-amber-600 transition-all outline-none pr-10 disabled:opacity-50";
    const arrowClass = "material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-trad-amber-600 pointer-events-none text-xl";

    return (
        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-trad-amber-200" htmlFor="city">Tỉnh/Thành phố</label>
                <div className="relative">
                    <select
                        id="city"
                        className={selectClass}
                        onChange={(e) => handleProvinceChange(Number(e.target.value))}
                        value={selectedProvince?.code || ''}
                        disabled={loadingP}
                    >
                        <option className="text-gray-500" value="">{loadingP ? 'Đang tải...' : 'Chọn Tỉnh/Thành'}</option>
                        {provinces.map(p => (
                            <option key={p.code} className="text-black" value={p.code}>{p.name}</option>
                        ))}
                    </select>
                    <span className={arrowClass}>keyboard_arrow_down</span>
                </div>
            </div>
            <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-trad-amber-200" htmlFor="district">Quận/Huyện</label>
                <div className="relative">
                    <select
                        id="district"
                        className={selectClass}
                        onChange={(e) => handleDistrictChange(Number(e.target.value))}
                        value={selectedDistrict?.code || ''}
                        disabled={!selectedProvince || loadingD}
                    >
                        <option className="text-gray-500" value="">{loadingD ? 'Đang tải...' : 'Chọn Quận/Huyện'}</option>
                        {districts.map(d => (
                            <option key={d.code} className="text-black" value={d.code}>{d.name}</option>
                        ))}
                    </select>
                    <span className={arrowClass}>keyboard_arrow_down</span>
                </div>
            </div>
            <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-trad-amber-200" htmlFor="ward">Phường/Xã</label>
                <div className="relative">
                    <select
                        id="ward"
                        className={selectClass}
                        onChange={(e) => handleWardChange(Number(e.target.value))}
                        value={selectedWard?.code || ''}
                        disabled={!selectedDistrict || loadingW}
                    >
                        <option className="text-gray-500" value="">{loadingW ? 'Đang tải...' : 'Chọn Phường/Xã'}</option>
                        {wards.map(w => (
                            <option key={w.code} className="text-black" value={w.code}>{w.name}</option>
                        ))}
                    </select>
                    <span className={arrowClass}>keyboard_arrow_down</span>
                </div>
            </div>
        </div>
    );
}
