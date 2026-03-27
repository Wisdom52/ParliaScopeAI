import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, MessageSquare, Calendar, Clock } from 'lucide-react';

interface Props {
    sessionTitle: string;
    onBack: () => void;
}

export const LeaderArchivePage: React.FC<Props> = ({ sessionTitle, onBack }) => {
    const { token } = useAuth();
    const [chats, setChats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [locationFilter, setLocationFilter] = useState<'all' | 'represented'>('represented');
    const { user } = useAuth();

    const filteredChats = chats.filter(chat => 
        chat.message.toLowerCase().includes(searchQuery.toLowerCase()) || 
        chat.user_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    useEffect(() => {
        const fetchArchive = async () => {
            try {
                let url = `http://localhost:8000/baraza/live/chat/archive?session_title=${encodeURIComponent(sessionTitle)}`;
                if (locationFilter === 'represented' && user?.county_id) {
                    url += `&county_id=${user.county_id}`;
                    if (user.constituency_id) {
                        url += `&constituency_id=${user.constituency_id}`;
                    }
                }
                const res = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    setChats(await res.json());
                }
            } catch (err) {
                console.error("Failed to fetch archive", err);
            } finally {
                setLoading(false);
            }
        };

        if (token) fetchArchive();
    }, [sessionTitle, token, locationFilter, user]);

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: '#666', cursor: 'pointer', marginBottom: '2rem', fontSize: '1rem' }}>
                <ArrowLeft size={18} />
                Back to Dashboard
            </button>

            <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', padding: '2rem' }}>
                <div style={{ borderBottom: '1px solid #eee', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#dc2626', marginBottom: '0.5rem' }}>
                        <Calendar size={20} />
                        <span style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Session Archive</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#111', margin: 0 }}>{sessionTitle}</h1>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <div className="filter-toggle" style={{ display: 'flex', gap: '4px', background: '#f0f0f0', padding: '4px', borderRadius: '8px' }}>
                                <button 
                                    onClick={() => setLocationFilter('all')}
                                    style={{ 
                                        padding: '4px 12px', fontSize: '0.8rem', borderRadius: '6px', border: 'none',
                                        background: locationFilter === 'all' ? 'white' : 'transparent',
                                        boxShadow: locationFilter === 'all' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer'
                                    }}
                                >National</button>
                                <button 
                                    onClick={() => setLocationFilter('represented')}
                                    style={{ 
                                        padding: '4px 12px', fontSize: '0.8rem', borderRadius: '6px', border: 'none',
                                        background: locationFilter === 'represented' ? 'white' : 'transparent',
                                        boxShadow: locationFilter === 'represented' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer'
                                    }}
                                >Constituents</button>
                            </div>
                            <input 
                                type="text" 
                                placeholder="Search transcript..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #ccc', minWidth: '250px', fontSize: '0.9rem' }}
                            />
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '4rem' }}>Loading archive...</div>
                ) : filteredChats.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem', color: '#666' }}>
                        {searchQuery ? `No matching messages found for "${searchQuery}".` : "No messages found for this session."}
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {filteredChats.map((chat, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: '1rem', padding: '1.25rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <div style={{ minWidth: '40px', height: '40px', background: '#e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <MessageSquare size={18} color="#64748b" />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                        <span style={{ fontWeight: 700, color: '#334155' }}>{chat.user_name}</span>
                                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            <Clock size={12} />
                                            {new Date(chat.created_at).toLocaleTimeString()}
                                        </span>
                                    </div>
                                    <p style={{ margin: 0, color: '#475569', lineHeight: 1.5 }}>{chat.message}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
