import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Star, ShieldCheck, Loader2 } from 'lucide-react';
import './LeaderDashboard.css';

export const LeaderDashboard: React.FC<{ onViewArchive?: (title: string) => void }> = ({ onViewArchive }) => {
    const { user, token } = useAuth();
    const [stats, setStats] = useState<any>(null);
    const [reviews, setReviews] = useState<any[]>([]);
    const [liveChats, setLiveChats] = useState<any[]>([]);
    const [stanceData, setStanceData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [locationFilter, setLocationFilter] = useState<'all' | 'represented'>('represented');
    const [feedbackFilter, setFeedbackFilter] = useState<'all' | 'represented'>('represented');

    const [activeTab, setActiveTab] = useState<'overview' | 'stances' | 'feedback'>('overview');
    const [sessions, setSessions] = useState<string[]>([]);
    const [selectedSessionOption, setSelectedSessionOption] = useState<string>('live');

    const [responses, setResponses] = useState<Record<string, string>>({});
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');

    const handleSubmitReply = async (idStr: string) => {
        if (!replyText.trim()) return;
        
        try {
            const isStance = idStr.startsWith('stance_');
            const actualId = parseInt(idStr.split('_')[1], 10);
            
            if (isStance) {
                await fetch(`http://localhost:8000/baraza/live/chat/${actualId}/respond`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ response: replyText })
                });
            } else if (user?.speaker_id) {
                await fetch(`http://localhost:8000/representatives/${user.speaker_id}/reviews/${actualId}/respond`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ response: replyText })
                });
            }

            setResponses(prev => ({ ...prev, [idStr]: replyText }));
            setReplyingTo(null);
            setReplyText('');
        } catch (e) {
            alert('Failed to save response to database.');
        }
    };



    useEffect(() => {
        if (user?.role === 'LEADER' && token) {
            fetchStats();
            fetchSessions();
        } else {
            setLoading(false);
        }
    }, [user, token]);

    const fetchSessions = async () => {
        try {
            const res = await fetch('http://localhost:8000/baraza/live/chat/sessions', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setSessions(await res.json());
            }
        } catch (e) {
            console.error("Failed to fetch sessions", e);
        }
    };

    useEffect(() => {
        if (user?.role !== 'LEADER') return;

        const loadChats = async () => {
            try {
                let url = `http://localhost:8000/baraza/live/chat/analytics`;
                if (locationFilter === 'represented' && stats?.county_id) {
                    url += `?county_id=${stats.county_id}`;
                    if (stats.constituency_id) {
                        url += `&constituency_id=${stats.constituency_id}`;
                    }
                }
                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    setLiveChats(data || []);
                }
            } catch (e) {
                console.error("Failed to fetch live chats", e);
            }
        };

        loadChats();
        const interval = setInterval(loadChats, 5000);
        return () => clearInterval(interval);
    }, [user, locationFilter, stats?.county_id, stats?.constituency_id]);

    useEffect(() => {
        if (!user?.speaker_id) return;
        const loadFeedback = async () => {
            let url = `http://localhost:8000/representatives/${user.speaker_id}/reviews`;
            if (feedbackFilter === 'represented' && stats?.county_id) {
                url += `?county_id=${stats.county_id}`;
                if (stats?.constituency_id) {
                    url += `&constituency_id=${stats.constituency_id}`;
                }
            }
            try {
                const res = await fetch(url);
                if (res.ok) {
                    setReviews(await res.json());
                }
            } catch (e) {
                console.error(e);
            }
        };
        loadFeedback();
    }, [user?.speaker_id, feedbackFilter, stats?.county_id, stats?.constituency_id]);

    const fetchStats = async () => {
        try {
            if (user?.speaker_id) {
                const revRes = await fetch(`http://localhost:8000/representatives/${user.speaker_id}`);
                if (revRes.ok) {
                    const data = await revRes.json();
                    setReviews(data.reviews || []);
                    setStats({
                        ...data,
                        rating: data.average_rating
                    });
                }
                
                const stanceRes = await fetch(`http://localhost:8000/representatives/${user.speaker_id}/stances`);
                if (stanceRes.ok) {
                    const stanceData = await stanceRes.json();
                    setStanceData(stanceData);
                }
            }
        } catch (e) {
            console.error("Failed to fetch leader stats", e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <Loader2 className="animate-spin" size={40} color="var(--primary)" />
                <p style={{ marginTop: '1rem', color: '#666' }}>Authenticating Official Credentials...</p>
            </div>
        );
    }

    if (!user || user.role !== 'LEADER') {
        return (
            <div className="access-denied" style={{ padding: '4rem', textAlign: 'center' }}>
                <ShieldCheck size={48} color="#ef4444" style={{ marginBottom: '1.5rem' }} />
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Official Verification Required</h2>
                <p style={{ color: '#666', marginTop: '0.5rem' }}>This portal is reserved for verified parliamentary leaders. Please complete the verification flow in your profile.</p>
            </div>
        );
    }

    return (
        <div className="leader-dashboard">
            <header className="leader-header">
                <div className="leader-profile-summary">
                    <div className="shield-icon">
                        <ShieldCheck size={36} color="white" />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <h1>Representative Command Centre</h1>
                            <div className={`status-pill-feedback ${!user.is_verified ? 'pending' : user.is_active ? 'verified' : 'suspended'}`}>
                                {!user.is_verified ? 'Pending Manual Review' : user.is_active ? 'Official Identity Verified' : 'Account Suspended'}
                            </div>
                        </div>
                        <div className="leader-meta">
                            <strong>{stats?.name || user.full_name || 'Processing Official Profile...'}</strong>
                            <span className="dot"></span>
                            <span>{stats?.role || 'Parliamentary Representative'}</span>
                            <span className="dot"></span>
                            <span className="location-info">{stats?.constituency_name || stats?.county_name || 'National'}</span>
                            <span className="dot"></span>
                            <span className="party-badge">{stats?.party || 'Independent'}</span>
                        </div>
                    </div>
                </div>
            </header>

            <div className="leader-tabs">
                <button 
                  className={`leader-tab ${activeTab === 'overview' ? 'active' : ''}`}
                  onClick={() => setActiveTab('overview')}
                >Overview</button>
                <button 
                  className={`leader-tab ${activeTab === 'stances' ? 'active' : ''}`}
                  onClick={() => setActiveTab('stances')}
                >Live Stances</button>
                <button 
                  className={`leader-tab ${activeTab === 'feedback' ? 'active' : ''}`}
                  onClick={() => setActiveTab('feedback')}
                >Feedback</button>
            </div>

            <div className="leader-content-area">
                {activeTab === 'overview' && (
                    <div className="overview-tab-content">
                        <div className="leader-stats-grid">
                            <div className="leader-stat-card">
                                <div className="stat-header">
                                    <Star className="stat-icon yellow" />
                                    <span>Public Approval</span>
                                </div>
                                <div className="stat-main">
                                    <span className="stat-value">{stats?.rating?.toFixed(1) || '0.0'}</span>
                                    <span className="stat-total">/ 5.0</span>
                                </div>
                                <div className="stat-footer">Based on constituent reviews</div>
                            </div>

                            <div className="leader-stat-card">
                                <div className="stat-header">
                                    <ShieldCheck className="stat-icon blue" />
                                    <span>Sitting Archives</span>
                                </div>
                                <div style={{ marginTop: '1rem', display: 'flex', gap: '8px' }}>
                                    <select 
                                        style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.85rem' }}
                                        value={selectedSessionOption}
                                        onChange={(e) => setSelectedSessionOption(e.target.value)}
                                    >
                                        <option value="live">Current Live Session (Last 12h)</option>
                                        {sessions.length > 0 && <option disabled>--- Archived Sittings ---</option>}
                                        {sessions.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                    <button 
                                        onClick={() => {
                                            if (selectedSessionOption === 'live') {
                                                setActiveTab('stances');
                                            } else if (onViewArchive) {
                                                onViewArchive(selectedSessionOption);
                                            }
                                        }}
                                        style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', padding: '0 16px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                                    >
                                        View
                                    </button>
                                </div>
                                <div className="stat-footer">Review historical constituent stances</div>
                            </div>
                        </div>

                        <div className="performance-analytics-card">
                            <div className="card-header">
                                <h2>Performance Analytics</h2>
                            </div>
                            <div className="analytics-metrics-row">
                                <div className="metric-item">
                                    <span className="metric-label">Consistency</span>
                                    <span className="metric-value">{stanceData ? `${stanceData.overall_consistency}%` : '...'}</span>
                                </div>
                                <div className="metric-divider"></div>
                                <div className="metric-item">
                                    <span className="metric-label">Sittings</span>
                                    <span className="metric-value">{stats?.sittings_attended || '0'}</span>
                                </div>
                                <div className="metric-divider"></div>
                                <div className="metric-item">
                                    <span className="metric-label">Bills</span>
                                    <span className="metric-value">{stats?.bills_sponsored || '0'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'stances' && (
                    <section className="live-stances-tab">
                        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h2>Live Stances</h2>
                                <p className="card-subtitle">Real-time statements from ongoing Baraza debates.</p>
                            </div>
                            <div className="filter-toggle" style={{ display: 'flex', gap: '4px', background: '#f0f0f0', padding: '4px', borderRadius: '8px' }}>
                                <button 
                                    onClick={() => setLocationFilter('all')}
                                    style={{ 
                                        padding: '4px 12px', 
                                        fontSize: '0.8rem', 
                                        borderRadius: '6px', 
                                        border: 'none',
                                        background: locationFilter === 'all' ? 'white' : 'transparent',
                                        boxShadow: locationFilter === 'all' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                                        cursor: 'pointer'
                                    }}
                                >National</button>
                                <button 
                                    onClick={() => setLocationFilter('represented')}
                                    style={{ 
                                        padding: '4px 12px', 
                                        fontSize: '0.8rem', 
                                        borderRadius: '6px', 
                                        border: 'none',
                                        background: locationFilter === 'represented' ? 'white' : 'transparent',
                                        boxShadow: locationFilter === 'represented' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                                        cursor: 'pointer'
                                    }}
                                >Constituents</button>
                            </div>
                        </div>
                        
                        <div className="chats-scroller" style={{ maxHeight: '600px', overflowY: 'auto', padding: '1rem', background: '#f8f9fa', borderRadius: '12px', marginTop: '1rem' }}>
                            {liveChats.length === 0 ? (
                                <div className="empty-state">No stances recorded in this area yet.</div>
                            ) : (
                                liveChats.map((c: any) => (
                                    <div key={c.id} className="chat-msg-row" style={{ marginBottom: '0.8rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <strong style={{ fontSize: '0.9rem', color: 'var(--primary)' }}>{c.user_name}</strong>
                                            <span style={{ fontSize: '0.75rem', color: '#999' }}>{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#333' }}>{c.message}</p>
                                        
                                        {/* Response UI for Stances */}
                                        {(responses[`stance_${c.id}`] || (c as any).official_response) ? (
                                            <div style={{ marginTop: '0.5rem', background: '#eef2ff', padding: '0.5rem', borderRadius: '4px', borderLeft: '3px solid var(--primary)', fontSize: '0.85rem' }}>
                                                <strong style={{ color: 'var(--primary)' }}>Official Response:</strong> <span style={{ color: '#333' }}>{responses[`stance_${c.id}`] || (c as any).official_response}</span>
                                            </div>
                                        ) : replyingTo === `stance_${c.id}` ? (
                                            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '8px' }}>
                                                <input 
                                                    type="text" 
                                                    value={replyText} 
                                                    onChange={e => setReplyText(e.target.value)} 
                                                    placeholder="Type official reply..." 
                                                    style={{ flex: 1, padding: '6px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.8rem' }}
                                                    autoFocus
                                                />
                                                <button onClick={() => handleSubmitReply(`stance_${c.id}`)} style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '4px', padding: '0 12px', cursor: 'pointer', fontSize: '0.8rem' }}>Send</button>
                                                <button onClick={() => setReplyingTo(null)} style={{ background: 'transparent', color: '#666', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>Cancel</button>
                                            </div>
                                        ) : (
                                            <div style={{ marginTop: '0.25rem', textAlign: 'right' }}>
                                                <button onClick={() => { setReplyingTo(`stance_${c.id}`); setReplyText(''); }} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>Respond Officially</button>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                )}

                {activeTab === 'feedback' && (
                    <section className="feedback-tab">
                        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h2>Feedback</h2>
                                <p className="card-subtitle">Direct reviews and thoughts from your constituents.</p>
                            </div>
                            <div className="filter-toggle" style={{ display: 'flex', gap: '4px', background: '#f0f0f0', padding: '4px', borderRadius: '8px' }}>
                                <button 
                                    onClick={() => setFeedbackFilter('all')}
                                    style={{ 
                                        padding: '4px 12px', fontSize: '0.8rem', borderRadius: '6px', border: 'none',
                                        background: feedbackFilter === 'all' ? 'white' : 'transparent',
                                        boxShadow: feedbackFilter === 'all' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer'
                                    }}
                                >National</button>
                                <button 
                                    onClick={() => setFeedbackFilter('represented')}
                                    style={{ 
                                        padding: '4px 12px', fontSize: '0.8rem', borderRadius: '6px', border: 'none',
                                        background: feedbackFilter === 'represented' ? 'white' : 'transparent',
                                        boxShadow: feedbackFilter === 'represented' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer'
                                    }}
                                >Constituents</button>
                            </div>
                        </div>
                        <div className="reviews-scroller" style={{ marginTop: '1.5rem' }}>
                            {reviews.length === 0 ? (
                                <div className="empty-state">No public reviews available for this profile yet.</div>
                            ) : (
                                reviews.map((r: any) => (
                                    <div key={r.id} className="small-review-card">
                                        <div className="rev-top">
                                            <div className="rev-stars">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star key={i} size={14} fill={i < r.rating ? "gold" : "none"} stroke="gold" />
                                                ))}
                                            </div>
                                            <span className="rev-date">{new Date(r.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <p className="rev-text">"{r.comment}"</p>
                                        <div className="rev-author">- {r.user_name}</div>
                                        
                                        {/* Response UI for Feedback */}
                                        {(responses[`review_${r.id}`] || (r as any).official_response) ? (
                                            <div style={{ marginTop: '0.75rem', background: '#eef2ff', padding: '0.5rem', borderRadius: '4px', borderLeft: '3px solid var(--primary)', fontSize: '0.8rem' }}>
                                                <strong style={{ color: 'var(--primary)' }}>Official Response:</strong> <span style={{ color: '#333' }}>{responses[`review_${r.id}`] || (r as any).official_response}</span>
                                            </div>
                                        ) : replyingTo === `review_${r.id}` ? (
                                            <div style={{ marginTop: '0.75rem', display: 'flex', gap: '8px' }}>
                                                <input 
                                                    type="text" 
                                                    value={replyText} 
                                                    onChange={e => setReplyText(e.target.value)} 
                                                    placeholder="Type official reply..." 
                                                    style={{ flex: 1, padding: '6px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.8rem' }}
                                                    autoFocus
                                                />
                                                <button onClick={() => handleSubmitReply(`review_${r.id}`)} style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '4px', padding: '0 12px', cursor: 'pointer', fontSize: '0.8rem' }}>Send</button>
                                                <button onClick={() => setReplyingTo(null)} style={{ background: 'transparent', color: '#666', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>Cancel</button>
                                            </div>
                                        ) : (
                                            <div style={{ marginTop: '0.5rem', textAlign: 'right' }}>
                                                <button onClick={() => { setReplyingTo(`review_${r.id}`); setReplyText(''); }} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>Respond Officially</button>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
};
