import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../components/ui/Button';
import { Loader2, FileText, Activity, Send, MessageSquare, Search, X, Shield, Headphones } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AudioPlayer } from '../components/ui/AudioPlayer';

interface Hansard {
    id: number;
    title: string;
    pdf_url: string;
    ai_summary: string | null;
    date: string | null;
    created_at: string;
}

interface Bill {
    id: number;
    title: string;
    summary: string;
    date: string | null;
    document_url: string;
    impacts: any[];
}

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    sources?: { speaker: string; preview: string; id: number }[];
}

interface FactShieldSource {
    id: number;
    title: string;
    type: string;
    preview: string;
}

interface FactShieldResult {
    status: string;
    analysis: string;
    confidence_score?: number;
    sources: FactShieldSource[];
}

const MemoizedChatInput = React.memo(({ onSend, disabled }: { onSend: (msg: string) => void; disabled: boolean }) => {
    const [input, setInput] = useState('');
    const submit = () => {
        if (input.trim() && !disabled) {
            onSend(input);
            setInput('');
        }
    };
    return (
        <div style={{ padding: '1.5rem', borderTop: '1px solid #f0f0f0' }}>
            <div style={{ display: 'flex', gap: '0.75rem', background: '#f8fafc', padding: '0.5rem', borderRadius: '1.5rem', border: '1px solid #e2e8f0' }}>
                <input
                    type="text"
                    placeholder="Ask about speakers, topics, or full questions..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submit()}
                    style={{ flex: 1, background: 'transparent', border: 'none', padding: '0.5rem 1rem', outline: 'none', fontSize: '0.95rem' }}
                />
                <button
                    onClick={submit}
                    disabled={disabled || !input.trim()}
                    style={{
                        background: 'var(--primary)',
                        border: 'none',
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        cursor: 'pointer',
                        transition: 'opacity 0.2s'
                    }}
                >
                    <Send size={18} />
                </button>
            </div>
        </div>
    );
});

const MemoizedFactShieldInput = React.memo(({ onVerify, loading }: { onVerify: (url: string, claim: string) => void; loading: boolean }) => {
    const [url, setUrl] = useState('');
    const [claim, setClaim] = useState('');
    return (
        <div style={{ display: 'grid', gap: '1.5rem', maxWidth: '800px' }}>
            <div className="input-field">
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', marginBottom: '0.5rem', color: '#334155' }}>External Link (YouTube, Article, etc.)</label>
                <input
                    type="text"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none' }}
                />
            </div>
            <div className="input-field">
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', marginBottom: '0.5rem', color: '#334155' }}>Specific Claim or Context (Optional)</label>
                <textarea
                    placeholder="e.g. The MP for Lang'ata claimed that the new bill would reduce taxes by 20%..."
                    value={claim}
                    onChange={(e) => setClaim(e.target.value)}
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', minHeight: '100px', resize: 'vertical' }}
                />
            </div>
            <Button
                label={loading ? "Verifying..." : "Verify Claim"}
                onPress={() => onVerify(url, claim)}
                disabled={loading || (!claim.trim() && !url.trim())}
            />
        </div>
    );
});

interface SearchPageProps {
    onSwitchToProfile?: () => void;
}

