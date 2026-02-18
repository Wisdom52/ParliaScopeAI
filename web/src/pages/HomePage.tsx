import React from 'react';
import { Search, MessageSquare, Headphones, FileText } from 'lucide-react';

interface Props {
    onNavigate: (tab: string) => void;
}

export const HomePage: React.FC<Props> = ({ onNavigate }) => {
    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '-1px' }}>
                    Welcome to ParliaScope
                </h1>
                <p style={{ color: '#666', fontSize: '1.1rem' }}>Your AI-powered window into Kenya's Parliament</p>
            </div>

            <div className="card-grid">
                <div className="feature-card" onClick={() => onNavigate('search')}>
                    <div style={{ color: '#007AFF', marginBottom: '1rem' }}><Search size={32} /></div>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: 700 }}>Search Hansard</h3>
                    <p style={{ color: '#666', fontSize: '0.95rem', margin: 0 }}>
                        Find speeches by topic, speaker, or keyword using AI-powered hybrid search.
                    </p>
                </div>

                <div className="feature-card" onClick={() => onNavigate('chat')}>
                    <div style={{ color: '#34a853', marginBottom: '1rem' }}><MessageSquare size={32} /></div>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: 700 }}>Chat with Hansard</h3>
                    <p style={{ color: '#666', fontSize: '0.95rem', margin: 0 }}>
                        Ask questions about parliamentary sessions and get AI answers with citations.
                    </p>
                </div>

                <div className="feature-card" onClick={() => onNavigate('listen')}>
                    <div style={{ color: '#fbbc05', marginBottom: '1rem' }}><Headphones size={32} /></div>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: 700 }}>Daily Audio Brief</h3>
                    <p style={{ color: '#666', fontSize: '0.95rem', margin: 0 }}>
                        Listen to a 2-minute AI-generated summary in English or Swahili.
                    </p>
                </div>

                <div className="feature-card">
                    <div style={{ color: '#ea4335', marginBottom: '1rem' }}><FileText size={32} /></div>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: 700 }}>Hansard Pipeline</h3>
                    <p style={{ color: '#666', fontSize: '0.95rem', margin: 0 }}>
                        PDF ingestion and speaker identification running in the background.
                    </p>
                </div>
            </div>
        </div>
    );
};
