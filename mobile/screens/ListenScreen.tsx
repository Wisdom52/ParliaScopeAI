import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { AudioPlayer } from '../components/ui/AudioPlayer';
import { API_BASE_URL } from '../config/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export const ListenScreen: React.FC = () => {
    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <Text style={styles.title}>Daily Audio Brief</Text>
                <MaterialCommunityIcons name="headphones" size={24} color="#007AFF" />
            </View>
            <Text style={styles.subtitle}>
                Listen to AI-generated summaries of today's parliamentary highlights.
            </Text>

            <AudioPlayer sourceUrl={`${API_BASE_URL}/audio/daily-brief?lang=en`} title="🇬🇧 English Brief" />
            <View style={{ height: 20 }} />
            <AudioPlayer sourceUrl={`${API_BASE_URL}/audio/daily-brief?lang=sw`} title="🇰🇪 Swahili Brief (Kiswahili)" />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    content: { padding: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    title: { fontSize: 24, fontWeight: '800', color: '#1a1a1a', letterSpacing: -0.5 },
    subtitle: { fontSize: 15, color: '#666', marginBottom: 24, lineHeight: 22 },
});
