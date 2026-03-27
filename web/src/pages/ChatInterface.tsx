import React, { useState } from 'react';
import { Button } from '../components/ui/Button';

import { useAuth } from '../context/AuthContext';

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

interface ChatInterfaceProps {
    onSwitchToProfile?: () => void;
    documentId?: number;
    docType?: 'hansard' | 'bill';
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ onSwitchToProfile, documentId, docType = 'hansard' }) => {
    const { user, token } = useAuth();
    const [query, setQuery] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);

    const ensureLoggedIn = () => {
        if (!user) {
            if (onSwitchToProfile) onSwitchToProfile();
            return false;
        }
        return true;
    };

    const handleSend = async () => {
        if (!query.trim() || !ensureLoggedIn()) return;

        const userMsg: Message = { role: 'user', content: query };
        setMessages(prev => [...prev, userMsg]);
        setLoading(true);
        setQuery('');

        try {
            const response = await fetch('http://localhost:8000/chat/document', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ 
                    query: userMsg.content,
                    document_id: documentId,
                    doc_type: docType
                }),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${data.detail || 'Failed to get answer'}` }]);
                return;
            }

            if (!response.body) return;

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let botMsg: Message = { role: 'assistant', content: '', sources: [] };
            
            // Add placeholder message to state
            setMessages(prev => [...prev, botMsg]);

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
                            setMessages(prev => {
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
