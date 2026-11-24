'use client';

import { useId, useState } from 'react';
import { useLocale } from 'next-intl';
import useSWR from 'swr';
import { Input } from '@/components/ui/input';
import { Notice } from '@/components/ui/notice';
import { Button } from '@/components/ui/button';

type Division = { code: number; name: string };
export interface LocationSelectorProps {
  onLocationChange: (location: { province: string; district: string; ward: string; fullString: string }) => void;
  initialProvince?: string;
  initialDistrict?: string;
  initialWard?: string;
}
const load = async (url: string): Promise<Division[]> => {
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error('Address list unavailable');
  const data: unknown = await response.json();
  if (!Array.isArray(data) || !data.length || !data.every(item => typeof item?.code === 'number' && typeof item?.name === 'string')) throw new Error('Invalid address list');
  return data;
};
export default function LocationSelector({ onLocationChange, initialProvince = '', initialDistrict = '', initialWard = '' }: LocationSelectorProps) {
  const id = useId(), en = useLocale() === 'en';
  const [draft, setDraft] = useState<{ province: string; ward: string } | null>(null);
  const [manual, setManual] = useState(false);
  const { data: provinces, error: provinceError, mutate: retryProvinces } = useSWR('/data/addresses/v2/provinces.json', load, { revalidateOnFocus: false });
  const province = draft?.province ?? initialProvince, ward = draft?.ward ?? initialWard;
  const selected = provinces?.find(item => item.name === province);
  const { data: wards, error: wardError, mutate: retryWards } = useSWR(selected ? `/data/addresses/v2/${selected.code}.json` : null, load, { revalidateOnFocus: false });
  const failed = !!(provinceError || wardError);
  // Old saved addresses remain untouched until the customer chooses a new address.
  const legacy = !draft && !!(initialProvince && (initialDistrict || (provinces && !selected)));
  const update = (nextProvince: string, nextWard: string) => {
    setDraft({ province: nextProvince, ward: nextWard });
    onLocationChange({ province: nextProvince, district: '', ward: nextWard, fullString: [nextWard, nextProvince].filter(Boolean).join(', ') });
  };
  const manualFields = manual || failed;
  return <div className="checkout-fields checkout-field-full">
    {legacy && <p className="checkout-field-help checkout-field-full">{en ? 'Saved address' : 'Địa chỉ đã lưu'}: {[initialWard, initialDistrict, initialProvince].filter(Boolean).join(', ')}. {en ? 'Choose the current province and ward to update it.' : 'Chọn tỉnh/thành và phường/xã hiện tại nếu muốn cập nhật.'}</p>}
    {failed && <div className="checkout-field-full"><Notice tone="error">{en ? 'Cannot load the address list. Enter your province and ward below to continue.' : 'Chưa tải được danh sách địa chỉ. Bạn có thể nhập tỉnh/thành và phường/xã bên dưới để tiếp tục.'}</Notice><Button type="button" variant="outline" className="min-h-11 mt-2" onClick={() => { void retryProvinces(); void retryWards(); }}>{en ? 'Try again' : 'Thử tải lại'}</Button></div>}
    <div className="checkout-field">
      <label htmlFor={`${id}-province`}>{en ? 'Province / city' : 'Tỉnh/Thành phố'}</label>
      {manualFields ? <Input id={`${id}-province`} autoComplete="shipping address-level1" required maxLength={200} value={province} onChange={e => update(e.target.value, ward)} /> : <select id={`${id}-province`} autoComplete="shipping address-level1" required disabled={!provinces} value={selected?.code ?? ''} onChange={e => update(provinces?.find(p => p.code === Number(e.target.value))?.name || '', '')}>
        <option value="">{!provinces ? (en ? 'Loading…' : 'Đang tải…') : (en ? 'Select province' : 'Chọn tỉnh/thành')}</option>
        {provinces?.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}
      </select>}
    </div>
    <div className="checkout-field">
      <label htmlFor={`${id}-ward`}>{en ? 'Ward / commune' : 'Phường/Xã'}</label>
      {manualFields ? <Input id={`${id}-ward`} autoComplete="shipping address-level2" required maxLength={200} value={ward} onChange={e => update(province, e.target.value)} /> : <select id={`${id}-ward`} autoComplete="shipping address-level2" required disabled={!wards} value={wards?.find(item => item.name === ward)?.code ?? ''} onChange={e => update(province, wards?.find(w => w.code === Number(e.target.value))?.name || '')}>
        <option value="">{selected && !wards ? (en ? 'Loading…' : 'Đang tải…') : (en ? 'Select ward' : 'Chọn phường/xã')}</option>
        {wards?.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}
      </select>}
    </div>
    {!failed && <button type="button" className="checkout-edit-link checkout-field-full min-h-11 text-left" onClick={() => { setManual(value => !value); }}>{manual ? (en ? 'Choose from list' : 'Chọn từ danh sách') : (en ? 'Enter address manually' : 'Nhập địa chỉ bằng tay')}</button>}
  </div>;
}
