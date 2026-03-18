import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, RefreshControl, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { Button } from '../components/ui/Button';
import { ImpactCard } from '../components/ImpactCard';
import { AudioPlayer } from '../components/ui/AudioPlayer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Hansard {
    id: number;
    title: string;
    pdf_url: string;
    ai_summary: string | null;
    date: string | null;
    created_at: string;
}

interface Bill {
    id: number;
    title: string;
    summary: string;
    date: string | null;
    document_url: string;
    impacts: any[];
}

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    sources?: { speaker: string; preview: string; id: number }[];
}

interface FactShieldSource {
    id: number;
    title: string;
    type: string;
    preview: string;
}

interface FactShieldResult {
    status: string;
    analysis: string;
    sources: FactShieldSource[];
}

export const SearchScreen = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [documents, setDocuments] = useState<Hansard[]>([]);
    const [docsLoading, setDocsLoading] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState<any>(null);
    const [activeCategory, setActiveCategory] = useState<'parliament' | 'bills' | 'shield'>('parliament');

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

    // Fact Check State
    const [factClaim, setFactClaim] = useState('');
    const [factUrl, setFactUrl] = useState('');
    const [factResult, setFactResult] = useState<FactShieldResult | null>(null);
    const [factLoading, setFactLoading] = useState(false);

    // Audio-First Engagement State
    const [audioData, setAudioData] = useState<{ en: string, sw: string } | null>(null);
    const [loadingAudio, setLoadingAudio] = useState(false);

    const scrollRef = useRef<ScrollView>(null);

    const fetchDocs = async () => {
        setDocsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/hansards/`);
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

    const fetchAudio = async (docId: number, docType: 'hansard' | 'bill') => {
        if (audioData) return;
        setLoadingAudio(true);
        try {
            const [enRes, swRes] = await Promise.all([
                fetch(`${API_BASE_URL}/audio/daily-brief?item_id=${docId}&item_type=${docType}&lang=en`),
                fetch(`${API_BASE_URL}/audio/daily-brief?item_id=${docId}&item_type=${docType}&lang=sw`)
            ]);
            if (enRes.ok && swRes.ok) {
                const enData = await enRes.json();
                const swData = await swRes.json();
                if (enData.audio_url && swData.audio_url) {
                    setAudioData({ en: enData.audio_url, sw: swData.audio_url });
                }
            }
        } catch (err) {
            console.error("Failed to load audio", err);
        } finally {
            setLoadingAudio(false);
        }
    };

    const fetchBills = async () => {
        setBillsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/bills/`);
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
                setTimeout(() => fetchBills(), 5000);
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
            const docId = selectedDoc?.id;
            const docType = activeCategory === 'bills' ? 'bill' : 'hansard';
            const response = await fetch(`${API_BASE_URL}/chat/document`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: userMsg.content, document_id: docId, doc_type: docType }),
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

    const handleFactCheck = async () => {
        if (!factClaim.trim() && !factUrl.trim()) return;
        setFactLoading(true);
        setFactResult(null);
        try {
            const response = await fetch(`${API_BASE_URL}/fact-shield/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: factUrl, claim_text: factClaim }),
            });
            if (response.ok) {
                setFactResult(await response.json());
            }
        } catch (error) {
            console.error("Fact check failed", error);
        } finally {
            setFactLoading(false);
        }
    };

    useEffect(() => {
        fetchDocs();
        fetchBills();
        const loadInitialData = async () => {
            const storedToken = await AsyncStorage.getItem('parliaScope_token');
            setToken(storedToken);
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
                <TouchableOpacity
                    style={[styles.pill, activeCategory === 'shield' && styles.pillActive]}
                    onPress={() => setActiveCategory('shield')}
                >
                    <MaterialCommunityIcons name="shield" size={18} color={activeCategory === 'shield' ? '#fff' : '#666'} />
                    <Text style={[styles.pillText, activeCategory === 'shield' && styles.pillActiveText]}>Shield</Text>
                </TouchableOpacity>
            </View>

            {activeCategory === 'parliament' ? (
                <FlatList
                    data={filteredDocs}
                    keyExtractor={item => item.id.toString()}
                    refreshing={docsLoading}
                    onRefresh={fetchDocs}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.docCard} onPress={() => { setSelectedDoc(item); setChatMessages([]); setAudioData(null); }}>
                            <View style={styles.docIconContainer}>
                                <MaterialCommunityIcons name="file-document-outline" size={24} color="#007AFF" />
                            </View>
                            <View style={styles.docInfo}>
                                <Text style={styles.docTitle}>{item.title}</Text>
                                <Text style={styles.docDate}>{item.date ? new Date(item.date).toLocaleDateString() : 'N/A'}</Text>
                                <Text style={styles.docSnippet} numberOfLines={2}>{item.ai_summary || "Summary pending..."}</Text>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={20} color="#ccc" />
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={docsLoading ? <ActivityIndicator style={{ marginTop: 20 }} /> : <Text style={styles.emptyText}>No matching Hansards found.</Text>}
                />
            ) : activeCategory === 'bills' ? (
                <FlatList
                    data={filteredBills}
                    keyExtractor={item => item.id.toString()}
                    refreshing={billsLoading}
                    onRefresh={() => fetchBills()}
                    renderItem={({ item }) => (
                        <TouchableOpacity 
                            style={styles.docCard} 
                            onPress={() => { 
                                setSelectedDoc({
                                    ...item,
                                    ai_summary: item.summary,
                                    pdf_url: item.document_url || ''
                                }); 
                                setChatMessages([]); 
                                setAudioData(null); 
                            }}
                        >
                            <View style={[styles.docIconContainer, { backgroundColor: '#F0FFF7' }]}>
                                <MaterialCommunityIcons name="gavel" size={24} color="#10B981" />
                            </View>
                            <View style={styles.docInfo}>
                                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2}}>
                                    <Text style={[styles.docTitle, {flex: 1, marginRight: 8}]}>{item.title}</Text>
                                    <View style={{alignItems: 'flex-end'}}>
                                      <View style={{ backgroundColor: '#f0fdf4', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, marginBottom: 2}}>
                                        <Text style={{fontSize: 10, color: '#888', fontWeight: 'bold'}}>Bill</Text>
                                      </View>
                                    </View>
                                </View>
                                <Text style={styles.docDate}>{item.date ? new Date(item.date).toLocaleDateString() : 'N/A'}</Text>
                                <Text style={styles.docSnippet} numberOfLines={2}>{item.summary || "Analysis pending..."}</Text>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={20} color="#ccc" />
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={billsLoading ? <ActivityIndicator style={{ marginTop: 20 }} /> : <Text style={styles.emptyText}>No matching Bills found.</Text>}
                />
            ) : (
                <ScrollView contentContainerStyle={styles.shieldSection}>
                    <View style={styles.shieldHeader}>
                        <MaterialCommunityIcons name="shield-search" size={32} color="#007AFF" />
                        <Text style={styles.shieldTitle}>Fact-Shield Hub</Text>
                        <Text style={styles.shieldSub}>AI Verification Engine</Text>
                    </View>

                    <View style={styles.shieldInputCard}>
                        <Text style={styles.inputLabel}>Parliamentary Video or Article Link</Text>
                        <TextInput
                            style={styles.shieldInput}
                            placeholder="Paste YouTube link here..."
                            value={factUrl}
                            onChangeText={setFactUrl}
                        />

                        <Text style={[styles.inputLabel, { marginTop: 15 }]}>What are we verifying?</Text>
                        <TextInput
                            style={[styles.shieldInput, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
                            placeholder="Explain the claim you want to verify..."
                            multiline
                            value={factClaim}
                            onChangeText={setFactClaim}
                        />

                        <TouchableOpacity
                            style={[styles.shieldButton, (factLoading || (!factClaim && !factUrl)) && { opacity: 0.6 }]}
                            onPress={handleFactCheck}
                            disabled={factLoading || (!factClaim && !factUrl)}
                        >
                            {factLoading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <MaterialCommunityIcons name="check-decagram" size={20} color="#fff" />
                                    <Text style={styles.shieldButtonText}>Verify Claim</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                    {factResult && (
                        <View style={styles.resultCard}>
                            <View style={styles.resultHeader}>
                                <View style={[
                                    styles.statusBadge,
                                    factResult.status === 'Verified' ? styles.statusVerified :
                                        factResult.status === 'Unverified' ? styles.statusUnverified : styles.statusMixed
                                ]}>
                                    <Text style={[
                                        styles.statusText,
                                        factResult.status === 'Verified' ? styles.statusVerifiedText :
                                            factResult.status === 'Unverified' ? styles.statusUnverifiedText : styles.statusMixedText
                                    ]}>{factResult.status}</Text>
                                </View>
                                <Text style={styles.resultTitle}>Assessment</Text>
                            </View>

                            <Text style={styles.resultAnalysis}>{factResult.analysis}</Text>

                            {factResult.sources && factResult.sources.length > 0 && (
                                <View style={styles.sourcesSection}>
                                    <Text style={styles.sourcesHeader}>Supporting Records:</Text>
                                    {factResult.sources.map(source => (
                                        <View key={source.id} style={styles.shieldSourceItem}>
                                            <Text style={styles.sourceTitle}>{source.title}</Text>
                                            <Text style={styles.sourcePreview} numberOfLines={2}>"{source.preview}"</Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    )}
                </ScrollView>
            )}

            {/* Document / Bill Modal with Contextual Chat */}
            <Modal visible={!!selectedDoc} animationType="slide" presentationStyle="pageSheet">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={styles.modalTitle} numberOfLines={1}>{selectedDoc?.title}</Text>
                            <Text style={styles.modalSub}>Parliamentary AI Intelligence</Text>
                        </View>
                        <TouchableOpacity onPress={() => { setSelectedDoc(null); setAudioData(null); }} style={styles.modalCloseBtn}>
                            <MaterialCommunityIcons name="close" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
                        <View style={styles.summarySection}>
                            <View style={styles.sectionBadge}>
                                <MaterialCommunityIcons name="text-box-search" size={16} color="#007AFF" />
                                <Text style={styles.sectionBadgeText}>Official Summary</Text>
                            </View>
                            {selectedDoc?.ai_summary ? (
                                selectedDoc.ai_summary.split('\n').map((line: string, i: number) => {
                                    if (!line.trim() || line.trim() === '---') return <View key={i} style={{ height: 8 }} />;

                                    // Port Section Header Logic from Web
                                    const isSectionHeader = (t: string) => {
                                        return t === t.toUpperCase() && t.length > 3 && /[A-Z]/.test(t) && !/^\d/.test(t);
                                    };

                                    // Port Sub-Label Logic from Web
                                    const isSubLabel = (t: string) => {
                                        return /^[A-Z][A-Za-z\s]+:\s/.test(t);
                                    };

                                    const t = line.trim();
                                    
                                    if (isSectionHeader(t)) {
                                        return (
                                            <Text key={i} style={{ fontSize: 15, fontWeight: '800', color: '#1e293b', marginTop: i === 0 ? 0 : 20, marginBottom: 8, borderBottomWidth: 2, borderBottomColor: '#007AFF', paddingBottom: 4 }}>
                                                {t}
                                            </Text>
                                        );
                                    }

                                    if (isSubLabel(t)) {
                                        const colonIdx = t.indexOf(':');
                                        const label = t.slice(0, colonIdx);
                                        const rest = t.slice(colonIdx + 1);
                                        return (
                                            <Text key={i} style={[styles.summaryText, { marginBottom: 6 }]}>
                                                <Text style={{ fontWeight: '800' }}>{label}:</Text>{rest}
                                            </Text>
                                        );
                                    }

                                    return (
                                        <Text key={i} style={[styles.summaryText, { marginBottom: 6 }]}>
                                            {t}
                                        </Text>
                                    );
                                })
                            ) : (
                                <Text style={[styles.summaryText, { color: '#94a3b8', fontStyle: 'italic' }]}>
                                    System is still generating the summary. Check back soon.
                                </Text>
                            )}
                            
                            {/* Bill Specific Impacts Section - Moved to Modal */}
                            {activeCategory === 'bills' && selectedDoc && (
                                <View style={{ marginTop: 20 }}>
                                    <View style={[styles.sectionBadge, { marginBottom: 15 }]}>
                                        <MaterialCommunityIcons name="gavel" size={16} color="#10B981" />
                                        <Text style={[styles.sectionBadgeText, { color: '#10B981' }]}>Impact Analysis</Text>
                                    </View>
                                    {selectedDoc.impacts && selectedDoc.impacts.length > 0 ? (
                                        selectedDoc.impacts.map((impact: any) => <ImpactCard key={impact.id} impact={impact} />)
                                    ) : (
                                        <View style={styles.billEmptyAnalysis}>
                                            <Button 
                                                label="Initialize Impact Analysis" 
                                                onPress={() => handleAnalyze(selectedDoc.id, selectedDoc.ai_summary)} 
                                                loading={analyzingId === selectedDoc.id} 
                                            />
                                        </View>
                                    )}
                                </View>
                            )}
                            
                            {selectedDoc?.pdf_url && (
                                <View style={styles.sourceTag}>
                                    <Text style={styles.sourceTagText}>AI-Generated Summary — Always verify against official source.</Text>
                                    <TouchableOpacity onPress={() => {/* Linking could be added if needed but strictly porting web text */}}>
                                        <Text style={styles.sourceLink}> parliament.go.ke Source</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* Audio-First Engagement UI - Ported from Web */}
                            <View style={styles.audioEngagementContainer}>
                                <Text style={styles.audioEngagementTitle}>Audio-First Engagement</Text>
                                {!audioData ? (
                                    <Button 
                                        label={loadingAudio ? "Generating Briefs..." : "Listen to Audio Summary"} 
                                        onPress={() => fetchAudio(selectedDoc!.id, activeCategory === 'bills' ? 'bill' : 'hansard')} 
                                        loading={loadingAudio} 
                                    />
                                ) : (
                                    <View style={styles.audioPlayers}>
                                        <AudioPlayer sourceUrl={audioData.en} title="🇬🇧 English Brief" />
                                        <AudioPlayer sourceUrl={audioData.sw} title="🇰🇪 Kiswahili Brief" />
                                    </View>
                                )}
                            </View>
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
    sendBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center' },

    // Web Parity Styles
    sourceTag: { marginTop: 20, padding: 12, backgroundColor: '#F0F7FF', borderRadius: 10, borderLeftWidth: 4, borderLeftColor: '#007AFF' },
    sourceTagText: { fontSize: 12, color: '#444', fontStyle: 'italic' },
    sourceLink: { fontSize: 13, color: '#007AFF', fontWeight: '700', marginTop: 4, textDecorationLine: 'underline' },
    audioEngagementContainer: { marginTop: 30, padding: 20, backgroundColor: '#fff', borderRadius: 15, borderWidth: 1, borderColor: '#eee' },
    audioEngagementTitle: { fontSize: 16, fontWeight: '800', color: '#1a1a1a', marginBottom: 15 },
    audioPlayers: { gap: 10 },

    // Shield Styles
    shieldSection: { padding: 20, paddingBottom: 100 },
    shieldHeader: { alignItems: 'center', marginBottom: 25 },
    shieldTitle: { fontSize: 24, fontWeight: '900', color: '#1a1a1a', marginTop: 10 },
    shieldSub: { fontSize: 12, fontWeight: '700', color: '#007AFF', textTransform: 'uppercase' },
    shieldInputCard: { padding: 20, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#f0f0f0', shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
    inputLabel: { fontSize: 13, fontWeight: '700', color: '#666', marginBottom: 8 },
    shieldInput: { backgroundColor: '#f9f9f9', borderRadius: 12, paddingHorizontal: 15, height: 50, fontSize: 14, color: '#1a1a1a', borderWidth: 1, borderColor: '#eee' },
    shieldButton: { backgroundColor: '#007AFF', height: 50, borderRadius: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20 },
    shieldButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    resultCard: { marginTop: 25, padding: 20, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#f0f0f0' },
    resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 15 },
    resultTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    statusText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
    statusVerified: { backgroundColor: '#dcfce7' },
    statusVerifiedText: { color: '#166534' },
    statusUnverified: { backgroundColor: '#fee2e2' },
    statusUnverifiedText: { color: '#991b1b' },
    statusMixed: { backgroundColor: '#fef9c3' },
    statusMixedText: { color: '#854d0e' },
    resultAnalysis: { fontSize: 15, lineHeight: 24, color: '#334155' },
    sourcesSection: { marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
    sourcesHeader: { fontSize: 12, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: 12 },
    shieldSourceItem: { marginBottom: 15, padding: 12, backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#edf2f7' },
    sourceTitle: { fontSize: 13, fontWeight: '700', color: '#007AFF', marginBottom: 4 },
    sourcePreview: { fontSize: 12, color: '#666', fontStyle: 'italic' }
});

