import React, { useState } from 'react';
import { Button } from '../components/ui/Button';

interface Source {
    id: number;
    speaker: string;
    preview: string;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
    sources?: Source[];
}

export const ChatInterface: React.FC = () => {
    const [query, setQuery] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);

    const handleSend = async () => {
        if (!query.trim()) return;

        const userMsg: Message = { role: 'user', content: query };
        setMessages(prev => [...prev, userMsg]);
        setLoading(true);
        setQuery('');

        try {
            const response = await fetch('http://localhost:8000/chat/hansard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: userMsg.content }),
            });

            const data = await response.json();

            if (response.ok) {
                const botMsg: Message = {
                    role: 'assistant',
                    content: data.answer,
                    sources: data.sources
                };
                setMessages(prev => [...prev, botMsg]);
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${data.detail || 'Failed to get answer'}` }]);
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Network error. Please try again.' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '1rem', display: 'flex', flexDirection: 'column', height: '80vh' }}>
            <h2>Chat with Hansard</h2>

            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem', border: '1px solid #ddd', borderRadius: '8px', padding: '1rem' }}>
                {messages.length === 0 && <p style={{ color: '#888', textAlign: 'center' }}>Ask a question about parliamentary proceedings...</p>}
                {messages.map((msg, idx) => (
                    <div key={idx} style={{
                        marginBottom: '1rem',
                        alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: '80%',
                        backgroundColor: msg.role === 'user' ? '#e3f2fd' : '#f5f5f5',
                        padding: '10px',
                        borderRadius: '8px'
                    }}>
                        <strong>{msg.role === 'user' ? 'You' : 'ParliaScope AI'}:</strong>
                        <p style={{ margin: '5px 0' }}>{msg.content}</p>
                        {msg.sources && msg.sources.length > 0 && (
                            <div style={{ fontSize: '0.85rem', marginTop: '5px', borderTop: '1px solid #ccc', paddingTop: '5px' }}>
                                <strong>Sources:</strong>
                                <ul>
                                    {msg.sources.map(src => (
                                        <li key={src.id}>
                                            <em>{src.speaker}</em>: "{src.preview}"
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                ))}
                {loading && <p>Thinking...</p>}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Type your question..."
                    style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
                <Button label="Send" onPress={handleSend} disabled={loading} />
            </div>
        </div>
    );
};
