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

export const SearchPage: React.FC = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchHistory = async () => {
        try {
            const res = await fetch('http://localhost:8000/search/history');
            if (res.ok) setHistory(await res.json());
        } catch (e: any) {
            console.error("History fetch failed", e);
        }
    };

    useEffect(() => {
        fetchHistory();
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
                    <h2>Unified Search</h2>
                    <p className="subtitle">AI-powered hybrid search through parliamentary transcripts</p>
                </div>

                <div className="search-input-group">
                    <Input
                        placeholder="Search topics, speakers, or keywords..."
                        value={query}
                        onChangeText={(text) => setQuery(text)}
                    />
                    <Button label="Search" onPress={handleSearch} disabled={loading} />
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
