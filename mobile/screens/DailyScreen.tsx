import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { AudioPlayer } from '../components/ui/AudioPlayer';
import { API_BASE_URL } from '../config/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export const DailyScreen: React.FC = () => {
    const [mode, setMode] = useState<'read' | 'listen'>('listen');
    const [briefItems, setBriefItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [listenData, setListenData] = useState<{ en: any, sw: any }>({ en: null, sw: null });
    const [detail, setDetail] = useState<any | null>(null);

    React.useEffect(() => {
        fetchBriefList();
    }, []);

    const fetchBriefList = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/audio/daily-brief/list`);
            const data = await res.json();
            const items = data.items || [];
            setBriefItems(items);
            
            // Automatically fetch audio for the first item for the "Listen" mode
            if (items.length > 0) {
                const first = items[0];
                const [enRes, swRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/audio/daily-brief?item_id=${first.id}&item_type=${first.type}&lang=en`),
                    fetch(`${API_BASE_URL}/audio/daily-brief?item_id=${first.id}&item_type=${first.type}&lang=sw`)
                ]);
                if (enRes.ok && swRes.ok) {
                    setListenData({
                        en: await enRes.json(),
                        sw: await swRes.json()
                    });
                }
            }
        } catch (err) {
            console.error("Failed to fetch brief list", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchItemDetail = async (item: any) => {
        setSelectedItem(item);
        setDetailLoading(true);
        setDetail(null);
        try {
            const res = await fetch(`${API_BASE_URL}/audio/daily-brief?item_id=${item.id}&item_type=${item.type}&lang=en`);
            const data = await res.json();
            setDetail(data);
        } catch (err) {
            console.error("Failed to fetch brief item detail", err);
        } finally {
            setDetailLoading(false);
        }
    };

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
                        {listenData.en ? (
                            <AudioPlayer sourceUrl={listenData.en.audio_url} title="🇬🇧 English Brief" />
                        ) : (
                            <ActivityIndicator size="small" color="#007AFF" />
                        )}
                        <View style={{ height: 20 }} />
                        {listenData.sw ? (
                            <AudioPlayer sourceUrl={listenData.sw.audio_url} title="🇰🇪 Swahili Brief (Kiswahili)" />
                        ) : (
                            <ActivityIndicator size="small" color="#007AFF" />
                        )}
                    </View>
                ) : (
                    <View>
                        {selectedItem ? (
                            <View>
                                <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedItem(null)}>
                                    <MaterialCommunityIcons name="chevron-left" size={24} color="#007AFF" />
                                    <Text style={styles.backBtnText}>Back to List</Text>
                                </TouchableOpacity>
                                <Text style={styles.detailTitle}>{selectedItem.title}</Text>
                                <View style={styles.divider} />
                                {detailLoading ? (
                                    <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 40 }} />
                                ) : (
                                    <View>
                                        <Text style={styles.transcriptText}>{detail?.transcript || "No transcript available for this item."}</Text>
                                    </View>
                                )}
                            </View>
                        ) : (
                            <View>
                                <Text style={styles.subtitle}>
                                    Concise AI-generated text summaries of recent proceedings.
                                </Text>
                                {loading ? (
                                    <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
                                ) : briefItems.length === 0 ? (
                                    <View style={styles.placeholderContainer}>
                                        <MaterialCommunityIcons name="text-box-search-outline" size={60} color="#E5E5EA" />
                                        <Text style={styles.placeholderTitle}>No Briefs Today</Text>
                                        <Text style={styles.placeholderText}>Check back later for today's highlights.</Text>
                                    </View>
                                ) : (
                                    briefItems.map((item, idx) => (
                                        <TouchableOpacity key={idx} style={styles.briefCard} onPress={() => fetchItemDetail(item)}>
                                            <View style={styles.briefIcon}>
                                                <MaterialCommunityIcons name={item.type === 'bill' ? 'gavel' : 'file-document'} size={24} color="#007AFF" />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.briefTitle}>{item.title}</Text>
                                                <Text style={styles.briefType}>{item.type.toUpperCase()}</Text>
                                            </View>
                                            <MaterialCommunityIcons name="chevron-right" size={24} color="#C7C7CC" />
                                        </TouchableOpacity>
                                    ))
                                )}
                            </View>
                        )}
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
    backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    backBtnText: { marginLeft: 5, color: '#007AFF', fontSize: 16, fontWeight: '600' },
    detailTitle: { fontSize: 24, fontWeight: '800', color: '#1C1C1E', marginBottom: 10 },
    divider: { height: 1, backgroundColor: '#E5E5EA', marginBottom: 20 },
    transcriptText: { fontSize: 16, lineHeight: 24, color: '#3A3A3C' },
    briefCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        backgroundColor: '#fff',
        borderRadius: 15,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E5EA',
    },
    briefIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F2F2F7',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    briefTitle: { fontSize: 16, fontWeight: '700', color: '#1C1C1E', marginBottom: 2 },
    briefType: { fontSize: 10, fontWeight: '800', color: '#8E8E93', letterSpacing: 0.5 },
    placeholderContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingHorizontal: 20 },
    placeholderTitle: { fontSize: 20, fontWeight: '700', color: '#1C1C1E', marginTop: 20, marginBottom: 10 },
    placeholderText: { fontSize: 16, color: '#8E8E93', textAlign: 'center', lineHeight: 24 }
});
