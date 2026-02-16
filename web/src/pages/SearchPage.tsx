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
        <div style={{ maxWidth: '1000px', margin: '2rem auto', padding: '1rem', display: 'flex', gap: '2rem' }}>
            <div style={{ flex: 1 }}>
                <h2>Unified Search</h2>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem' }}>
                    <Input
                        placeholder="Search for topics, speakers..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <Button label="Search" onPress={handleSearch} disabled={loading} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {loading && <p>Searching...</p>}
                    {results.map(r => (
                        <div key={r.id} style={{
                            padding: '1rem',
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            backgroundColor: '#fff'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <strong>{r.speaker_name}</strong>
                                <span style={{ color: '#666', fontSize: '0.9rem' }}>{new Date(r.created_at).toLocaleDateString()}</span>
                            </div>
                            <p>{r.content}</p>
                        </div>
                    ))}
                    {!loading && results.length === 0 && query && <p>No results found.</p>}
                </div>
            </div>

            <div style={{ width: '250px', borderLeft: '1px solid #eee', paddingLeft: '1rem' }}>
                <h3>Recent Searches</h3>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {history.map((h, i) => (
                        <li key={i} style={{
                            padding: '0.5rem 0',
                            borderBottom: '1px solid #f0f0f0',
                            cursor: 'pointer',
                            color: '#007bff'
                        }} onClick={() => { setQuery(h.query); handleSearch(); }}>
                            {h.query}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};
