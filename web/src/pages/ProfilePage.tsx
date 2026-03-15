import React, { useState, useEffect } from 'react';
import { User, Mail, MapPin, CreditCard, MessageCircle, LogOut, Shield, Map, Trophy, Award, Star, TrendingUp, Edit2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { AlertSettings } from '../components/AlertSettings';

interface Badge {
    id: number;
    name: string;
    description: string;
    icon_url?: string;
}

interface Constituency {
    id: number;
    name: string;
    county_id: number;
}

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
    const [constituencies, setConstituencies] = useState<Constituency[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [gamification, setGamification] = useState({ points: 0, badges: [] as Badge[] });
    const [leaderStats, setLeaderStats] = useState<any>(null);

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

    const fetchCounties = async () => {
        try {
            const res = await fetch('http://localhost:8000/location/counties');
            const data = await res.json();
            setCounties(data);
        } catch (err) { console.error("Error fetching counties:", err); }
    };

    const fetchConstituencies = async (countyId: number) => {
        try {
            const res = await fetch(`http://localhost:8000/location/constituencies?county_id=${countyId}`);
            const data = await res.json();
            setConstituencies(data);
        } catch (err) { console.error("Error fetching constituencies:", err); }
    };

    const fetchGamification = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const res = await fetch('http://localhost:8000/baraza/user/gamification', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) return;
            const data = await res.json();
            setGamification({
                points: data.prosperity_points ?? 0,
                badges: Array.isArray(data.badges) ? data.badges : []
            });
        } catch (err) {
            console.error("Error fetching gamification:", err);
        }
    };

    useEffect(() => {
        fetchCounties();
        if (user?.role === 'LEADER' && user.speaker_id) {
            fetchLeaderStats();
        } else {
            fetchGamification();
        }
    }, [user]);

    const fetchLeaderStats = async () => {
        try {
            const res = await fetch(`http://localhost:8000/representatives/${user?.speaker_id}`);
            if (res.ok) {
                const data = await res.json();
                setLeaderStats(data);
            }
        } catch (err) {
            console.error("Error fetching leader stats:", err);
        }
    };

    useEffect(() => {
        if (formData.county_id) {
            fetchConstituencies(formData.county_id);
        } else {
            setConstituencies([]);
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
                        {user.role !== 'LEADER' && !user.is_admin && (
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
                        )}
                    </div>
                </div>

                {/* Location Information */}
                {!user.is_admin && (
                <div className="card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.5rem', boxShadow: 'var(--shadow)' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem', fontSize: '1.1rem', color: 'var(--primary)' }}>
                        <MapPin size={20} /> {user.role === 'LEADER' ? 'Representation Location' : 'Registered Location'}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', color: '#666', marginBottom: '4px' }}>County</label>
                            {isEditing && user.role !== 'LEADER' ? (
                                <select
                                    value={formData.county_id}
                                    onChange={(e) => setFormData({ ...formData, county_id: parseInt(e.target.value), constituency_id: 0 })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'white' }}
                                >
                                    <option value={0}>Select County</option>
                                    {counties.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            ) : (
                                <p style={{ fontWeight: 600 }}>
                                    {user.role === 'LEADER' ? (leaderStats?.county_name || leaderStats?.county_id || 'National') : (user.county_name || `County ID: ${user.county_id}`)}
                                </p>
                            )}
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', color: '#666', marginBottom: '4px' }}>{user.role === 'LEADER' ? 'Constituency / Sub-County' : 'Constituency'}</label>
                            {isEditing && user.role !== 'LEADER' ? (
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
                                <p style={{ fontWeight: 600 }}>
                                    {user.role === 'LEADER' ? (leaderStats?.constituency_name || leaderStats?.constituency_id || 'National') : (user.constituency_name || `Constituency ID: ${user.constituency_id}`)}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
                )}

                {/* Alert Settings Module (Citizens only) */}
                {user.role !== 'LEADER' && !user.is_admin && <AlertSettings />}

                {/* Civic Passport (Citizens only) */}
                {user.role !== 'LEADER' && !user.is_admin && (
                    <div className="card" style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #333 100%)', border: 'none', borderRadius: 'var(--radius)', padding: '1.5rem', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', color: 'white' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem', fontSize: '1.1rem', color: '#ffd43b' }}>
                            <Trophy size={20} /> Civic Passport
                        </h3>
                        <div style={{ marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>Prosperity Points</label>
                                    <span style={{ fontSize: '2rem', fontWeight: 800 }}>{gamification.points}</span>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ffd43b', background: 'rgba(255,212,59,0.1)', padding: '4px 10px', borderRadius: '20px', border: '1px solid rgba(255,212,59,0.2)' }}>
                                        {gamification.points < 50 ? 'NOVICE' : gamification.points < 200 ? 'PATRIOT' : 'CHAMPION'}
                                    </span>
                                </div>
                            </div>
                            <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${Math.min((gamification.points / 200) * 100, 100)}%`, background: 'linear-gradient(90deg, #ffd43b, #fab005)', borderRadius: '4px' }} />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '1rem' }}>Earned Badges</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                                {gamification.badges.length > 0 ? gamification.badges.map(badge => (
                                    <div key={badge.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '14px', width: '80px', textAlign: 'center' }} title={badge.description}>
                                        <span style={{ fontSize: '1.8rem' }}>{badge.icon_url || '🏅'}</span>
                                        <span style={{ fontSize: '0.65rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{badge.name}</span>
                                    </div>
                                )) : (
                                    <div style={{ padding: '20px', textAlign: 'center', width: '100%', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '14px' }}>
                                        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>No badges yet. Start a quiz in Baraza!</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

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
