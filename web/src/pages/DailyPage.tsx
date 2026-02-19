import React, { useState } from 'react';
import { AudioPlayer } from '../components/ui/AudioPlayer';
import { BookOpen, Headphones } from 'lucide-react';
import './DailyPage.css';

export const DailyPage: React.FC = () => {
    const [mode, setMode] = useState<'read' | 'listen'>('listen');

    return (
        <div className="daily-page">
            <div className="daily-header">
                <h2>Daily Brief</h2>
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
            </div>

            <div className="daily-content">
                {mode === 'listen' ? (
                    <div className="listen-mode">
                        <p className="mode-desc">
                            Listen to AI-generated summaries of today's parliamentary highlights.
                        </p>
                        <div className="audio-list">
                            <AudioPlayer src="http://localhost:8000/audio/daily-brief?lang=en" title="🇬🇧 English Brief" />
                            <AudioPlayer src="http://localhost:8000/audio/daily-brief?lang=sw" title="🇰🇪 Swahili Brief (Kiswahili)" />
                        </div>
                    </div>
                ) : (
                    <div className="read-mode">
                        <p className="mode-desc">
                            Read summarized briefs of today's parliamentary sessions.
                        </p>
                        <div className="text-placeholder">
                            <div className="placeholder-card">
                                <h3>Text Briefs Coming Soon</h3>
                                <p>We are currently finalizing the AI text summarization engine. Soon you will be able to read concise versions of all proceedings here.</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
