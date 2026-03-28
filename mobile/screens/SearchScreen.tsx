import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, RefreshControl, KeyboardAvoidingView, Platform, Modal, Alert } from 'react-native';
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
    matching_topics?: string[];
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

const MemoizedChatInput = React.memo(({ onSend, disabled }: { onSend: (msg: string) => void; disabled: boolean }) => {
    const [input, setInput] = useState('');
    const submit = () => {
        if (input.trim() && !disabled) {
            onSend(input);
            setInput('');
        }
    };
    return (
        <View style={styles.chatInputRow}>
            <TextInput
                style={styles.chatInput}
                placeholder="Type a question..."
                value={input}
                onChangeText={setInput}
                onSubmitEditing={submit}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={submit} disabled={disabled || !input.trim()}>
                <MaterialCommunityIcons name="send" size={20} color="#fff" />
            </TouchableOpacity>
        </View>
    );
});

const MemoizedFactShieldInput = React.memo(({ onVerify, loading }: { onVerify: (url: string, claim: string) => void; loading: boolean }) => {
    const [url, setUrl] = useState('');
    const [claim, setClaim] = useState('');
    return (
        <View style={styles.shieldInputCard}>
            <Text style={styles.inputLabel}>Parliamentary Video or Article Link</Text>
            <TextInput
                style={styles.shieldInput}
                placeholder="Paste YouTube link here..."
                value={url}
                onChangeText={setUrl}
            />

            <Text style={[styles.inputLabel, { marginTop: 15 }]}>What are we verifying?</Text>
            <TextInput
                style={[styles.shieldInput, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
                placeholder="Explain the claim you want to verify..."
                multiline
                value={claim}
                onChangeText={setClaim}
            />

            <TouchableOpacity
                style={[styles.shieldButton, (loading || (!claim && !url)) && { opacity: 0.6 }]}
                onPress={() => onVerify(url, claim)}
                disabled={loading || (!claim && !url)}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <>
                        <MaterialCommunityIcons name="check-decagram" size={20} color="#fff" />
                        <Text style={styles.shieldButtonText}>Verify Claim</Text>
                    </>
                )}
            </TouchableOpacity>
        </View>
    );
});

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
    
    // Personalized Impact State
    const [personalImpact, setPersonalImpact] = useState<any>(null);
    const [loadingPersonal, setLoadingPersonal] = useState(false);
    const [cachedImpacts, setCachedImpacts] = useState<Record<string, any>>({});
    const [selectedBillForImpact, setSelectedBillForImpact] = useState<{ id: number; title: string; topic: string } | null>(null);

    // Chat State
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatLoading, setChatLoading] = useState(false);

    // Fact Check State
    const [factResult, setFactResult] = useState<FactShieldResult | null>(null);
    const [factLoading, setFactLoading] = useState(false);

    // Audio-First Engagement State
    const [audioData, setAudioData] = useState<{ en: string, sw: string } | null>(null);
    const [loadingAudio, setLoadingAudio] = useState(false);
    const [audioLang, setAudioLang] = useState<'en' | 'sw'>('en');

    const scrollRef = useRef<ScrollView>(null);

    const fetchDocs = async (query = '') => {
        setDocsLoading(true);
        try {
            const currentToken = token || await AsyncStorage.getItem('parliaScope_token');
            const headers: Record<string, string> = {};
            if (currentToken) headers['Authorization'] = `Bearer ${currentToken}`;
            
            const response = await fetch(`${API_BASE_URL}/hansards/?q=${encodeURIComponent(query)}`, {
                headers
            });
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
            const currentToken = token || await AsyncStorage.getItem('parliaScope_token');
            const headers: Record<string, string> = {};
            if (currentToken) headers['Authorization'] = `Bearer ${currentToken}`;

            const [enRes, swRes] = await Promise.all([
                fetch(`${API_BASE_URL}/audio/daily-brief?item_id=${docId}&item_type=${docType}&lang=en`, { headers }),
                fetch(`${API_BASE_URL}/audio/daily-brief?item_id=${docId}&item_type=${docType}&lang=sw`, { headers })
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

    const fetchBills = async (query = '') => {
        setBillsLoading(true);
        try {
            const currentToken = token || await AsyncStorage.getItem('parliaScope_token');
            const headers: Record<string, string> = {};
            if (currentToken) headers['Authorization'] = `Bearer ${currentToken}`;

            const response = await fetch(`${API_BASE_URL}/bills/?q=${encodeURIComponent(query)}`, {
                headers
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

    const handlePersonalImpact = async (billId: number, billTitle: string, topic: string) => {
        if (!token) {
            Alert.alert("Authentication Required", "Please log in to use personalized tracking.");
            return;
        }
        
        const cacheKey = `${billId}_${topic}`;
        setSelectedBillForImpact({ id: billId, title: billTitle, topic });

        // Check cache first
        if (cachedImpacts[cacheKey]) {
            setPersonalImpact(cachedImpacts[cacheKey]);
            setLoadingPersonal(false);
            return;
        }

        setLoadingPersonal(true);
        setPersonalImpact(null);

        try {
            const currentToken = token || await AsyncStorage.getItem('parliaScope_token');
            const headers: Record<string, string> = {};
            if (currentToken) headers['Authorization'] = `Bearer ${currentToken}`;

            const res = await fetch(`${API_BASE_URL}/bills/${billId}/personalized-impact?topic=${encodeURIComponent(topic)}`, {
                headers
            });
            
            if (res.ok) {
                const data = await res.json();
                setPersonalImpact(data);
                // Store in cache
                setCachedImpacts(prev => ({ ...prev, [cacheKey]: data }));
            } else {
                setPersonalImpact({ explanation: "Analysis could not be generated at this time. Please try again later.", sentiment: "Neutral" });
            }
        } catch (e) {
            console.error(e);
            setPersonalImpact({ explanation: "Connection error. Verify your internet and try again.", sentiment: "Neutral" });
        } finally {
            setLoadingPersonal(false);
        }
    };

    const handleSendChat = async (message: string) => {
        if (!message.trim()) return;

        const userMsg: ChatMessage = { role: 'user', content: message };
        setChatMessages(prev => [...prev, userMsg]);
        setChatLoading(true);

        try {
            const docId = selectedDoc?.id;
            const docType = activeCategory === 'bills' ? 'bill' : 'hansard';
            
            const currentToken = token || await AsyncStorage.getItem('parliaScope_token');
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (currentToken) headers['Authorization'] = `Bearer ${currentToken}`;

            const response = await fetch(`${API_BASE_URL}/chat/document`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ query: userMsg.content, document_id: docId, doc_type: docType }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                setChatMessages(prev => [...prev, { role: 'assistant', content: `Error: ${errorData.detail || "I couldn't process that request."}` }]);
                return;
            }

            // Mobile fetch doesn't support streaming well. 
            // We read the entire response as text and parse the NDJSON lines.
            const fullText = await response.text();
            const lines = fullText.split('\n').filter(line => line.trim() !== '');
            
            let assistantAnswer = '';
            let assistantSources = [];

            for (const line of lines) {
                try {
                    const parsed = JSON.parse(line);
                    if (parsed.type === 'sources') {
                        assistantSources = parsed.data;
                    } else if (parsed.type === 'chunk') {
                        assistantAnswer += parsed.data;
                    }
                } catch (parseError) {
                    console.warn("Failed to parse NDJSON line:", line);
                }
            }

            if (assistantAnswer) {
                setChatMessages(prev => [...prev, {
                    role: 'assistant',
                    content: assistantAnswer,
                    sources: assistantSources
                }]);
            } else {
                setChatMessages(prev => [...prev, { role: 'assistant', content: "I couldn't find specific information in this document to answer that question." }]);
            }

        } catch (error) {
            console.error("Chat error:", error);
            setChatMessages(prev => [...prev, { role: 'assistant', content: 'Network error. Please try again.' }]);
        } finally {
            setChatLoading(false);
        }
    };

    const handleFactCheck = async (url: string, claim: string) => {
        if (!claim.trim() && !url.trim()) return;
        setFactLoading(true);
        setFactResult(null);
        try {
            const currentToken = token || await AsyncStorage.getItem('parliaScope_token');
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (currentToken) headers['Authorization'] = `Bearer ${currentToken}`;

            const response = await fetch(`${API_BASE_URL}/fact-shield/verify`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ url: url, claim_text: claim }),
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
        const loadInitialData = async () => {
            const storedToken = await AsyncStorage.getItem('parliaScope_token');
            setToken(storedToken);
        };
        loadInitialData();
    }, []);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (activeCategory === 'parliament') {
                fetchDocs(searchQuery);
            } else if (activeCategory === 'bills') {
                fetchBills(searchQuery);
            }
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [searchQuery, activeCategory]);

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
                    data={documents}
                    keyExtractor={item => item.id.toString()}
                    refreshing={docsLoading}
                    onRefresh={fetchDocs}
                    renderItem={({ item, index }) => (
                        <TouchableOpacity style={[styles.docCard, index === 0 && styles.newestCard]} onPress={() => { setSelectedDoc(item); setChatMessages([]); setAudioData(null); }}>
                             {index === 0 && (
                                <View style={styles.newestBadge}>
                                    <View style={styles.greenDot} />
                                    <Text style={styles.newestText}>NEWEST</Text>
                                </View>
                            )}
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
                    data={bills}
                    keyExtractor={item => item.id.toString()}
                    refreshing={billsLoading}
                    onRefresh={() => fetchBills()}
                    renderItem={({ item, index }) => (
                        <TouchableOpacity 
                            style={[styles.docCard, index === 0 && styles.newestCard]} 
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
                            {index === 0 && (
                                <View style={styles.newestBadge}>
                                    <View style={styles.greenDot} />
                                    <Text style={styles.newestText}>NEWEST</Text>
                                </View>
                            )}
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
                                
                                {item.matching_topics && item.matching_topics.length > 0 && (
                                    <View style={styles.topicPillsContainer}>
                                        {item.matching_topics.map((topic: string, idx: number) => (
                                            <TouchableOpacity 
                                                key={idx} 
                                                style={styles.topicPill}
                                                onPress={(e) => {
                                                    // Prevent card click from opening main bill modal
                                                    e.stopPropagation();
                                                    handlePersonalImpact(item.id, item.title, topic);
                                                }}
                                            >
                                                <MaterialCommunityIcons name="pulse" size={14} color="#FFF" />
                                                <Text style={styles.topicPillText}>Tracking: {topic}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                                
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

                    <MemoizedFactShieldInput onVerify={handleFactCheck} loading={factLoading} />

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
                        {/* Audio-First Engagement UI */}
                        <View style={styles.audioEngagementContainer}>
                            <View style={styles.audioHeaderRow}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <View style={styles.audioPulseDot} />
                                    <Text style={styles.audioEngagementTitle}>Listen to Summary</Text>
                                </View>
                                <View style={styles.languageToggle}>
                                    <TouchableOpacity 
                                        style={[styles.langBtn, audioLang === 'en' && styles.langBtnActive]}
                                        onPress={() => setAudioLang('en')}
                                    >
                                        <Text style={[styles.langText, audioLang === 'en' && styles.langTextActive]}>EN</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={[styles.langBtn, audioLang === 'sw' && styles.langBtnActive]}
                                        onPress={() => setAudioLang('sw')}
                                    >
                                        <Text style={[styles.langText, audioLang === 'sw' && styles.langTextActive]}>SW</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {loadingAudio ? (
                                <View style={{ padding: 20, alignItems: 'center' }}>
                                    <ActivityIndicator size="small" color="#007AFF" />
                                    <Text style={{ fontSize: 12, color: '#666', marginTop: 8 }}>Generating AI Audio...</Text>
                                </View>
                            ) : audioData?.[audioLang] ? (
                                <AudioPlayer 
                                    sourceUrl={`${API_BASE_URL.replace('/api', '')}${audioData[audioLang]}`} 
                                    title={`${selectedDoc?.title} (${audioLang.toUpperCase()})`} 
                                />
                            ) : (
                                <Button 
                                    label="Generate Audio Summary" 
                                    onPress={() => fetchAudio(selectedDoc!.id, activeCategory === 'bills' ? 'bill' : 'hansard')} 
                                    loading={loadingAudio} 
                                />
                            )}
                        </View>

                        <View style={styles.summarySection}>
                            <View style={styles.sectionBadge}>
                                <MaterialCommunityIcons name="text-box-search" size={16} color="#007AFF" />
                                <Text style={styles.sectionBadgeText}>Official Summary</Text>
                            </View>
                            {selectedDoc?.ai_summary ? (
                                selectedDoc.ai_summary.split('\n').map((line: string, i: number) => {
                                    if (!line.trim() || line.trim() === '---') return <View key={i} style={{ height: 8 }} />;

                                    const isSectionHeader = (t: string) => {
                                        return t === t.toUpperCase() && t.length > 3 && /[A-Z]/.test(t) && !/^\d/.test(t);
                                    };

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
                            
                            {selectedDoc?.pdf_url && (
                                <View style={styles.sourceTag}>
                                    <Text style={styles.sourceTagText}>AI-Generated Summary — Always verify against official source.</Text>
                                </View>
                            )}
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

                    <MemoizedChatInput onSend={handleSendChat} disabled={chatLoading} />
                </KeyboardAvoidingView>
            </Modal>

            {/* Personalized Impact Modal */}
            <Modal visible={!!selectedBillForImpact} animationType="fade" transparent={true} onRequestClose={() => setSelectedBillForImpact(null)}>
                <View style={styles.impactModalOverlay}>
                    <View style={styles.impactModalContent}>
                        <View style={styles.impactModalHeaderRow}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                                <MaterialCommunityIcons name="bullseye-arrow" size={24} color="#007AFF" />
                                <Text style={styles.impactModalTitle} numberOfLines={1}>Impact on: {selectedBillForImpact?.topic}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setSelectedBillForImpact(null)} style={{ padding: 5 }}>
                                <MaterialCommunityIcons name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView style={{ maxHeight: 400 }}>
                            {loadingPersonal ? (
                                <View style={{ padding: 40, alignItems: 'center' }}>
                                    <ActivityIndicator size="large" color="#007AFF" />
                                    <Text style={{ marginTop: 15, color: '#666', fontWeight: '600' }}>AI Analysis in progress...</Text>
                                </View>
                            ) : personalImpact ? (
                                <ImpactCard impact={{
                                    id: 0,
                                    archetype: selectedBillForImpact?.topic || 'General',
                                    description: personalImpact.explanation,
                                    sentiment: personalImpact.sentiment
                                }} />
                            ) : (
                                <View style={{ padding: 20, alignItems: 'center' }}>
                                    <Text style={{ color: '#666' }}>Analysis unavailable.</Text>
                                </View>
                            )}
                        </ScrollView>

                        <TouchableOpacity style={styles.impactCloseButton} onPress={() => setSelectedBillForImpact(null)}>
                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
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
    newestCard: { borderColor: '#10B981', borderLeftWidth: 4, borderLeftColor: '#10B981' },
    newestBadge: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: '#bbf7d0' },
    greenDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 4 },
    newestText: { fontSize: 10, fontWeight: '800', color: '#166534' },
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
    audioEngagementContainer: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    audioHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    audioPulseDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#FF3B30',
    },
    audioEngagementTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1c1c1e',
    },
    languageToggle: {
        flexDirection: 'row',
        backgroundColor: '#f2f2f7',
        borderRadius: 8,
        padding: 2,
    },
    langBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    langBtnActive: {
        backgroundColor: '#007AFF',
    },
    langText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#8e8e93',
    },
    langTextActive: {
        color: '#fff',
    },
    errorAudioText: {
        fontSize: 14,
        color: '#FF3B30',
        textAlign: 'center',
        fontStyle: 'italic',
        marginTop: 10,
    },
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
    sourcePreview: { fontSize: 12, color: '#666', fontStyle: 'italic' },
    
    // Tracking Pill Styles
    topicPillsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
    topicPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10B981', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, gap: 6 },
    topicPillText: { fontSize: 11, fontWeight: '800', color: '#FFF' },
    
    // Impact Modal Styles
    impactModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    impactModalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 400, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
    impactModalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    impactModalTitle: { fontSize: 16, fontWeight: '800', color: '#007AFF', flexShrink: 1 },
    impactExplanationText: { fontSize: 15, color: '#333', lineHeight: 24, marginBottom: 20 },
    sentimentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
    sentimentLabel: { fontSize: 11, fontWeight: '800', color: '#666' },
    sentimentBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    sentimentText: { fontSize: 11, fontWeight: '800' },
    impactCloseButton: { backgroundColor: '#007AFF', padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 15 }
});

