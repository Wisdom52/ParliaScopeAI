import React, { useRef } from 'react';

interface AudioPlayerProps {
    src: string;
    title?: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, title }) => {
    const audioRef = useRef<HTMLAudioElement>(null);


    return (
        <div style={{
            padding: '1rem',
            border: '1px solid #ddd',
            borderRadius: '8px',
            backgroundColor: '#f9f9f9',
            marginTop: '1rem'
        }}>
            {title && <h4>{title}</h4>}
            <audio
                ref={audioRef}
                src={src}
                controls
                style={{ width: '100%', marginTop: '0.5rem' }}
            />
            {/* Custom controls can go here if we want to hide default controls */}
        </div>
    );
};
