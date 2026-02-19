import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

interface SearchResult {
    id: number;
    speaker_name: string;
    content: string;
    created_at: string;
}

interface HistoryItem {
    query: string;
}

interface Hansard {
    id: number;
    title: string;
    pdf_url: string;
    created_at: string;
}

export const SearchPage: React.FC = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [documents, setDocuments] = useState<Hansard[]>([]);
    const [loading, setLoading] = useState(false);
    const [docsLoading, setDocsLoading] = useState(false);

    const fetchHistory = async () => {
        try {
            const res = await fetch('http://localhost:8000/search/history');
            if (res.ok) setHistory(await res.json());
        } catch (e: any) {
            console.error("History fetch failed", e);
        }
    };

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

    useEffect(() => {
        fetchHistory();
        fetchDocs();
    }, []);

    const handleSearch = async () => {
        if (!query.trim()) return;
        setLoading(true);
        try {
            const res = await fetch(`http://localhost:8000/search/query?q=${encodeURIComponent(query)}`);
            if (res.ok) {
                setResults(await res.json());
                fetchHistory(); // Refresh history
            }
        } catch (e: any) {
            console.error("Search failed", e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="search-page-container">
            <div className="search-main-content">
                <div className="page-header">
                    <h2>Documents Hub</h2>
                    <p className="subtitle">Official Parliamentary Hansard Records & Analysis</p>
                </div>

                <div className="search-input-group">
                    <Input
                        placeholder="Search speech transcripts, topics, or speakers..."
                        value={query}
                        onChangeText={(text) => setQuery(text)}
                    />
                    <Button label="Search" onPress={handleSearch} disabled={loading} />
                </div>

                <div className="latest-docs-section" style={{ marginBottom: '2.5rem' }}>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--primary)' }}>Latest Hansards</h3>
                    {docsLoading ? (
                        <div className="loading-docs">Loading official records...</div>
                    ) : documents.length > 0 ? (
                        <div className="docs-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
                            {documents.map(doc => (
                                <a
                                    key={doc.id}
                                    href={doc.pdf_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="doc-card"
                                    style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'white', textDecoration: 'none', color: 'inherit', transition: 'transform 0.2s' }}
                                >
                                    <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>📄</div>
                                    <div style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '0.25rem' }}>{doc.title}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#888' }}>{new Date(doc.created_at).toLocaleDateString()}</div>
                                </a>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-docs" style={{ padding: '2rem', textAlign: 'center', background: '#f8f9fa', borderRadius: 'var(--radius)', color: '#666' }}>
                            No documents ingested yet.
                        </div>
                    )}
                </div>

                <div className="results-container">
                    {loading && <div className="loading-state">Searching Hansard...</div>}
                    <div className="results-grid">
                        {results.map(r => (
                            <div key={r.id} className="result-card">
                                <div className="result-card-header">
                                    <span className="speaker-name">{r.speaker_name}</span>
                                    <span className="result-date">{new Date(r.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="result-content">
                                    <p>{r.content}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    {!loading && results.length === 0 && query && (
                        <div className="empty-state">No matching transcripts found.</div>
                    )}
                </div>
            </div>

            <aside className="search-sidebar">
                <div className="sidebar-section">
                    <h3>Recent Searches</h3>
                    <ul className="history-list">
                        {history.length > 0 ? (
                            history.map((h, i) => (
                                <li key={i} className="history-item" onClick={() => { setQuery(h.query); handleSearch(); }}>
                                    {h.query}
                                </li>
                            ))
                        ) : (
                            <li className="history-empty">No recent searches</li>
                        )}
                    </ul>
                </div>
            </aside>
        </div>
    );
};
