import React, { useState, useEffect } from 'react';
import { User, Mail, MapPin, CreditCard, Edit2, X, LogOut, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { AlertSettings } from '../components/AlertSettings';

interface ProfilePageProps {
    onLogout?: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onLogout }) => {
    const { user, token, logout } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<any>({
        full_name: '',
        id_number: '',
        county_id: 0,
        constituency_id: 0,
        whatsapp_number: '',
        push_token: ''
    });
    const [counties, setCounties] = useState<any[]>([]);
    const [constituencies, setConstituencies] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (user) {
            setFormData({
                full_name: user.full_name || '',
                id_number: user.id_number || '',
                county_id: user.county_id || 0,
                constituency_id: user.constituency_id || 0,
                whatsapp_number: user.whatsapp_number || '',
                push_token: user.push_token || ''
            });
        }
    }, [user]);

    useEffect(() => {
        fetch('http://localhost:8000/location/counties')
            .then(res => res.json())
            .then(data => setCounties(data))
            .catch(err => console.error("Failed to fetch counties", err));
    }, []);

    useEffect(() => {
        if (formData.county_id) {
            fetch(`http://localhost:8000/location/constituencies?county_id=${formData.county_id}`)
                .then(res => res.json())
                .then(data => setConstituencies(data))
                .catch(err => console.error("Failed to fetch constituencies", err));
        }
    }, [formData.county_id]);

    const handleSave = async () => {
        setLoading(true);
        setMessage('');
        try {
            const response = await fetch('http://localhost:8000/auth/profile', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
            if (response.ok) {
                setMessage('Profile updated successfully!');
                setIsEditing(false);
                // The AuthContext will automatically refetch the profile via its useEffect
            } else {
                setMessage('Failed to update profile.');
            }
        } catch (error) {
            setMessage('Error updating profile.');
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="profile-container" style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem' }}>
            <div className="profile-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>My Profile</h1>
                {!isEditing ? (
                    <button
                        onClick={() => setIsEditing(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: 600 }}
                    >
                        <Edit2 size={16} /> Edit Profile
                    </button>
                ) : (
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={() => setIsEditing(false)}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer' }}
                        >
                            <X size={16} /> Cancel
                        </button>
                        <Button label="Save Changes" onPress={handleSave} loading={loading} />
                    </div>
                )}
            </div>

            {message && (
                <div style={{ padding: '12px', borderRadius: 'var(--radius)', backgroundColor: message.includes('success') ? '#e6fcf5' : '#fff5f5', color: message.includes('success') ? '#0ca678' : '#fa5252', marginBottom: '1.5rem', textAlign: 'center', fontWeight: 600 }}>
                    {message}
                </div>
            )}

            <div className="profile-content" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {/* Account Details */}
                <div className="card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.5rem', boxShadow: 'var(--shadow)' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem', fontSize: '1.1rem', color: 'var(--primary)' }}>
                        <User size={20} /> Account Details
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', color: '#666', marginBottom: '4px' }}>Full Name</label>
                            {isEditing ? (
                                <Input value={formData.full_name} onChangeText={(text) => setFormData({ ...formData, full_name: text })} />
                            ) : (
                                <p style={{ fontWeight: 600, fontSize: '1.05rem' }}>{user.full_name || 'Not provided'}</p>
                            )}
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', color: '#666', marginBottom: '4px' }}>Email Address</label>
                            <p style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Mail size={14} color="#666" /> {user.email}
                            </p>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', color: '#666', marginBottom: '4px' }}>ID / Passport </label>
                            {isEditing ? (
                                <Input value={formData.id_number} onChangeText={(text) => setFormData({ ...formData, id_number: text })} />
                            ) : (
                                <p style={{ fontWeight: 600 }}>
                                    <CreditCard size={14} color="#666" style={{ marginRight: '8px' }} />
                                    {user.id_number || 'Not provided'}
                                </p>
                            )}
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', color: '#666', marginBottom: '4px' }}>WhatsApp Number for Alerts</label>
                            {isEditing ? (
                                <Input
                                    value={formData.whatsapp_number}
                                    onChangeText={(text) => setFormData({ ...formData, whatsapp_number: text })}
                                    placeholder="+254700000000"
                                />
                            ) : (
                                <p style={{ fontWeight: 600 }}>
                                    <MessageCircle size={14} color="#666" style={{ marginRight: '8px' }} />
                                    {user.whatsapp_number || 'Not provided'}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Location Information */}
                <div className="card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.5rem', boxShadow: 'var(--shadow)' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem', fontSize: '1.1rem', color: 'var(--primary)' }}>
                        <MapPin size={20} /> Registered Location
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', color: '#666', marginBottom: '4px' }}>County</label>
                            {isEditing ? (
                                <select
                                    value={formData.county_id}
                                    onChange={(e) => setFormData({ ...formData, county_id: parseInt(e.target.value), constituency_id: 0 })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'white' }}
                                >
                                    <option value={0}>Select County</option>
                                    {counties.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            ) : (
                                <p style={{ fontWeight: 600 }}>{user.county_name || `County ID: ${user.county_id}`}</p>
                            )}
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', color: '#666', marginBottom: '4px' }}>Constituency</label>
                            {isEditing ? (
                                <select
                                    value={formData.constituency_id}
                                    onChange={(e) => setFormData({ ...formData, constituency_id: parseInt(e.target.value) })}
                                    disabled={!formData.county_id}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'white' }}
                                >
                                    <option value={0}>Select Constituency</option>
                                    {constituencies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            ) : (
                                <p style={{ fontWeight: 600 }}>{user.constituency_name || `Constituency ID: ${user.constituency_id}`}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Alert Settings Module */}
                <AlertSettings />

            </div>

            <div style={{ marginTop: '3rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                <button
                    onClick={onLogout || logout}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 24px', background: '#fff5f5', color: '#fa5252', border: '1px solid #ffe3e3', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: 700, transition: 'all 0.2s ease' }}
                >
                    <LogOut size={20} /> Log Out of ParliaScope
                </button>
            </div>
        </div>
    );
};
