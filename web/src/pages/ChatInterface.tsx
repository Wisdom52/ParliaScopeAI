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
        <div className="chat-container">
            <div className="chat-header">
                <h2>Chat with Hansard</h2>
                <p className="subtitle">Ask specific questions and get answers cited from official transcripts</p>
            </div>

            <div className="chat-messages-wrapper">
                {messages.length === 0 && (
                    <div className="chat-empty-state">
                        <p>Ask a question about parliamentary proceedings... Try "What was discussed about the budget?"</p>
                    </div>
                )}
                {messages.map((msg, idx) => (
                    <div key={idx} className={`chat-message ${msg.role}`}>
                        <div className="message-bubble">
                            <div className="message-role">
                                {msg.role === 'user' ? 'You' : 'ParliaScope AI'}
                            </div>
                            <div className="message-text">{msg.content}</div>
                            {msg.sources && msg.sources.length > 0 && (
                                <div className="message-sources">
                                    <div className="sources-label">Sources:</div>
                                    <ul className="sources-list">
                                        {msg.sources.map(src => (
                                            <li key={src.id} className="source-item">
                                                <span className="source-speaker">{src.speaker}</span>: "{src.preview}"
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="chat-message assistant loading">
                        <div className="message-bubble">
                            <div className="loading-dots">Thinking...</div>
                        </div>
                    </div>
                )}
            </div>

            <div className="chat-input-area">
                <div className="chat-input-wrapper">
                    <input
                        type="text"
                        className="chat-input"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Type your question..."
                    />
                    <Button label="Send" onPress={handleSend} disabled={loading} />
                </div>
            </div>
        </div>
    );
};
