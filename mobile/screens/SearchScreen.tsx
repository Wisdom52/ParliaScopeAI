import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, RefreshControl, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { Button } from '../components/ui/Button';
import { ImpactCard } from '../components/ImpactCard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Hansard {
    id: number;
    title: string;
    pdf_url: string;
    ai_summary: string | null;
    created_at: string;
}

interface Bill {
    id: number;
    title: string;
    summary: string;
    impacts: any[];
}

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    sources?: { speaker: string; preview: string; id: number }[];
}

export const SearchScreen = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [documents, setDocuments] = useState<Hansard[]>([]);
    const [docsLoading, setDocsLoading] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState<Hansard | null>(null);
    const [activeCategory, setActiveCategory] = useState<'parliament' | 'bills'>('parliament');

    // Bills State
    const [token, setToken] = useState<string | null>(null);
    const [bills, setBills] = useState<Bill[]>([]);
    const [billsLoading, setBillsLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [analyzingId, setAnalyzingId] = useState<number | null>(null);

    // Chat State
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const scrollRef = useRef<ScrollView>(null);

    const fetchDocs = async () => {
        setDocsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/docs/`);
            if (response.ok) {
                setDocuments(await response.json());
            }
        } catch (e) {
            console.error("Docs fetch failed", e);
        } finally {
            setDocsLoading(false);
            setRefreshing(false);
        }
    };

    const fetchBills = async (currentToken: string | null) => {
        if (!currentToken) return;
        setBillsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/bills/`, {
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });
            if (response.ok) {
                const data = await response.json();
                setBills(data);
            }
        } catch (error) {
            console.error("Failed to fetch bills:", error);
        } finally {
            setBillsLoading(false);
            setRefreshing(false);
        }
    };

    const handleAnalyze = async (billId: number, rawText: string) => {
        if (!token) return;
        setAnalyzingId(billId);
        try {
            const response = await fetch(`${API_BASE_URL}/bills/${billId}/analyze?raw_text=${encodeURIComponent(rawText)}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                setTimeout(() => fetchBills(token), 5000);
            }
        } catch (error) {
            console.error("Failed to start analysis:", error);
            setAnalyzingId(null);
        }
    };

    const handleSendChat = async () => {
        if (!chatInput.trim()) return;

        const userMsg: ChatMessage = { role: 'user', content: chatInput };
        setChatMessages(prev => [...prev, userMsg]);
        setChatLoading(true);
        setChatInput('');

        try {
            const response = await fetch(`${API_BASE_URL}/chat/hansard`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: userMsg.content }),
            });

            const data = await response.json();

            if (response.ok) {
                setChatMessages(prev => [...prev, {
                    role: 'assistant',
                    content: data.answer,
                    sources: data.sources
                }]);
            } else {
                setChatMessages(prev => [...prev, { role: 'assistant', content: "I couldn't find that in the transcripts. Please try another question." }]);
            }
        } catch (error) {
            setChatMessages(prev => [...prev, { role: 'assistant', content: 'Network error. Please try again.' }]);
        } finally {
            setChatLoading(false);
        }
    };

    useEffect(() => {
        fetchDocs();
        const loadInitialData = async () => {
            const storedToken = await AsyncStorage.getItem('parliaScope_token');
            setToken(storedToken);
            if (storedToken) fetchBills(storedToken);
        };
        loadInitialData();
    }, []);

    const filteredDocs = documents.filter(doc =>
        doc.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredBills = bills.filter(bill =>
        bill.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Document Hub</Text>
            </View>

            <View style={styles.searchBox}>
                <MaterialCommunityIcons name="magnify" size={20} color="#666" style={{ marginRight: 8 }} />
                <TextInput
                    style={styles.searchInput}
                    placeholder={`Filter ${activeCategory === 'parliament' ? 'Hansards' : 'Bills'}...`}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            <View style={styles.pillsContainer}>
                <TouchableOpacity
                    style={[styles.pill, activeCategory === 'parliament' && styles.pillActive]}
                    onPress={() => setActiveCategory('parliament')}
                >
                    <MaterialCommunityIcons name="file-document-outline" size={18} color={activeCategory === 'parliament' ? '#fff' : '#666'} />
                    <Text style={[styles.pillText, activeCategory === 'parliament' && styles.pillActiveText]}>Hansard</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.pill, activeCategory === 'bills' && styles.pillActive]}
                    onPress={() => setActiveCategory('bills')}
                >
                    <MaterialCommunityIcons name="gavel" size={18} color={activeCategory === 'bills' ? '#fff' : '#666'} />
                    <Text style={[styles.pillText, activeCategory === 'bills' && styles.pillActiveText]}>Bills</Text>
                </TouchableOpacity>
            </View>

            {activeCategory === 'parliament' ? (
                <FlatList
                    data={filteredDocs}
                    keyExtractor={item => item.id.toString()}
                    refreshing={docsLoading}
                    onRefresh={fetchDocs}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.docCard} onPress={() => { setSelectedDoc(item); setChatMessages([]); }}>
                            <View style={styles.docIconContainer}>
                                <MaterialCommunityIcons name="file-document-outline" size={24} color="#007AFF" />
                            </View>
                            <View style={styles.docInfo}>
                                <Text style={styles.docTitle}>{item.title}</Text>
                                <Text style={styles.docDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
                                <Text style={styles.docSnippet} numberOfLines={2}>{item.ai_summary || "Summary pending..."}</Text>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={20} color="#ccc" />
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={docsLoading ? <ActivityIndicator style={{ marginTop: 20 }} /> : <Text style={styles.emptyText}>No matching Hansards found.</Text>}
                />
            ) : (
                <FlatList
                    data={filteredBills}
                    keyExtractor={item => item.id.toString()}
                    refreshing={billsLoading}
                    onRefresh={() => fetchBills(token)}
                    renderItem={({ item }) => (
                        <View style={styles.billCard}>
                            <View style={styles.billHeader}>
                                <Text style={styles.billTitle}>{item.title}</Text>
                                <TouchableOpacity style={styles.billChatBtn} onPress={() => { setSelectedDoc({ id: item.id, title: item.title, pdf_url: '', ai_summary: item.summary, created_at: '' }); setChatMessages([]); }}>
                                    <MaterialCommunityIcons name="chat-processing" size={18} color="#007AFF" />
                                    <Text style={styles.billChatBtnText}>Chat</Text>
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.billSummary}>{item.summary}</Text>
                            {item.impacts && item.impacts.length > 0 ? (
                                item.impacts.map(impact => <ImpactCard key={impact.id} impact={impact} />)
                            ) : (
                                <View style={styles.billEmptyAnalysis}>
                                    <Button label="Initialize Impact Analysis" onPress={() => handleAnalyze(item.id, item.summary)} loading={analyzingId === item.id} />
                                </View>
                            )}
                        </View>
                    )}
                    ListEmptyComponent={billsLoading ? <ActivityIndicator style={{ marginTop: 20 }} /> : <Text style={styles.emptyText}>No matching Bills found.</Text>}
                />
            )}

            {/* Document / Bill Modal with Contextual Chat */}
            <Modal visible={!!selectedDoc} animationType="slide" presentationStyle="pageSheet">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={styles.modalTitle} numberOfLines={1}>{selectedDoc?.title}</Text>
                            <Text style={styles.modalSub}>Parliamentary AI Intelligence</Text>
                        </View>
                        <TouchableOpacity onPress={() => setSelectedDoc(null)} style={styles.modalCloseBtn}>
                            <MaterialCommunityIcons name="close" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
                        <View style={styles.summarySection}>
                            <View style={styles.sectionBadge}>
                                <MaterialCommunityIcons name="text-box-search" size={16} color="#007AFF" />
                                <Text style={styles.sectionBadgeText}>Official Summary</Text>
                            </View>
                            <Text style={styles.summaryText}>{selectedDoc?.ai_summary || "System is still generating the summary. Check back soon."}</Text>
                        </View>

                        <View style={styles.chatSection}>
                            <View style={styles.sectionBadge}>
                                <MaterialCommunityIcons name="robot" size={16} color="#10B981" />
                                <Text style={[styles.sectionBadgeText, { color: '#10B981' }]}>Contextual AI Chat</Text>
                            </View>

                            {chatMessages.length === 0 && (
                                <View style={styles.chatEmpty}>
                                    <MaterialCommunityIcons name="message-text-outline" size={32} color="#ddd" />
                                    <Text style={styles.chatEmptyText}>Ask specific questions about this document's content.</Text>
                                </View>
                            )}

                            {chatMessages.map((msg, idx) => (
                                <View key={idx} style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.botBubble]}>
                                    <Text style={[styles.msgText, msg.role === 'user' && { color: '#fff' }]}>{msg.content}</Text>
                                    {msg.sources && msg.sources.length > 0 && (
                                        <View style={styles.sourceContainer}>
                                            <Text style={styles.sourceHeader}>Cited from transcript:</Text>
                                            {msg.sources.slice(0, 1).map(s => (
                                                <Text key={s.id} style={styles.sourceItem}>"{s.preview}" — {s.speaker}</Text>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            ))}
                            {chatLoading && <ActivityIndicator color="#007AFF" style={{ alignSelf: 'flex-start', margin: 10 }} />}
                        </View>
                    </ScrollView>

                    <View style={styles.chatInputRow}>
                        <TextInput
                            style={styles.chatInput}
                            placeholder="Type a question..."
                            value={chatInput}
                            onChangeText={setChatInput}
                            onSubmitEditing={handleSendChat}
                        />
                        <TouchableOpacity style={styles.sendBtn} onPress={handleSendChat} disabled={chatLoading || !chatInput.trim()}>
                            <MaterialCommunityIcons name="send" size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff', paddingTop: Platform.OS === 'ios' ? 60 : 20, paddingHorizontal: 20 },
    header: { marginBottom: 15 },
    headerTitle: { fontSize: 28, fontWeight: '900', color: '#1a1a1a', letterSpacing: -1 },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: 15,
        paddingHorizontal: 15,
        height: 50,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#eee'
    },
    searchInput: { flex: 1, fontSize: 16, color: '#1a1a1a' },
    pillsContainer: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 25, backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#eee' },
    pillActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
    pillText: { fontSize: 14, fontWeight: '700', color: '#666' },
    pillActiveText: { color: '#fff' },
    docCard: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: '#f0f0f0', shadowColor: '#000', shadowOpacity: 0.02, elevation: 1 },
    docIconContainer: { width: 45, height: 45, borderRadius: 12, backgroundColor: '#F0F7FF', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    docInfo: { flex: 1 },
    docTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 2 },
    docDate: { fontSize: 12, color: '#888', marginBottom: 6 },
    docSnippet: { fontSize: 13, color: '#666', lineHeight: 18 },
    emptyText: { textAlign: 'center', color: '#999', marginTop: 50 },
    billCard: { padding: 20, borderRadius: 20, backgroundColor: '#fff', marginBottom: 20, borderWidth: 1, borderColor: '#f0f0f0' },
    billHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
    billTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#1a1a1a', marginRight: 10 },
    billChatBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8, backgroundColor: '#F0F7FF', borderRadius: 10 },
    billChatBtnText: { fontSize: 12, fontWeight: '700', color: '#007AFF' },
    billSummary: { fontSize: 14, color: '#444', lineHeight: 22, marginBottom: 15 },
    billEmptyAnalysis: { padding: 20, backgroundColor: '#f9f9f9', borderRadius: 15, alignItems: 'center' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    modalTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a', maxWidth: '85%' },
    modalSub: { fontSize: 11, fontWeight: '700', color: '#007AFF', textTransform: 'uppercase', marginTop: 2 },
    modalCloseBtn: { padding: 8 },
    summarySection: { marginBottom: 30 },
    sectionBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    sectionBadgeText: { fontSize: 12, fontWeight: '800', color: '#007AFF', textTransform: 'uppercase', letterSpacing: 0.5 },
    summaryText: { fontSize: 15, lineHeight: 24, color: '#333' },
    chatSection: { borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 25 },
    chatEmpty: { alignItems: 'center', marginTop: 20, opacity: 0.5 },
    chatEmptyText: { fontSize: 13, color: '#666', textAlign: 'center', marginTop: 10 },
    bubble: { padding: 15, borderRadius: 18, marginBottom: 15, maxWidth: '85%' },
    userBubble: { backgroundColor: '#007AFF', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
    botBubble: { backgroundColor: '#f1f1f1', alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
    msgText: { fontSize: 15, lineHeight: 22, color: '#1a1a1a' },
    sourceContainer: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
    sourceHeader: { fontSize: 10, fontWeight: '800', color: '#666', textTransform: 'uppercase', marginBottom: 4 },
    sourceItem: { fontSize: 11, fontStyle: 'italic', color: '#666' },
    chatInputRow: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f0f0f0' },
    chatInput: { flex: 1, height: 48, backgroundColor: '#f5f5f5', borderRadius: 24, paddingHorizontal: 20, fontSize: 15, color: '#1a1a1a', marginRight: 10 },
    sendBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center' }
});

