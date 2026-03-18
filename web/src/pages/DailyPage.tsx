import React, { useState, useEffect } from 'react';
import { AudioPlayer } from '../components/ui/AudioPlayer';
import { BookOpen, Headphones, Loader2, FileText, ChevronRight, ArrowLeft } from 'lucide-react';
import './DailyPage.css';

interface BriefItem {
    id: number;
    type: 'hansard' | 'bill';
    title: string;
    has_summary: boolean;
    source_url?: string;
}

interface SelectedBrief {
    transcript: string;
    audio_url: string;
    title: string;
    source_url?: string;
}

export const DailyPage: React.FC = () => {
    const [mode, setMode] = useState<'read' | 'listen'>('listen');
    const [readLang, setReadLang] = useState<'en' | 'sw'>('en');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [briefList, setBriefList] = useState<BriefItem[]>([]);
    const [selectedItem, setSelectedItem] = useState<BriefItem | null>(null);
    const [briefData, setBriefData] = useState<{ en: SelectedBrief | null, sw: SelectedBrief | null }>({
        en: null,
        sw: null
    });
    const [contentLoading, setContentLoading] = useState(false);

    // 1. Fetch the list of documents on mount
    useEffect(() => {
        const fetchList = async () => {
            try {
                setLoading(true);
                const res = await fetch('http://localhost:8000/audio/daily-brief/list');
                if (!res.ok) throw new Error('Failed to fetch daily brief list');
                const data = await res.json();
                setBriefList(data.items);
            } catch (err: any) {
                console.error(err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchList();
    }, []);

    // 2. Fetch content when an item is selected
    useEffect(() => {
        if (!selectedItem) {
            setBriefData({ en: null, sw: null });
            return;
        }

        const fetchContent = async () => {
            try {
                setContentLoading(true);
                const [enRes, swRes] = await Promise.all([
                    fetch(`http://localhost:8000/audio/daily-brief?item_id=${selectedItem.id}&item_type=${selectedItem.type}&lang=en`),
                    fetch(`http://localhost:8000/audio/daily-brief?item_id=${selectedItem.id}&item_type=${selectedItem.type}&lang=sw`)
                ]);

                if (!enRes.ok || !swRes.ok) throw new Error('Failed to fetch document content');

                const [enData, swData] = await Promise.all([enRes.json(), swRes.json()]);
                setBriefData({ en: enData, sw: swData });
            } catch (err: any) {
                console.error(err);
                setError("Could not load contents for the selected document.");
            } finally {
                setContentLoading(false);
            }
        };

        fetchContent();
    }, [selectedItem]);

    if (loading) {
        return (
            <div className="loading-state">
                <Loader2 className="spinner" size={48} />
                <p>Finding the latest parliamentary sessions...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="daily-page error-state">
                <p>{error}</p>
                <button onClick={() => window.location.reload()}>Retry</button>
            </div>
        );
    }

    return (
        <div className="daily-page">
            <div className="daily-header">
                <h2>Daily Brief</h2>
                {selectedItem && (
                    <div className="mode-toggle">
                        <button
                            className={`toggle-btn ${mode === 'read' ? 'active' : ''}`}
                            onClick={() => setMode('read')}
                        >
                            <BookOpen size={18} />
                            <span>Read</span>
                        </button>
                        <button
                            className={`toggle-btn ${mode === 'listen' ? 'active' : ''}`}
                            onClick={() => setMode('listen')}
                        >
                            <Headphones size={18} />
                            <span>Listen</span>
                        </button>
                    </div>
                )}
            </div>

            <div className="daily-content">
                {!selectedItem ? (
                    <div className="brief-list-view">
                        <p className="mode-desc">Select a document from the latest session to view its brief.</p>
                        <div className="brief-grid">
                            {briefList.map(item => (
                                <div
                                    key={`${item.type}-${item.id}`}
                                    className="brief-list-item"
                                    onClick={() => setSelectedItem(item)}
                                >
                                    <div className="item-icon">
                                        {item.type === 'hansard' ? <BookOpen size={20} /> : <FileText size={20} />}
                                    </div>
                                    <div className="item-info">
                                        <span className="item-type">{item.type.toUpperCase()}</span>
                                        <h3 className="item-title">{item.title}</h3>
                                    </div>
                                    <ChevronRight className="chevron" size={20} />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="brief-detail-view">
                        <button className="back-btn" onClick={() => setSelectedItem(null)}>
                            <ArrowLeft size={16} />
                            Back to List
                        </button>

                        {contentLoading ? (
                            <div className="loading-state-mini">
                                <Loader2 className="spinner" size={32} />
                                <p>Loading summary & audio...</p>
                            </div>
                        ) : (
                            <>
                                {mode === 'listen' ? (
                                    <div className="listen-mode">
                                        <p className="mode-desc">
                                            Listen to the AI-generated summary of <strong>{selectedItem.title}</strong>.
                                        </p>
                                        <div className="audio-list">
                                            {briefData.en && (
                                                <AudioPlayer
                                                    src={briefData.en.audio_url}
                                                    title="🇬🇧 English Brief"
                                                />
                                            )}
                                            {briefData.sw && (
                                                <AudioPlayer
                                                    src={briefData.sw.audio_url}
                                                    title="🇰🇪 Swahili Brief (Kiswahili)"
                                                />
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="read-mode">
                                        <div className="read-header-flex">
                                            <p className="mode-desc">
                                                Summary of {selectedItem.title}
                                            </p>
                                            <div className="read-lang-toggle">
                                                <button
                                                    className={`lang-btn ${readLang === 'en' ? 'active' : ''}`}
                                                    onClick={() => setReadLang('en')}
                                                >
                                                    EN
                                                </button>
                                                <button
                                                    className={`lang-btn ${readLang === 'sw' ? 'active' : ''}`}
                                                    onClick={() => setReadLang('sw')}
                                                >
                                                    SW
                                                </button>
                                            </div>
                                        </div>

                                        <div className="brief-script-container">
                                            <div className={`script-card ${readLang === 'sw' ? 'swahili' : ''}`}>
                                                <div className="script-header">
                                                    <h3>{readLang === 'en' ? '🇬🇧 English Summary' : '🇰🇪 Maelezo ya Kiswahili'}</h3>
                                                </div>
                                                <div className="script-body">
                                                    {readLang === 'en' ? briefData.en?.transcript : briefData.sw?.transcript}
                                                </div>
                                                {/* Traceable source link — addresses AI Hallucination risk */}
                                                {(briefData.en?.source_url || selectedItem.source_url) && (
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
                                                        {' '}
                                                        <a
                                                            href={briefData.en?.source_url || selectedItem.source_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'underline' }}
                                                        >
                                                            📄 View Original PDF on parliament.go.ke
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
