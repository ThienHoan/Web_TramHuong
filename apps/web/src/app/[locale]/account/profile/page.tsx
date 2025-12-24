'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { getProfile, updateProfile, setAccessToken } from '@/lib/api-client';
import LocationSelector from '@/components/checkout/LocationSelector';
import { useRouter } from '@/i18n/routing';

export default function ProfilePage() {
    const { session, refreshProfile } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

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
        getProfile()
            .then(data => {
                if (data) {
                    setFormData({
                        full_name: data.full_name || '',
                        phone_number: data.phone_number || '',
                        avatar_url: data.avatar_url || '',
                        province: data.province || '',
                        district: data.district || '',
                        ward: data.ward || '',
                        street_address: data.street_address || ''
                    });
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

    const handleLocationChange = (loc: { province: string; district: string; ward: string }) => {
        setFormData(prev => ({
            ...prev,
            province: loc.province,
            district: loc.district,
            ward: loc.ward
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await updateProfile(formData);
            await refreshProfile(); // Update header immediately
            alert('Profile updated successfully!');
            router.refresh();
        } catch (error: any) {
            alert(error.message || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading profile...</div>;

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-8">My Profile</h1>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left Column: Avatar & Basic Info */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4 text-center">
                        <div className="w-32 h-32 mx-auto rounded-full overflow-hidden bg-gray-100 mb-4 border">
                            {formData.avatar_url ? (
                                <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300">?</div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1 text-left">Avatar URL</label>
                            <input
                                type="url"
                                name="avatar_url"
                                value={formData.avatar_url}
                                onChange={handleChange}
                                placeholder="https://..."
                                className="w-full border p-2 rounded text-sm"
                            />
                            <p className="text-xs text-gray-500 mt-1 text-left">Paste an image URL to update your avatar.</p>
                        </div>
                    </div>
                </div>

                {/* Right Column: Details & Address */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                        <h2 className="text-xl font-semibold mb-4 border-b pb-2">Personal Information</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Full Name</label>
                                <input
                                    type="text"
                                    name="full_name"
                                    value={formData.full_name}
                                    onChange={handleChange}
                                    className="w-full border p-2 rounded"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Phone Number</label>
                                <input
                                    type="tel"
                                    name="phone_number"
                                    value={formData.phone_number}
                                    onChange={handleChange}
                                    className="w-full border p-2 rounded"
                                    placeholder="0912..."
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                        <h2 className="text-xl font-semibold mb-4 border-b pb-2">Shipping Address</h2>
                        <div className="space-y-4">
                            <LocationSelector
                                key={`${formData.province}-${formData.district}-${formData.ward}`} // Force re-render when data loaded
                                onLocationChange={handleLocationChange}
                                initialProvince={formData.province}
                                initialDistrict={formData.district}
                                initialWard={formData.ward}
                            />

                            <div>
                                <label className="block text-sm font-medium mb-1">Street Address</label>
                                <input
                                    type="text"
                                    name="street_address"
                                    value={formData.street_address}
                                    onChange={handleChange}
                                    className="w-full border p-2 rounded"
                                    placeholder="123 Nguyen Hue..."
                                />
                            </div>
                        </div>
                        <div className="mt-4 bg-yellow-50 p-3 rounded text-sm text-yellow-800">
                            Current Saved Location: {formData.ward}, {formData.district}, {formData.province}
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={saving}
                            className="bg-black text-white px-8 py-3 rounded hover:bg-gray-800 disabled:opacity-50 transition-all font-medium"
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
