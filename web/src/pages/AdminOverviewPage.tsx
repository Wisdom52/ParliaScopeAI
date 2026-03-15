import React, { useState, useEffect } from 'react';
import { Users, FileText, MessageSquare, Activity, CheckCircle, PauseCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './AdminPage.css';

interface DashboardStats {
    users: { total: number; citizens: number; leaders: number; admins: number; active: number; paused: number; };
    content: { bills: number; hansard_sessions: number; };
    baraza: { meetings: number; polls: number; forum_posts: number; };
    live_stream: { chats: number; reactions: number; };
}

export const AdminOverviewPage: React.FC = () => {
    const { token } = useAuth();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch('http://localhost:8000/admin/dashboard/stats', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    setStats(await res.json());
                }
            } catch (err) {
                console.error("Failed to fetch dashboard stats", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [token]);

    return (
        <div className="admin-container">


            <div className="admin-content" style={{ padding: '0 2rem 2rem 2rem' }}>
                {loading ? (
                    <div className="admin-loading">Assembling metrics...</div>
                ) : stats ? (
                    <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                        
                        {/* Users Card */}
                        <div className="stat-card" style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', color: 'var(--primary)', fontSize: '1.1rem' }}>
                                <Users size={20} /> User Analytics
                            </h3>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <span style={{ color: '#666', fontSize: '0.9rem' }}>Total Registered</span>
                                <span style={{ fontSize: '1.8rem', fontWeight: 800 }}>{stats.users.total}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CheckCircle size={14} color="#0ca678"/> Active Citizens</span>
                                    <strong>{stats.users.active}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><PauseCircle size={14} color="#fa5252"/> Paused Citizens</span>
                                    <strong>{stats.users.paused}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><ShieldCheck size={14} color="#007AFF"/> Verified Leaders</span>
                                    <strong>{stats.users.leaders}</strong>
                                </div>
                                 <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><ShieldCheck size={14} color="#111"/> Administrators</span>
                                    <strong>{stats.users.admins}</strong>
                                </div>
                            </div>
                        </div>

                        {/* Content Vault Card */}
                        <div className="stat-card" style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', color: 'var(--primary)', fontSize: '1.1rem' }}>
                                <FileText size={20} /> Document Vault
                            </h3>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <span style={{ color: '#666', fontSize: '0.9rem' }}>Total Documents</span>
                                <span style={{ fontSize: '1.8rem', fontWeight: 800 }}>{stats.content.bills + stats.content.hansard_sessions}</span>
                            </div>
                             <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Legislative Bills</span>
                                    <strong>{stats.content.bills}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Hansard Sessions</span>
                                    <strong>{stats.content.hansard_sessions}</strong>
                                </div>
                            </div>
                        </div>

                         {/* Baraza Activity Card */}
                         <div className="stat-card" style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', color: 'var(--primary)', fontSize: '1.1rem' }}>
                                <MessageSquare size={20} /> Civic Engagement
                            </h3>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <span style={{ color: '#666', fontSize: '0.9rem' }}>Baraza Items</span>
                                <span style={{ fontSize: '1.8rem', fontWeight: 800 }}>{stats.baraza.meetings + stats.baraza.polls + stats.baraza.forum_posts}</span>
                            </div>
                             <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Scheduled Meetings</span>
                                    <strong>{stats.baraza.meetings}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Active Polls</span>
                                    <strong>{stats.baraza.polls}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Forum Discussions</span>
                                    <strong>{stats.baraza.forum_posts}</strong>
                                </div>
                            </div>
                        </div>

                         {/* Live Stream Monitoring Card */}
                         <div className="stat-card" style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #333 100%)', color: 'white', padding: '1.5rem', borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', color: '#ff4d4f', fontSize: '1.1rem' }}>
                                <Activity size={20} /> Live TV Monitoring
                            </h3>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>Total Interactions</span>
                                <span style={{ fontSize: '1.8rem', fontWeight: 800 }}>{stats.live_stream.chats + stats.live_stream.reactions}</span>
                            </div>
                             <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>Live Chat Messages</span>
                                    <strong style={{ color: 'white' }}>{stats.live_stream.chats}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>Audience Pulse Reactions</span>
                                    <strong style={{ color: 'white' }}>{stats.live_stream.reactions}</strong>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '1.5rem', padding: '10px', background: 'rgba(255,77,79,0.1)', borderRadius: '8px' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff4d4f', boxShadow: '0 0 8px #ff4d4f' }}></div>
                                <span style={{ fontSize: '0.8rem', color: '#ff4d4f', fontWeight: 600, letterSpacing: 0.5 }}>STREAM ACTIVE</span>
                            </div>
                        </div>

                    </div>
                ) : (
                    <div className="admin-loading" style={{ color: 'var(--error)' }}>Failed to load dashboard metrics.</div>
                )}
            </div>
        </div>
    );
};
