import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button as RNButton } from 'react-native';
import { Audio } from 'expo-av';

interface AudioPlayerProps {
    sourceUrl: string;
    title?: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ sourceUrl, title }) => {
    const [sound, setSound] = useState<Audio.Sound>();
    const [isPlaying, setIsPlaying] = useState(false);

    async function playSound() {
        console.log('Loading Sound');
        if (!sound) {
            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: sourceUrl }
            );
            setSound(newSound);
            console.log('Playing Sound');
            await newSound.playAsync();
            setIsPlaying(true);
        } else {
            if (isPlaying) {
                await sound.pauseAsync();
                setIsPlaying(false);
            } else {
                await sound.playAsync();
                setIsPlaying(true);
            }
        }
    }

    useEffect(() => {
        return sound
            ? () => {
                console.log('Unloading Sound');
                sound.unloadAsync();
            }
            : undefined;
    }, [sound]);

    return (
        <View style={styles.container}>
            {title && <Text style={styles.title}>{title}</Text>}
            <RNButton title={isPlaying ? "Pause Brief" : "Play Brief"} onPress={playSound} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
        backgroundColor: '#eee',
        borderRadius: 10,
        marginTop: 20,
        alignItems: 'center'
    },
    title: {
        fontWeight: 'bold',
        marginBottom: 10
    }
});
