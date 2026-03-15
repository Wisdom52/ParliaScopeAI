import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button as RNButton } from 'react-native';
import { Audio } from 'expo-av';
import { API_BASE_URL } from '../../config/api';

interface AudioPlayerProps {
    sourceUrl: string;
    title?: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ sourceUrl, title }) => {
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const playSound = async () => {
        try {
            if (!sourceUrl) {
                console.warn('No source URL provided for audio player');
                return;
            }
            
            console.log('Loading Sound from:', sourceUrl);
            const fullUrl = sourceUrl.startsWith('/') ? `${API_BASE_URL}${sourceUrl}` : sourceUrl;
            
            if (!sound) {
                const { sound: newSound } = await Audio.Sound.createAsync(
                    { uri: fullUrl },
                    { shouldPlay: true }
                );
                setSound(newSound);
                setIsPlaying(true);
                
                newSound.setOnPlaybackStatusUpdate((status: any) => {
                    if (status.didJustFinish) {
                        setIsPlaying(false);
                    }
                });
            } else {
                if (isPlaying) {
                    await sound.pauseAsync();
                    setIsPlaying(false);
                } else {
                    await sound.playAsync();
                    setIsPlaying(true);
                }
            }
        } catch (error) {
            console.error('Audio Playback Error:', error);
        }
    };

    useEffect(() => {
        return () => {
            if (sound) {
                console.log('Unloading Sound');
                sound.unloadAsync();
            }
        };
    }, [sound]);

    return (
        <View style={styles.container}>
            {title && <Text style={styles.title}>{title}</Text>}
            <RNButton 
                title={isPlaying ? "Pause Brief" : "Play Brief"} 
                onPress={playSound} 
                color="#007AFF"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
        backgroundColor: '#F2F2F7',
        borderRadius: 15,
        marginTop: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E5EA'
    },
    title: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1C1C1E',
        marginBottom: 12
    }
});