export const SearchPage: React.FC<SearchPageProps> = ({ onSwitchToProfile }) => {
    const { user, token } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [documents, setDocuments] = useState<Hansard[]>([]);
    const [docsLoading, setDocsLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [useAiParsing, setUseAiParsing] = useState(false);
    const [selectedHansard, setSelectedHansard] = useState<Hansard | null>(null);
    const [activeCategory, setActiveCategory] = useState<'parliament' | 'bills' | 'shield'>('parliament');

    // Audio-First State
    const [audioData, setAudioData] = useState<{ en: string, sw: string } | null>(null);
    const [loadingAudio, setLoadingAudio] = useState(false);

    // Bills State
    const [bills, setBills] = useState<Bill[]>([]);
    const [billsLoading, setBillsLoading] = useState(false);

    // Chat State
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatLoading, setChatLoading] = useState(false);

    // Fact Check State
    const [factResult, setFactResult] = useState<FactShieldResult | null>(null);
    const [factLoading, setFactLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const fetchDocs = async (query = '') => {
        setDocsLoading(true);
        try {
            const apiBase = (window as any).API_BASE_URL || 'http://localhost:8000';
            const res = await fetch(`${apiBase}/hansards/?q=${encodeURIComponent(query)}`);
            if (res.ok) setDocuments(await res.json());
        } catch (e: any) {
            console.error("Docs fetch failed", e);
        } finally {
            setDocsLoading(false);
        }
    };

    const fetchBills = async (query = '') => {
        setBillsLoading(true);
        try {
            const apiBase = (window as any).API_BASE_URL || 'http://localhost:8000';
            const response = await fetch(`${apiBase}/bills/?q=${encodeURIComponent(query)}`);
            if (response.ok) {
                const data = await response.json();
                setBills(data);
            }
        } catch (error) {
            console.error("Failed to fetch bills:", error);
        } finally {
            setBillsLoading(false);
        }
    };


    const syncHansards = async () => {
        setIsSyncing(true);
        try {
            const res = await fetch(`http://localhost:8000/ingest/crawl?limit=5&ai_parsing=${useAiParsing}`, { method: 'POST' });
            if (res.ok) {
                await fetchDocs();
            }
        } catch (e) {
            console.error('Failed to sync hansards', e);
        } finally {
            setIsSyncing(false);
        }
    };

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (activeCategory === 'parliament') {
                fetchDocs(searchQuery);
            } else if (activeCategory === 'bills') {
                fetchBills(searchQuery);
            }
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [searchQuery, activeCategory]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    const ensureLoggedIn = () => {
        if (!user) {
            if (onSwitchToProfile) onSwitchToProfile();
            return false;
        }
        return true;
    };

    const handleSendChat = async (message: string) => {
        if (!message.trim() || !ensureLoggedIn()) return;

        const userMsg: ChatMessage = { role: 'user', content: message };
        setChatMessages(prev => [...prev, userMsg]);
        setChatLoading(true);

        try {
            const docId = selectedHansard?.id;
            const docType = activeCategory === 'bills' ? 'bill' : 'hansard';
            const response = await fetch('http://localhost:8000/chat/document', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ query: userMsg.content, document_id: docId, doc_type: docType }),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                setChatMessages(prev => [...prev, { role: 'assistant', content: `Something went wrong. ${data.detail || ''}` }]);
                return;
            }

            if (!response.body) return;

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let botMsg: ChatMessage = { role: 'assistant', content: '', sources: [] };
            
            // Add placeholder message to state
            setChatMessages(prev => [...prev, botMsg]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const parsed = JSON.parse(line);
                            if (parsed.type === 'sources') {
                                botMsg.sources = parsed.data;
                            } else if (parsed.type === 'chunk') {
                                botMsg.content += parsed.data;
                            }
                            
                            // Update React state incrementally
                            setChatMessages(prev => {
                                const newMsgs = [...prev];
                                newMsgs[newMsgs.length - 1] = { ...botMsg };
                                return newMsgs;
                            });
                        } catch (e) {
                            console.error("Error parsing NDJSON line:", e);
                        }
                    }
                }
            }
        } catch (error) {
            setChatMessages(prev => [...prev, { role: 'assistant', content: 'Network error. Please try again.' }]);
        } finally {
            setChatLoading(false);
        }
    };

    // Close Modal Helper
    const handleCloseModal = () => {
        setSelectedHansard(null);
        setAudioData(null); // Reset audio state
        setChatMessages([]);
    };

    const fetchAudio = async (docId: number, docType: 'hansard' | 'bill') => {
        if (audioData) return;
        setLoadingAudio(true);
        try {
            const [enRes, swRes] = await Promise.all([
                fetch(`http://localhost:8000/audio/daily-brief?item_id=${docId}&item_type=${docType}&lang=en`),
                fetch(`http://localhost:8000/audio/daily-brief?item_id=${docId}&item_type=${docType}&lang=sw`)
            ]);
            if (enRes.ok && swRes.ok) {
                const enData = await enRes.json();
                const swData = await swRes.json();
                if (enData.audio_url && swData.audio_url) {
                    setAudioData({ en: enData.audio_url, sw: swData.audio_url });
                }
            }
        } catch (err) {
            console.error("Failed to load audio", err);
        } finally {
            setLoadingAudio(false);
        }
    };

    const handleFactCheck = async (url: string, claim: string) => {
        if (!claim.trim() && !url.trim()) return;
        setFactLoading(true);
        setFactResult(null);
        try {
            const apiBase = (window as any).API_BASE_URL || 'http://localhost:8000';
            const response = await fetch(`${apiBase}/fact-shield/verify`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ url: url, claim_text: claim }),
            });
            if (response.ok) {
                setFactResult(await response.json());
            }
        } catch (error) {
            console.error("Fact check failed", error);
        } finally {
            setFactLoading(false);
        }
    };

    return (
        <div className="search-page-container">
            <div className="search-main-content" style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
                <div className="page-header">
                    <h2>Documents Hub</h2>
                    <p className="subtitle">Unified access to official Parliamentary records & AI Analysis</p>
                </div>

                <div className="search-input-group" style={{ marginBottom: '1.5rem' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
                        <input
                            type="text"
                            placeholder={activeCategory === 'parliament' ? "Filter Hansards by title..." : "Filter Bills by title..."}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.85rem 1rem 0.85rem 2.8rem',
                                borderRadius: 'var(--radius)',
                                border: '1px solid var(--border)',
                                fontSize: '1rem',
                                outline: 'none',
                                transition: 'border-color 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                            onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                        />
                    </div>
                </div>

                <div className="category-pills" style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem' }}>
                    <button
                        onClick={() => setActiveCategory('parliament')}
                        style={{
                            padding: '0.6rem 1.25rem',
                            borderRadius: '2rem',
                            border: '1px solid ' + (activeCategory === 'parliament' ? 'var(--primary)' : 'var(--border)'),
                            background: activeCategory === 'parliament' ? 'var(--primary)' : 'white',
                            color: activeCategory === 'parliament' ? 'white' : '#666',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '0.9rem'
                        }}
                    >
                        <FileText size={16} /> Parliament
                    </button>
                    <button
                        onClick={() => setActiveCategory('bills')}
                        style={{
                            padding: '0.6rem 1.25rem',
                            borderRadius: '2rem',
                            border: '1px solid ' + (activeCategory === 'bills' ? 'var(--primary)' : 'var(--border)'),
                            background: activeCategory === 'bills' ? 'var(--primary)' : 'white',
                            color: activeCategory === 'bills' ? 'white' : '#666',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '0.9rem'
                        }}
                    >
                        <Activity size={16} /> Bills
                    </button>
                    <button
                        onClick={() => setActiveCategory('shield')}
                        style={{
                            padding: '0.6rem 1.25rem',
                            borderRadius: '2rem',
                            border: '1px solid ' + (activeCategory === 'shield' ? 'var(--primary)' : 'var(--border)'),
                            background: activeCategory === 'shield' ? 'var(--primary)' : 'white',
                            color: activeCategory === 'shield' ? 'white' : '#666',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '0.9rem'
                        }}
                    >
                        <Shield size={16} /> Shield
                    </button>
                </div>

                {activeCategory === 'parliament' ? (
                    <div className="latest-docs-section">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <h3 style={{ fontSize: '1.25rem', color: 'var(--primary)', margin: 0 }}>Processed Records</h3>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#666', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={useAiParsing} onChange={(e) => setUseAiParsing(e.target.checked)} disabled={isSyncing} />
                                    AI-Enhanced Parsing
                                </label>
                            </div>
                            <Button label={isSyncing ? "Syncing..." : "Sync Docs"} onPress={syncHansards} disabled={isSyncing || docsLoading} variant="secondary" />
                        </div>
                        {docsLoading ? (
                            <div style={{ textAlign: 'center', padding: '3rem' }}><Loader2 className="animate-spin" style={{ margin: '0 auto' }} /></div>
                        ) : documents.length > 0 ? (
                            <div className="docs-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                                {documents.map((doc, index) => (
                                    <div
                                        key={doc.id}
                                        className="doc-card"
                                        onClick={() => { setSelectedHansard(doc); setChatMessages([]); setAudioData(null); }}
                                        style={{ 
                                            padding: '1.25rem', 
                                            border: index === 0 ? '1px solid #10B981' : '1px solid var(--border)', 
                                            borderRadius: 'var(--radius)', 
                                            background: 'white', 
                                            cursor: 'pointer', 
                                            transition: 'all 0.2s', 
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                                            position: 'relative'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                    >
                                        {index === 0 && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '1rem',
                                                right: '1rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                background: '#f0fdf4',
                                                padding: '0.2rem 0.6rem',
                                                borderRadius: '1rem',
                                                fontSize: '0.7rem',
                                                fontWeight: '700',
                                                color: '#166534',
                                                border: '1px solid #bbf7d0'
                                            }}>
                                                <div style={{ width: '6px', height: '6px', background: '#10B981', borderRadius: '50%' }}></div>
                                                NEWEST
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                            <div style={{ padding: '0.5rem', background: '#F0F9FF', borderRadius: '10px' }}><FileText size={20} color="#007AFF" /></div>
                                            <span style={{ fontSize: '0.75rem', color: '#888' }}>{doc.date ? new Date(doc.date).toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                        <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '0.5rem', color: '#1a1a1a' }}>{doc.title}</div>
                                        <div style={{ fontSize: '0.85rem', color: '#666', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {doc.ai_summary || "AI Summary pending..."}
                                        </div>
                                        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontSize: '0.8rem', fontWeight: '600' }}>
                                            <MessageSquare size={14} /> Discuss document
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ padding: '4rem', textAlign: 'center', background: '#f8f9fa', borderRadius: 'var(--radius)', color: '#666' }}>
                                <Search size={40} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                <p>No documents found matching "{searchQuery}"</p>
                            </div>
                        )}
                    </div>
                ) : activeCategory === 'bills' ? (
                    <div className="bills-section">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.25rem', color: 'var(--primary)', margin: 0 }}>Legislative Bills</h3>
                        </div>
                        {billsLoading ? (
                            <div style={{ textAlign: 'center', padding: '3rem' }}><Loader2 className="animate-spin" style={{ margin: '0 auto' }} /></div>
                        ) : bills.length === 0 ? (
                            <div style={{ padding: '4rem', textAlign: 'center', background: '#f8f9fa', borderRadius: 'var(--radius)', color: '#666' }}>
                                <Search size={40} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                <p>No bills found matching "{searchQuery}"</p>
                            </div>
                        ) : (
                            <div className="docs-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                                {bills.map((bill, index) => (
                                    <div
                                        key={bill.id}
                                        className="doc-card"
                                        onClick={() => { setSelectedHansard({ id: bill.id, title: bill.title, ai_summary: bill.summary, date: '', created_at: '', pdf_url: bill.document_url }); setChatMessages([]); setAudioData(null); }}
                                        style={{ 
                                            padding: '1.25rem', 
                                            border: index === 0 ? '1px solid #10B981' : '1px solid var(--border)', 
                                            borderRadius: 'var(--radius)', 
                                            background: 'white', 
                                            cursor: 'pointer', 
                                            transition: 'all 0.2s', 
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                                            position: 'relative'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                    >
                                        {index === 0 && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '1rem',
                                                right: '1rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                background: '#f0fdf4',
                                                padding: '0.2rem 0.6rem',
                                                borderRadius: '1rem',
                                                fontSize: '0.7rem',
                                                fontWeight: '700',
                                                color: '#166534',
                                                border: '1px solid #bbf7d0'
                                            }}>
                                                <div style={{ width: '6px', height: '6px', background: '#10B981', borderRadius: '50%' }}></div>
                                                NEWEST
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                            <div style={{ padding: '0.5rem', background: '#FFF7ED', borderRadius: '10px' }}><Activity size={20} color="#F97316" /></div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '0.75rem', color: '#888', background: '#f0fdf4', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontWeight: '600', display: 'inline-block', marginBottom: '0.25rem' }}>Bill</div>
                                                <div style={{ fontSize: '0.7rem', color: '#999' }}>{bill.date ? new Date(bill.date).toLocaleDateString() : 'N/A'}</div>
                                            </div>
                                        </div>
                                        <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '0.5rem', color: '#1a1a1a', lineHeight: '1.4' }}>{bill.title}</div>
                                        <div style={{ fontSize: '0.85rem', color: '#666', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {bill.summary || "Summary pending..."}
                                        </div>
                                        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#F97316', fontSize: '0.8rem', fontWeight: '600' }}>
                                            <MessageSquare size={14} /> Discuss bill
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="shield-section" style={{ padding: '2rem', background: '#f8fafc', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                        <div style={{ marginBottom: '2rem' }}>
                            <h3 style={{ fontSize: '1.5rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>Fact-Shield Verification</h3>
                            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Cross-reference external claims against official Parliamentary records using AI.</p>
                        </div>

                        <MemoizedFactShieldInput onVerify={handleFactCheck} loading={factLoading} />

                        {factResult && (
                            <div style={{ marginTop: '2.5rem', padding: '2rem', background: 'white', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                                    <div style={{
                                        padding: '0.4rem 1rem',
                                        borderRadius: '2rem',
                                        fontWeight: '800',
                                        fontSize: '0.85rem',
                                        textTransform: 'uppercase',
                                        background: factResult.status === 'Verified' ? '#DCFCE7' : factResult.status === 'Unverified' ? '#FEE2E2' : '#FEF9C3',
                                        color: factResult.status === 'Verified' ? '#166534' : factResult.status === 'Unverified' ? '#991B1B' : '#854D0E'
                                    }}>
                                        {factResult.status}
                                    </div>
                                    <h4 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b' }}>AI Verification Analysis</h4>
                                </div>

                                <p style={{ fontSize: '1rem', lineHeight: '1.6', color: '#334155', marginBottom: '1.5rem' }}>{factResult.analysis}</p>

                                {/* Confidence Score */}
                                {factResult.confidence_score !== undefined && factResult.confidence_score !== null && (
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                                            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>AI Confidence</span>
                                            <span style={{ fontSize: '0.8rem', fontWeight: '800', color: factResult.confidence_score >= 75 ? '#166534' : factResult.confidence_score >= 50 ? '#854D0E' : '#991B1B' }}>{factResult.confidence_score}%</span>
                                        </div>
                                        <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${factResult.confidence_score}%`, background: factResult.confidence_score >= 75 ? '#22c55e' : factResult.confidence_score >= 50 ? '#f59e0b' : '#ef4444', borderRadius: '3px', transition: 'width 0.5s ease' }} />
                                        </div>
                                    </div>
                                )}

                                {factResult.sources && factResult.sources.length > 0 && (
                                    <div>
                                        <h5 style={{ fontSize: '0.9rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>Supporting Sources</h5>
                                        <div style={{ display: 'grid', gap: '1rem' }}>
                                            {factResult.sources.map(source => (
                                                <div key={source.id} style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                    <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--primary)', marginBottom: '0.3rem' }}>{source.title}</div>
                                                    <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0, fontStyle: 'italic' }}>'{source.preview}'</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* AI Watermark Disclaimer */}
                                <div style={{ marginTop: '1.5rem', padding: '0.75rem 1rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '1rem' }}>⚠️</span>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#92400e', lineHeight: '1.5' }}>
                                        <strong>AI Interpretation Only.</strong> This analysis is generated by an AI based on indexed official records and is not legal advice. Results may be incomplete if relevant records have not yet been indexed. Always verify critical claims against the original official source documents.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}


                {
                    selectedHansard && (
                        <div className="summary-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }} onClick={() => setSelectedHansard(null)}>
                            <div className="summary-modal" style={{ backgroundColor: 'white', borderRadius: '1.25rem', maxWidth: '1000px', width: '95%', height: '85vh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }} onClick={e => e.stopPropagation()}>
                                {/* Modal Header */}
                                <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h2 style={{ fontSize: '1.4rem', fontWeight: '800', margin: 0, color: '#1a1a1a' }}>{selectedHansard.title}</h2>
                                        <span style={{ fontSize: '0.85rem', color: '#666' }}>AI Document Analysis Hub</span>
                                    </div>
                                    <button style={{ background: '#f5f5f5', border: 'none', padding: '0.5rem', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={handleCloseModal}><X size={20} /></button>
                                </div>

                                {/* Modal Content - Dual Pane */}
                                <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                                    {/* Left Pane: Summary */}
                                    <div style={{ flex: 1, padding: '2rem', overflowY: 'auto', borderRight: '1px solid #f0f0f0', background: '#fafafa' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--primary)', fontWeight: '700', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            <FileText size={18} /> Official Summary
                                        </div>

                                        {/* Audio-First Engagement UI - Moved to Top */}
                                        <div style={{ marginBottom: '1.5rem', background: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                            <h3 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#334155' }}>
                                                <Headphones size={16} color="var(--primary)" />
                                                Audio-First Engagement
                                            </h3>
                                            {!audioData ? (
                                                <div style={{ maxWidth: '200px' }}>
                                                    <Button 
                                                        label="Listen to audio" 
                                                        variant="outline" 
                                                        onPress={() => fetchAudio(selectedHansard.id, activeCategory === 'bills' ? 'bill' : 'hansard')} 
                                                        loading={loadingAudio} 
                                                    />
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                    <AudioPlayer src={audioData.en} title="🇬🇧 English Brief" />
                                                    <AudioPlayer src={audioData.sw} title="🇰🇪 Swahili Brief (Kiswahili)" />
                                                </div>
                                            )}
                                        </div>
                                        {/* Structured Summary Renderer */}
                                        {selectedHansard.ai_summary ? (() => {
                                            const lines = selectedHansard.ai_summary.split('\n');
                                            // A section header: a non-empty line that is ALL CAPS or matches known headers, not a bullet
                                            const isSectionHeader = (line: string) => {
                                                const t = line.trim();
                                                if (!t || t.startsWith('-') || t.startsWith('•')) return false;
                                                // ALL CAPS line (allowing spaces, colons, slashes, & ampersands)
                                                return t === t.toUpperCase() && t.length > 3 && /[A-Z]/.test(t) && !/^\d/.test(t);
                                            };
                                            // A sub-label: line ending with colon like "Action:", "Financial Cost:"
                                            const isSubLabel = (line: string) => {
                                                const t = line.trim();
                                                return /^[A-Z][A-Za-z\s]+:\s/.test(t);
                                            };
                                            return (
                                                <div style={{ fontSize: '0.95rem', lineHeight: '1.75', color: '#334155' }}>
                                                    {lines.map((line, i) => {
                                                        if (line.trim() === '---' || line.trim() === '') {
                                                            return <div key={i} style={{ height: line.trim() === '' ? '0.4rem' : 0 }} />;
                                                        }
                                                        if (isSectionHeader(line)) {
                                                            return (
                                                                <div key={i} style={{ marginTop: i === 0 ? 0 : '1.5rem', marginBottom: '0.6rem', fontSize: '1rem', fontWeight: '800', color: '#1e293b', borderBottom: '2px solid var(--primary)', paddingBottom: '0.3rem' }}>
                                                                    {line.trim()}
                                                                </div>
                                                            );
                                                        }
                                                        if (isSubLabel(line)) {
                                                            const colonIdx = line.indexOf(':');
                                                            const label = line.slice(0, colonIdx);
                                                            const rest = line.slice(colonIdx + 1);
                                                            return (
                                                                <div key={i} style={{ marginBottom: '0.25rem' }}>
                                                                    <strong>{label}:</strong>
                                                                    <span>{rest}</span>
                                                                </div>
                                                            );
                                                        }
                                                        return (
                                                            <div key={i} style={{ marginBottom: '0.25rem' }}>
                                                                {line}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })() : (
                                            <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                                                System is still generating the summary for this document. Please check back in a few moments.
                                            </div>
                                        )}

                                        {/* Traceable source link */}
                                        {selectedHansard.pdf_url && (
                                            <div style={{
                                                marginTop: '1.5rem',
                                                padding: '0.75rem 1rem',
                                                background: '#f0f4ff',
                                                borderLeft: '3px solid var(--primary)',
                                                borderRadius: '6px',
                                                fontSize: '0.85rem',
                                                color: '#444'
                                            }}>
                                                ⚠️ <strong>AI-Generated Summary</strong> — Always verify against the official source.
                                                <br />
                                                <a
                                                    href={selectedHansard.pdf_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'underline', display: 'inline-block', marginTop: '0.3rem' }}
                                                >
                                                    📄 View Original PDF on parliament.go.ke
                                                </a>
                                            </div>
                                        )}
                                        
                                        {/* Removed from bottom */}
                                    </div>

                                    {/* Right Pane: Chat */}
                                    <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', background: 'white' }}>
                                        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #f0f0f0', background: '#fff', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{ width: '8px', height: '8px', background: '#10B981', borderRadius: '50%' }}></div>
                                            <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#334155' }}>Contextual AI Chat</span>
                                        </div>

                                        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            {chatMessages.length === 0 && (
                                                <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '3rem' }}>
                                                    <MessageSquare size={32} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                                                    <p style={{ fontSize: '0.9rem' }}>Ask specific questions about this document.<br />The AI will search the transcript for you.</p>
                                                </div>
                                            )}
                                            {chatMessages.map((msg, idx) => (
                                                <div key={idx} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                                                    <div style={{
                                                        padding: '0.85rem 1.1rem',
                                                        borderRadius: '1.25rem',
                                                        background: msg.role === 'user' ? 'var(--primary)' : '#f1f5f9',
                                                        color: msg.role === 'user' ? 'white' : '#1e293b',
                                                        fontSize: '0.95rem',
                                                        lineHeight: '1.5',
                                                        marginTop: '0.25rem',
                                                        fontWeight: msg.role === 'assistant' ? '400' : '500',
                                                        boxShadow: msg.role === 'assistant' ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                                    }}>
                                                        {msg.content}
                                                    </div>
                                                    {msg.sources && msg.sources.length > 0 && (
                                                        <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', background: '#f8fafc', borderRadius: '8px', borderLeft: '3px solid #cbd5e1' }}>
                                                            <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Citations:</span>
                                                            {msg.sources.slice(0, 2).map(s => (
                                                                <div key={s.id} style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.25rem', fontStyle: 'italic' }}>
                                                                    "{s.preview}" — {s.speaker}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {msg.role === 'assistant' && (
                                                        <div style={{ marginTop: '0.35rem', fontSize: '0.7rem', color: '#94a3b8', fontStyle: 'italic' }}>
                                                            🤖 AI interpretation based on official parliamentary records. Not legal advice.
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                            {chatLoading && <div style={{ alignSelf: 'flex-start', padding: '1rem', background: '#f1f5f9', borderRadius: '1rem', fontSize: '0.9rem', color: '#64748b' }}>AI is analyzing transcripts...</div>}
                                            <div ref={chatEndRef} />
                                        </div>

                                        <MemoizedChatInput onSend={handleSendChat} disabled={chatLoading} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }
            </div >
        </div >
    );
};

