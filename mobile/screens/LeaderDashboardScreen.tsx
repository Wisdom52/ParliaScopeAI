import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, RefreshControl,
    TouchableOpacity, ActivityIndicator, SafeAreaView, Platform, Alert, TextInput
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { API_BASE_URL } from '../config/api';

export const LeaderDashboardScreen: React.FC<{ user: any; token: string | null }> = ({ user, token }) => {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState<any>(null);
    const [reviews, setReviews] = useState<any[]>([]);
    const [liveChats, setLiveChats] = useState<any[]>([]);
    const [stanceData, setStanceData] = useState<any>(null);
    const [filterMode, setFilterMode] = useState<'National' | 'Local'>('Local');
    const [sessions, setSessions] = useState<string[]>([]);
    const [selectedSessionOption, setSelectedSessionOption] = useState<string>('live');
    const [responses, setResponses] = useState<Record<string, string>>({});
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');
    const [activeTab, setActiveTab] = useState<'overview' | 'stances' | 'feedback'>('overview');

    useEffect(() => {
        if (user?.role === 'LEADER') {
            fetchStats().then(() => {
                setLoading(false);
                setRefreshing(false);
            });
            fetchSessions();
        } else {
            setLoading(false);
        }
    }, [user]);

    const fetchSessions = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/baraza/live/chat/sessions`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            if (res.ok) setSessions(await res.json());
        } catch (e) {
            console.error("Failed to fetch sessions", e);
        }
    };

    const handleSubmitReply = async (idStr: string) => {
        if (!replyText.trim()) return;
        
        try {
            const isStance = idStr.startsWith('stance_');
            const actualId = parseInt(idStr.split('_')[1], 10);
            
            if (isStance) {
                await fetch(`${API_BASE_URL}/baraza/live/chat/${actualId}/respond`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ response: replyText })
                });
            } else if (user?.speaker_id) {
                await fetch(`${API_BASE_URL}/representatives/${user.speaker_id}/reviews/${actualId}/respond`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ response: replyText })
                });
            }

            setResponses(prev => ({ ...prev, [idStr]: replyText }));
            setReplyingTo(null);
            setReplyText('');
            fetchStats(); // Refresh local payload
        } catch (e) {
            Alert.alert('Error', 'Failed to save response to database.');
        }
    };

    useEffect(() => {
        if (user?.role !== 'LEADER') return;

        const loadChats = async () => {
            try {
                let url = `${API_BASE_URL}/baraza/live/chat/analytics`;
                if (filterMode === 'Local' && stats?.county_id) {
                    url += `?county_id=${stats.county_id}`;
                    if (stats.constituency_id) {
                        url += `&constituency_id=${stats.constituency_id}`;
                    }
                }
                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    setLiveChats(data || []);
                }
            } catch (e) {
                console.error("Failed to fetch live chats", e);
            }
        };

        loadChats();
        const interval = setInterval(loadChats, 5000);
        return () => clearInterval(interval);
    }, [user, filterMode, stats?.county_id, stats?.constituency_id]);

    const fetchStats = async () => {
        if (!user?.speaker_id) return;
        try {
            const res = await fetch(`${API_BASE_URL}/representatives/${user.speaker_id}`);
            if (res.ok) {
                const data = await res.json();
                setStats(data);
                setReviews(data.reviews || []);
            }
            
            const stanceRes = await fetch(`${API_BASE_URL}/representatives/${user.speaker_id}/stances`);
            if (stanceRes.ok) {
                setStanceData(await stanceRes.json());
            }
        } catch (e) {
            console.error("Failed to fetch leader stats", e);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchStats().then(() => setRefreshing(false));
    };

    if (loading && !refreshing) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Authenticating Official Credentials...</Text>
            </View>
        );
    }

    const renderOverview = () => (
        <View style={styles.overviewContainer}>
            <View style={styles.statsGrid}>
                <View style={[styles.statCard, { width: '48%' }]}>
                    <View style={[styles.statIcon, { backgroundColor: '#FEF9C3' }]}>
                        <MaterialCommunityIcons name="star" size={24} color="#A16207" />
                    </View>
                    <View style={styles.statMain}>
                        <Text style={styles.statVal}>{stats?.average_rating?.toFixed(1) || '0.0'}</Text>
                        <Text style={styles.statTotal}>/ 5.0</Text>
                    </View>
                    <Text style={styles.statLabel}>Public Approval</Text>
                    <Text style={styles.statFooter} numberOfLines={1}>Based on reviews</Text>
                </View>
                
                <View style={[styles.statCard, { width: '48%' }]}>
                    <View style={[styles.statIcon, { backgroundColor: '#E0F2FE' }]}>
                        <MaterialCommunityIcons name="shield-check" size={24} color="#0369A1" />
                    </View>
                    <View style={styles.statMain}>
                        <Text style={styles.statLabel}>Sitting Archives</Text>
                    </View>
                    <Text style={[styles.statFooter, { marginTop: 8 }]} numberOfLines={2}>Review historical constituent stances.</Text>
                </View>
            </View>

            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Baraza Archives</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                <TouchableOpacity 
                    style={[styles.sessionPill, selectedSessionOption === 'live' && styles.sessionPillActive]}
                    onPress={() => { setSelectedSessionOption('live'); setActiveTab('stances'); }}
                >
                    <Text style={[styles.sessionPillText, selectedSessionOption === 'live' && styles.sessionPillTextActive]}>Current Live Session</Text>
                </TouchableOpacity>
                {sessions.map(s => (
                    <TouchableOpacity 
                        key={s}
                        style={[styles.sessionPill, selectedSessionOption === s && styles.sessionPillActive]}
                        onPress={() => { setSelectedSessionOption(s); setActiveTab('stances'); }}
                    >
                        <Text style={[styles.sessionPillText, selectedSessionOption === s && styles.sessionPillTextActive]}>{s}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Performance Analytics</Text>
            </View>
            <View style={styles.pCard}>
                <View style={styles.analyticsRow}>
                    <View style={styles.analyticsItem}>
                        <Text style={styles.aLabel}>Consistency</Text>
                        <Text style={styles.aVal}>{stanceData ? `${stanceData.overall_consistency}%` : '...'}</Text>
                    </View>
                    <View style={styles.aDivider} />
                    <View style={styles.analyticsItem}>
                        <Text style={styles.aLabel}>Sittings</Text>
                        <Text style={styles.aVal}>{stats?.sittings_attended || '0'}</Text>
                    </View>
                    <View style={styles.aDivider} />
                    <View style={styles.analyticsItem}>
                        <Text style={styles.aLabel}>Bills</Text>
                        <Text style={styles.aVal}>{stats?.bills_sponsored || '0'}</Text>
                    </View>
                </View>
            </View>
        </View>
    );

    const renderStances = () => (
        <View style={styles.feedContainer}>
            <View style={styles.cardHeader}>
                <Text style={styles.sectionTitle}>Live Stances</Text>
                <Text style={styles.cardSubtitle}>Real-time statements from ongoing Baraza debates.</Text>
            </View>
            <View style={styles.toggleContainer}>
                <TouchableOpacity 
                    style={[styles.toggleBtn, filterMode === 'Local' && styles.toggleActive]}
                    onPress={() => setFilterMode('Local')}
                >
                    <Text style={[styles.toggleText, filterMode === 'Local' && styles.toggleActiveText]}>Constituents</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.toggleBtn, filterMode === 'National' && styles.toggleActive]}
                    onPress={() => setFilterMode('National')}
                >
                    <Text style={[styles.toggleText, filterMode === 'National' && styles.toggleActiveText]}>National</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.statementList}>
                {liveChats.length === 0 ? (
                    <View style={styles.emptyFeed}>
                        <MaterialCommunityIcons name="message-outline" size={48} color="#D1D1D6" />
                        <Text style={styles.emptyText}>No stances recorded in this area yet.</Text>
                    </View>
                ) : (
                    liveChats.map((chat, idx) => (
                        <View key={chat.id || idx} style={styles.statementCard}>
                            <View style={styles.sHeader}>
                                <Text style={styles.sUser}>{chat.user_name || 'Citizen'}</Text>
                                <Text style={styles.sTime}>{new Date(chat.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                            </View>
                            <Text style={styles.sText}>{chat.message}</Text>
                            
                            {(responses[`stance_${chat.id}`] || chat.official_response) ? (
                                <View style={styles.officialResponseContainer}>
                                    <Text style={styles.officialResponseHeader}>Official Response:</Text>
                                    <Text style={styles.officialResponseText}>{responses[`stance_${chat.id}`] || chat.official_response}</Text>
                                </View>
                            ) : replyingTo === `stance_${chat.id}` ? (
                                <View style={styles.replyArea}>
                                    <TextInput 
                                        style={styles.replyInput}
                                        value={replyText}
                                        onChangeText={setReplyText}
                                        placeholder="Type official reply..."
                                        autoFocus
                                    />
                                    <View style={styles.replyActionRow}>
                                        <TouchableOpacity onPress={() => setReplyingTo(null)}>
                                            <Text style={styles.replyCancelBtn}>Cancel</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => handleSubmitReply(`stance_${chat.id}`)} style={styles.replySubmitBtn}>
                                            <Text style={styles.replySubmitBtnText}>Send</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                <TouchableOpacity 
                                    style={styles.respondBtn}
                                    onPress={() => { setReplyingTo(`stance_${chat.id}`); setReplyText(''); }}
                                >
                                    <Text style={styles.respondBtnText}>Respond Officially</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ))
                )}
            </View>
        </View>
    );

    const renderFeedback = () => (
        <View style={styles.feedContainer}>
            <View style={styles.cardHeader}>
                <Text style={styles.sectionTitle}>Feedback</Text>
            </View>
            <View style={styles.statementList}>
                {reviews.length === 0 ? (
                    <View style={styles.emptyFeed}>
                        <MaterialCommunityIcons name="star-outline" size={48} color="#D1D1D6" />
                        <Text style={styles.emptyText}>No public reviews available for this profile yet.</Text>
                    </View>
                ) : (
                    reviews.map((rev) => (
                        <View key={rev.id} style={styles.feedbackCard}>
                            <View style={styles.fHeader}>
                                <View style={styles.miniStarRow}>
                                    {[...Array(5)].map((_, i) => (
                                        <MaterialCommunityIcons 
                                            key={i} 
                                            name="star" 
                                            size={14} 
                                            color={i < rev.rating ? "#EAB308" : "#E5E5EA"} 
                                        />
                                    ))}
                                </View>
                                <Text style={styles.sTime}>{new Date(rev.created_at).toLocaleDateString()}</Text>
                            </View>
                            <Text style={styles.fText}>"{rev.comment}"</Text>
                            <Text style={styles.fAuthor}>- {rev.user_name}</Text>

                            {(responses[`review_${rev.id}`] || rev.official_response) ? (
                                <View style={styles.officialResponseContainer}>
                                    <Text style={styles.officialResponseHeader}>Official Response:</Text>
                                    <Text style={styles.officialResponseText}>{responses[`review_${rev.id}`] || rev.official_response}</Text>
                                </View>
                            ) : replyingTo === `review_${rev.id}` ? (
                                <View style={styles.replyArea}>
                                    <TextInput 
                                        style={styles.replyInput}
                                        value={replyText}
                                        onChangeText={setReplyText}
                                        placeholder="Type official reply..."
                                        autoFocus
                                    />
                                    <View style={styles.replyActionRow}>
                                        <TouchableOpacity onPress={() => setReplyingTo(null)}>
                                            <Text style={styles.replyCancelBtn}>Cancel</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => handleSubmitReply(`review_${rev.id}`)} style={styles.replySubmitBtn}>
                                            <Text style={styles.replySubmitBtnText}>Send</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                <TouchableOpacity 
                                    style={styles.respondBtn}
                                    onPress={() => { setReplyingTo(`review_${rev.id}`); setReplyText(''); }}
                                >
                                    <Text style={styles.respondBtnText}>Respond Officially</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ))
                )}
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.welcome}>Official Command Centre</Text>
                    <Text style={styles.title} numberOfLines={1}>{stats?.name || user?.full_name}</Text>
                    <View style={styles.leaderMeta}>
                        <Text style={styles.metaText}>{stats?.role || 'Parliamentary Representative'}</Text>
                        <View style={styles.dot} />
                        <Text style={styles.metaText}>{stats?.constituency_name || stats?.county_name || 'National'}</Text>
                        <View style={styles.dot} />
                        <Text style={styles.partyText}>{stats?.party || 'Independent'}</Text>
                    </View>
                </View>
                <View style={[
                    styles.badge, 
                    !user?.is_verified ? styles.pendingBadge : (user?.is_active ? styles.verifiedBadge : styles.suspendedBadge)
                ]}>
                    <MaterialCommunityIcons 
                        name={!user?.is_verified ? "clock-outline" : (user?.is_active ? "shield-check" : "alert-circle")} 
                        size={16} 
                        color={!user?.is_verified ? "#FF9500" : (user?.is_active ? "#007AFF" : "#FF3B30")} 
                    />
                    <Text style={[
                        styles.badgeText,
                        !user?.is_verified ? styles.pendingBadgeText : (user?.is_active ? styles.verifiedBadgeText : styles.suspendedBadgeText)
                    ]}>
                        {!user?.is_verified ? 'Pending' : user?.is_active ? 'Verified' : 'Suspended'}
                    </Text>
                </View>
            </View>

            <View style={styles.mainTabs}>
                <TouchableOpacity 
                    style={[styles.mainTab, activeTab === 'overview' && styles.mainTabActive]}
                    onPress={() => setActiveTab('overview')}
                >
                    <Text style={[styles.mainTabText, activeTab === 'overview' && styles.mainTabTextActive]}>Overview</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.mainTab, activeTab === 'stances' && styles.mainTabActive]}
                    onPress={() => setActiveTab('stances')}
                >
                    <Text style={[styles.mainTabText, activeTab === 'stances' && styles.mainTabTextActive]}>Live Stances</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.mainTab, activeTab === 'feedback' && styles.mainTabActive]}
                    onPress={() => setActiveTab('feedback')}
                >
                    <Text style={[styles.mainTabText, activeTab === 'feedback' && styles.mainTabTextActive]}>Feedback</Text>
                </TouchableOpacity>
            </View>

            <ScrollView 
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                {activeTab === 'overview' ? renderOverview() : activeTab === 'stances' ? renderStances() : renderFeedback()}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F2F2F7' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
    loadingText: { marginTop: 15, fontSize: 16, color: '#8E8E93', fontWeight: '500' },
    header: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
    welcome: { fontSize: 13, color: '#8E8E93', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    title: { fontSize: 22, fontWeight: '800', color: '#1C1C1E', marginTop: 2 },
    leaderMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    metaText: { fontSize: 13, color: '#666' },
    dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#8E8E93', marginHorizontal: 8 },
    partyText: { fontSize: 12, color: '#007AFF', fontWeight: '700' },
    badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 4 },
    badgeText: { fontSize: 12, fontWeight: '700' },
    verifiedBadge: { backgroundColor: '#F0F7FF' },
    verifiedBadgeText: { color: '#007AFF' },
    pendingBadge: { backgroundColor: '#FFF7E6' },
    pendingBadgeText: { color: '#FF9500' },
    suspendedBadge: { backgroundColor: '#FFF2F2' },
    suspendedBadgeText: { color: '#FF3B30' },
    
    mainTabs: { flexDirection: 'row', paddingHorizontal: 20, backgroundColor: '#fff', paddingBottom: 5 },
    mainTab: { paddingBottom: 10, marginRight: 20, borderBottomWidth: 3, borderBottomColor: 'transparent' },
    mainTabActive: { borderBottomColor: '#007AFF' },
    mainTabText: { fontSize: 15, fontWeight: '700', color: '#8E8E93' },
    mainTabTextActive: { color: '#007AFF' },

    overviewContainer: { padding: 20 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
    statCard: { width: '48%', backgroundColor: '#fff', borderRadius: 20, padding: 15, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
    statIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    statMain: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
    statVal: { fontSize: 24, fontWeight: '800', color: '#1C1C1E' },
    statTotal: { fontSize: 14, color: '#8E8E93', fontWeight: '600' },
    statLabel: { fontSize: 14, color: '#1C1C1E', fontWeight: '700', marginTop: 2 },
    statFooter: { fontSize: 11, color: '#8E8E93', marginTop: 4, fontWeight: '500' },
    
    sectionHeader: { marginBottom: 12 },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1C1C1E' },
    cardHeader: { marginBottom: 15 },
    cardSubtitle: { fontSize: 13, color: '#8E8E93', marginTop: 4 },
    pCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
    analyticsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
    analyticsItem: { alignItems: 'center' },
    aLabel: { fontSize: 11, color: '#8E8E93', fontWeight: '700', textTransform: 'uppercase', marginBottom: 5 },
    aVal: { fontSize: 18, fontWeight: '800', color: '#1C1C1E' },
    aDivider: { width: 1, height: 30, backgroundColor: '#F2F2F7' },

    feedContainer: { padding: 20 },
    toggleContainer: { flexDirection: 'row', backgroundColor: '#E5E5EA', borderRadius: 10, padding: 3, marginBottom: 20 },
    toggleBtn: { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: 8 },
    toggleActive: { backgroundColor: '#fff', elevation: 2 },
    toggleText: { fontSize: 13, fontWeight: '700', color: '#8E8E93' },
    toggleActiveText: { color: '#1C1C1E' },

    statementList: { gap: 12 },
    statementCard: { backgroundColor: '#fff', borderRadius: 16, padding: 15, shadowColor: '#000', shadowOpacity: 0.03, elevation: 1, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
    sHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    sUser: { fontSize: 14, fontWeight: '700', color: '#007AFF' },
    sTime: { fontSize: 12, color: '#8E8E93' },
    sText: { fontSize: 15, color: '#3A3A3C', lineHeight: 22 },
    
    feedbackCard: { backgroundColor: '#fff', borderRadius: 16, padding: 15, shadowColor: '#000', shadowOpacity: 0.03, elevation: 1 },
    fHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    miniStarRow: { flexDirection: 'row', gap: 2 },
    fText: { fontSize: 15, color: '#3A3A3C', lineHeight: 22, fontStyle: 'italic' },
    fAuthor: { fontSize: 13, fontWeight: '700', color: '#1C1C1E', marginTop: 10 },
    
    emptyFeed: { alignItems: 'center', marginTop: 60, padding: 40 },
    emptyText: { marginTop: 15, color: '#8E8E93', fontSize: 15, textAlign: 'center' },

    sessionPill: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#D1D1D6', marginRight: 8 },
    sessionPillActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
    sessionPillText: { fontSize: 13, fontWeight: '600', color: '#3A3A3C' },
    sessionPillTextActive: { color: '#fff' },

    officialResponseContainer: { marginTop: 12, backgroundColor: '#EEF2FF', padding: 10, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#007AFF' },
    officialResponseHeader: { color: '#007AFF', fontWeight: '800', fontSize: 12, marginBottom: 4 },
    officialResponseText: { color: '#333', fontSize: 13, lineHeight: 18 },

    respondBtn: { alignSelf: 'flex-end', marginTop: 10 },
    respondBtnText: { color: '#007AFF', fontSize: 12, fontWeight: '700' },
    
    replyArea: { marginTop: 10 },
    replyInput: { backgroundColor: '#F9F9F9', borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 8, padding: 10, fontSize: 13, minHeight: 40 },
    replyActionRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 8, gap: 12 },
    replyCancelBtn: { color: '#8E8E93', fontSize: 12, fontWeight: '600' },
    replySubmitBtn: { backgroundColor: '#007AFF', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6 },
    replySubmitBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' }
});
