import React from 'react';
import { AudioPlayer } from '../components/ui/AudioPlayer';

export const ListenPage: React.FC = () => {
    return (
        <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '1rem' }}>
            <h2>Daily Audio Brief</h2>
            <p style={{ color: '#666', marginBottom: '1.5rem' }}>
                Listen to AI-generated summaries of today's parliamentary highlights.
            </p>

            <AudioPlayer src="http://localhost:8000/audio/daily-brief?lang=en" title="🇬🇧 English Brief" />
            <AudioPlayer src="http://localhost:8000/audio/daily-brief?lang=sw" title="🇰🇪 Swahili Brief (Kiswahili)" />
        </div>
    );
};
