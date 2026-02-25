import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { ImpactCard } from '../components/ImpactCard';
import { Loader2, FileText, Activity, Send, MessageSquare, Search, X } from 'lucide-react';

interface Hansard {
    id: number;
    title: string;
    pdf_url: string;
    ai_summary: string | null;
    created_at: string;
}

interface Bill {
    id: number;
    title: string;
    summary: string;
    document_url: string;
    impacts: any[];
}

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    sources?: { speaker: string; preview: string; id: number }[];
}

export const SearchPage: React.FC = () => {
    const { token } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [documents, setDocuments] = useState<Hansard[]>([]);
    const [docsLoading, setDocsLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [useAiParsing, setUseAiParsing] = useState(false);
    const [selectedHansard, setSelectedHansard] = useState<Hansard | null>(null);
    const [activeCategory, setActiveCategory] = useState<'parliament' | 'bills'>('parliament');

    // Bills State
    const [bills, setBills] = useState<Bill[]>([]);
    const [billsLoading, setBillsLoading] = useState(false);
    const [analyzingId, setAnalyzingId] = useState<number | null>(null);

    // Chat State
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const fetchDocs = async () => {
        setDocsLoading(true);
        try {
            const res = await fetch('http://localhost:8000/docs/');
            if (res.ok) setDocuments(await res.json());
        } catch (e: any) {
            console.error("Docs fetch failed", e);
        } finally {
            setDocsLoading(false);
        }
    };

    const fetchBills = async () => {
        if (!token) return;
        setBillsLoading(true);
        try {
            const response = await fetch('http://localhost:8000/bills/', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
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

    const handleAnalyze = async (billId: number, rawText: string) => {
        if (!token) return;
        setAnalyzingId(billId);
        try {
            const response = await fetch(`http://localhost:8000/bills/${billId}/analyze?raw_text=${encodeURIComponent(rawText)}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                setTimeout(fetchBills, 5000);
            }
        } catch (error) {
            console.error("Failed to start analysis:", error);
            setAnalyzingId(null);
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
        fetchDocs();
        if (token) fetchBills();
    }, [token]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    const handleSendChat = async () => {
        if (!chatInput.trim()) return;

        const userMsg: ChatMessage = { role: 'user', content: chatInput };
        setChatMessages(prev => [...prev, userMsg]);
        setChatLoading(true);
        setChatInput('');

        try {
            const response = await fetch('http://localhost:8000/chat/hansard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: userMsg.content }),
            });

            const data = await response.json();

            if (response.ok) {
                setChatMessages(prev => [...prev, {
                    role: 'assistant',
                    content: data.answer,
                    sources: data.sources
                }]);
            } else {
                setChatMessages(prev => [...prev, { role: 'assistant', content: `Sorry, I couldn't find that in the documents. ${data.detail || ''}` }]);
            }
        } catch (error) {
            setChatMessages(prev => [...prev, { role: 'assistant', content: 'Network error. Please try again.' }]);
        } finally {
            setChatLoading(false);
        }
    };

    const filteredDocs = documents.filter(doc =>
        doc.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredBills = bills.filter(bill =>
        bill.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                        ) : filteredDocs.length > 0 ? (
                            <div className="docs-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                                {filteredDocs.map(doc => (
                                    <div
                                        key={doc.id}
                                        className="doc-card"
                                        onClick={() => { setSelectedHansard(doc); setChatMessages([]); }}
                                        style={{ padding: '1.25rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'white', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                            <div style={{ padding: '0.5rem', background: '#F0F9FF', borderRadius: '10px' }}><FileText size={20} color="#007AFF" /></div>
                                            <span style={{ fontSize: '0.75rem', color: '#888' }}>{new Date(doc.created_at).toLocaleDateString()}</span>
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
                ) : (
                    <div className="bills-section">
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.25rem', color: 'var(--primary)', margin: '0 0 0.5rem 0' }}>AI Bill Impact Engine</h3>
                            <p style={{ color: '#666', fontSize: '0.95rem' }}>Demographic-specific analysis for critical legislation.</p>
                        </div>
                        {billsLoading ? (
                            <div style={{ textAlign: 'center', padding: '3rem' }}><Loader2 className="animate-spin" style={{ margin: '0 auto' }} /></div>
                        ) : filteredBills.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem', background: '#f8f9fa', borderRadius: 'var(--radius)' }}>
                                <p>No bills found matching "{searchQuery}"</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                {filteredBills.map(bill => (
                                    <div key={bill.id} className="card" style={{ padding: '1.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'white' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                            <h4 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--primary)', margin: 0 }}>{bill.title}</h4>
                                            <Button label="Discuss Bill" variant="outline" onPress={() => { setSelectedHansard({ id: bill.id, title: bill.title, ai_summary: bill.summary, created_at: '', pdf_url: '' }); setChatMessages([]); }} />
                                        </div>
                                        <p style={{ color: '#444', fontSize: '1rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>{bill.summary}</p>

                                        {bill.impacts && bill.impacts.length > 0 ? (
                                            <div style={{ background: '#F8FAFC', padding: '1.25rem', borderRadius: '12px' }}>
                                                <div style={{ fontWeight: '700', fontSize: '0.9rem', marginBottom: '1rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Impact Segmentation</div>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                                                    {bill.impacts.map(impact => (
                                                        <ImpactCard key={impact.id} impact={impact} />
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ background: '#f1f5f9', padding: '2rem', borderRadius: '12px', textAlign: 'center' }}>
                                                <p style={{ color: '#64748b', marginBottom: '1rem' }}>AI segmentation hasn't been run for this bill.</p>
                                                <Button label="Initialize AI Impact Analysis" onPress={() => handleAnalyze(bill.id, bill.summary)} loading={analyzingId === bill.id} />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {selectedHansard && (
                    <div className="summary-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }} onClick={() => setSelectedHansard(null)}>
                        <div className="summary-modal" style={{ backgroundColor: 'white', borderRadius: '1.25rem', maxWidth: '1000px', width: '95%', height: '85vh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }} onClick={e => e.stopPropagation()}>
                            {/* Modal Header */}
                            <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.4rem', fontWeight: '800', margin: 0, color: '#1a1a1a' }}>{selectedHansard.title}</h2>
                                    <span style={{ fontSize: '0.85rem', color: '#666' }}>AI Document Analysis Hub</span>
                                </div>
                                <button style={{ background: '#f5f5f5', border: 'none', padding: '0.5rem', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setSelectedHansard(null)}><X size={20} /></button>
                            </div>

                            {/* Modal Content - Dual Pane */}
                            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                                {/* Left Pane: Summary */}
                                <div style={{ flex: 1, padding: '2rem', overflowY: 'auto', borderRight: '1px solid #f0f0f0', background: '#fafafa' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--primary)', fontWeight: '700', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        <FileText size={18} /> Official Summary
                                    </div>
                                    <div style={{ fontSize: '1.1rem', lineHeight: '1.7', color: '#334155', whiteSpace: 'pre-wrap' }}>
                                        {selectedHansard.ai_summary || "System is still generating the summary for this document. Please check back in a few moments."}
                                    </div>
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
                                            </div>
                                        ))}
                                        {chatLoading && <div style={{ alignSelf: 'flex-start', padding: '1rem', background: '#f1f5f9', borderRadius: '1rem', fontSize: '0.9rem', color: '#64748b' }}>AI is analyzing transcripts...</div>}
                                        <div ref={chatEndRef} />
                                    </div>

                                    <div style={{ padding: '1.5rem', borderTop: '1px solid #f0f0f0' }}>
                                        <div style={{ display: 'flex', gap: '0.75rem', background: '#f8fafc', padding: '0.5rem', borderRadius: '1.5rem', border: '1px solid #e2e8f0' }}>
                                            <input
                                                type="text"
                                                placeholder="Ask about speakers, topics, or full questions..."
                                                value={chatInput}
                                                onChange={(e) => setChatInput(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                                                style={{ flex: 1, background: 'transparent', border: 'none', padding: '0.5rem 1rem', outline: 'none', fontSize: '0.95rem' }}
                                            />
                                            <button
                                                onClick={handleSendChat}
                                                disabled={chatLoading || !chatInput.trim()}
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
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

