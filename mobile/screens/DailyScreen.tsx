import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { AudioPlayer } from '../components/ui/AudioPlayer';
import { API_BASE_URL } from '../config/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export const DailyScreen: React.FC = () => {
    const [mode, setMode] = useState<'read' | 'listen'>('listen');

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tab, mode === 'read' && styles.activeTab]}
                        onPress={() => setMode('read')}
                    >
                        <MaterialCommunityIcons name="book-open-variant" size={20} color={mode === 'read' ? '#007AFF' : '#666'} />
                        <Text style={[styles.tabText, mode === 'read' && styles.activeTabText]}>Read</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, mode === 'listen' && styles.activeTab]}
                        onPress={() => setMode('listen')}
                    >
                        <MaterialCommunityIcons name="headphones" size={20} color={mode === 'listen' ? '#007AFF' : '#666'} />
                        <Text style={[styles.tabText, mode === 'listen' && styles.activeTabText]}>Listen</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {mode === 'listen' ? (
                    <View>
                        <Text style={styles.subtitle}>
                            Listen to AI-generated summaries of today's parliamentary highlights.
                        </Text>
                        <AudioPlayer sourceUrl={`${API_BASE_URL}/audio/daily-brief?lang=en`} title="🇬🇧 English Brief" />
                        <View style={{ height: 20 }} />
                        <AudioPlayer sourceUrl={`${API_BASE_URL}/audio/daily-brief?lang=sw`} title="🇰🇪 Swahili Brief (Kiswahili)" />
                    </View>
                ) : (
                    <View style={styles.placeholderContainer}>
                        <MaterialCommunityIcons name="text-box-search-outline" size={60} color="#E5E5EA" />
                        <Text style={styles.placeholderTitle}>Text Briefs Coming Soon</Text>
                        <Text style={styles.placeholderText}>
                            We are currently finalizing the AI text summarization engine. Soon you will be able to read concise versions of all proceedings here.
                        </Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 10,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F2F2F7'
    },
    title: { fontSize: 26, fontWeight: '800', color: '#1a1a1a', letterSpacing: -0.5, marginBottom: 15 },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#F2F2F7',
        borderRadius: 12,
        padding: 4
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderRadius: 8,
        gap: 6
    },
    activeTab: { backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
    tabText: { fontSize: 15, fontWeight: '600', color: '#666' },
    activeTabText: { color: '#007AFF' },
    content: { padding: 20 },
    subtitle: { fontSize: 15, color: '#666', marginBottom: 24, lineHeight: 22 },
    placeholderContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingHorizontal: 20 },
    placeholderTitle: { fontSize: 20, fontWeight: '700', color: '#1C1C1E', marginTop: 20, marginBottom: 10 },
    placeholderText: { fontSize: 16, color: '#8E8E93', textAlign: 'center', lineHeight: 24 }
});
