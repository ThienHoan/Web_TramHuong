'use client';

import { useEffect, useState, useCallback } from 'react';

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

export default function LocationSelector({ onLocationChange, initialProvince, initialDistrict, initialWard }: LocationSelectorProps) {
    const [provinces, setProvinces] = useState<Division[]>([]);
    const [districts, setDistricts] = useState<Division[]>([]);
    const [wards, setWards] = useState<Division[]>([]);

    const [selectedProvince, setSelectedProvince] = useState<Division | null>(null);
    const [selectedDistrict, setSelectedDistrict] = useState<Division | null>(null);
    const [selectedWard, setSelectedWard] = useState<Division | null>(null);

    const [loadingP, setLoadingP] = useState(false);
    const [loadingD, setLoadingD] = useState(false);
    const [loadingW, setLoadingW] = useState(false);

    const updateParent = useCallback((p: Division | null, d: Division | null, w: Division | null) => {
        if (p && d && w) {
            onLocationChange({
                province: p.name,
                district: d.name,
                ward: w.name,
                fullString: `${w.name}, ${d.name}, ${p.name}`
            });
        } else if (p) {
            // Partial update if needed
            onLocationChange({
                province: p.name,
                district: d ? d.name : '',
                ward: w ? w.name : '',
                fullString: '' // Empty means incomplete
            });
        }
    }, [onLocationChange]);

    const fetchWards = useCallback(async (districtCode: number, initWard?: string) => {
        setLoadingW(true);
        try {
            const res = await fetch(`https://provinces.open-api.vn/api/d/${districtCode}?depth=2`);
            const data = await res.json();
            setWards(data.wards);

            if (initWard) {
                const foundW = data.wards.find((w: Division) => w.name === initWard);
                if (foundW) setSelectedWard(foundW);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingW(false);
        }
    }, []);

    const fetchDistricts = useCallback(async (provinceCode: number, initDistrict?: string, initWard?: string) => {
        setLoadingD(true);
        try {
            const res = await fetch(`https://provinces.open-api.vn/api/p/${provinceCode}?depth=2`);
            const data = await res.json();
            setDistricts(data.districts);

            if (initDistrict) {
                const foundD = data.districts.find((d: Division) => d.name === initDistrict);
                if (foundD) {
                    setSelectedDistrict(foundD);
                    fetchWards(foundD.code, initWard);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingD(false);
        }
    }, [fetchWards]);

    // Initial Fetch
    useEffect(() => {
        const init = async () => {
            setLoadingP(true);
            try {
                const res = await fetch('https://provinces.open-api.vn/api/?depth=1');
                const data = await res.json();
                setProvinces(data);

                if (initialProvince) {
                    const foundP = data.find((p: Division) => p.name === initialProvince);
                    if (foundP) {
                        setSelectedProvince(foundP);
                        fetchDistricts(foundP.code, initialDistrict, initialWard);
                    }
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoadingP(false);
            }
        };
        init();
    }, [fetchDistricts, initialDistrict, initialProvince, initialWard]); // Run once or when initials change

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

    return (
        <div className="space-y-3">
            {/* Province */}
            <div>
                <label className="block text-sm font-medium mb-1">Province / City</label>
                <select
                    className="w-full border p-2 rounded bg-white disabled:bg-gray-100"
                    onChange={(e) => handleProvinceChange(Number(e.target.value))}
                    value={selectedProvince?.code || ''}
                    disabled={loadingP}
                >
                    <option value="">{loadingP ? 'Loading...' : 'Select Province'}</option>
                    {provinces.map(p => (
                        <option key={p.code} value={p.code}>{p.name}</option>
                    ))}
                </select>
            </div>

            {/* District */}
            <div className={!selectedProvince ? 'opacity-50' : ''}>
                <label className="block text-sm font-medium mb-1">District</label>
                <select
                    className="w-full border p-2 rounded bg-white disabled:bg-gray-100"
                    onChange={(e) => handleDistrictChange(Number(e.target.value))}
                    value={selectedDistrict?.code || ''}
                    disabled={!selectedProvince || loadingD}
                >
                    <option value="">{loadingD ? 'Loading...' : 'Select District'}</option>
                    {districts.map(d => (
                        <option key={d.code} value={d.code}>{d.name}</option>
                    ))}
                </select>
            </div>

            {/* Ward */}
            <div className={!selectedDistrict ? 'opacity-50' : ''}>
                <label className="block text-sm font-medium mb-1">Ward / Commune</label>
                <select
                    className="w-full border p-2 rounded bg-white disabled:bg-gray-100"
                    onChange={(e) => handleWardChange(Number(e.target.value))}
                    value={selectedWard?.code || ''}
                    disabled={!selectedDistrict || loadingW}
                >
                    <option value="">{loadingW ? 'Loading...' : 'Select Ward'}</option>
                    {wards.map(w => (
                        <option key={w.code} value={w.code}>{w.name}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}
