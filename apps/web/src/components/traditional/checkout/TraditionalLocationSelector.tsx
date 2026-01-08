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

    // Initial Fetch of Provinces
    useEffect(() => {
        const fetchProvinces = async () => {
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
        fetchProvinces();
    }, []);

    // Sync state with props when they change (e.g. loaded from profile)
    useEffect(() => {
        const syncAddress = async () => {
            if (provinces.length === 0) return;

            // 1. Sync Province
            if (initialProvince && (!selectedProvince || selectedProvince.name !== initialProvince)) {
                const p = provinces.find(x => x.name === initialProvince);
                if (p) {
                    setSelectedProvince(p);

                    // Fetch Districts for this province
                    setLoadingD(true);
                    try {
                        const dRes = await fetch(`https://provinces.open-api.vn/api/p/${p.code}?depth=2`);
                        const dData = await dRes.json();
                        setDistricts(dData.districts);

                        // 2. Sync District (if waiting for district)
                        if (initialDistrict) {
                            const d = dData.districts.find((x: Division) => x.name === initialDistrict);
                            if (d) {
                                setSelectedDistrict(d);

                                // Fetch Wards for this district
                                setLoadingW(true);
                                const wRes = await fetch(`https://provinces.open-api.vn/api/d/${d.code}?depth=2`);
                                const wData = await wRes.json();
                                setWards(wData.wards);
                                setLoadingW(false);

                                // 3. Sync Ward
                                if (initialWard) {
                                    const w = wData.wards.find((x: Division) => x.name === initialWard);
                                    if (w) setSelectedWard(w);
                                }
                            }
                        }
                    } catch (err: unknown) {
                        console.error(err);
                    } finally {
                        setLoadingD(false);
                    }
                }
            } else if (selectedProvince && selectedProvince.name === initialProvince) {
                // Province matches, check District mismatch (rare but possible if only district changed externally)
                if (initialDistrict && (!selectedDistrict || selectedDistrict.name !== initialDistrict)) {
                    // Ensure districts are loaded
                    let currentDistricts = districts;
                    if (currentDistricts.length === 0) {
                        setLoadingD(true);
                        const dRes = await fetch(`https://provinces.open-api.vn/api/p/${selectedProvince.code}?depth=2`);
                        const dData = await dRes.json();
                        setDistricts(dData.districts);
                        currentDistricts = dData.districts;
                        setLoadingD(false);
                    }

                    const d = currentDistricts.find(x => x.name === initialDistrict);
                    if (d) {
                        setSelectedDistrict(d);

                        // Fetch Wards
                        setLoadingW(true);
                        const wRes = await fetch(`https://provinces.open-api.vn/api/d/${d.code}?depth=2`);
                        const wData = await wRes.json();
                        setWards(wData.wards);
                        setLoadingW(false);

                        if (initialWard) {
                            const w = wData.wards.find((x: Division) => x.name === initialWard);
                            if (w) setSelectedWard(w);
                        }
                    }
                }
            }
        };

        syncAddress();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [provinces, initialProvince, initialDistrict, initialWard]);

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

    const fetchDistricts = async (provinceCode: number) => {
        setLoadingD(true);
        try {
            const res = await fetch(`https://provinces.open-api.vn/api/p/${provinceCode}?depth=2`);
            const data = await res.json();
            setDistricts(data.districts);
        } finally {
            setLoadingD(false);
        }
    };

    const fetchWards = async (districtCode: number) => {
        setLoadingW(true);
        try {
            const res = await fetch(`https://provinces.open-api.vn/api/d/${districtCode}?depth=2`);
            const data = await res.json();
            setWards(data.wards);
        } finally {
            setLoadingW(false);
        }
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
