import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, RefreshControl,
    TouchableOpacity, ActivityIndicator, SafeAreaView, Platform
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
    const [activeTab, setActiveTab] = useState<'overview' | 'feed' | 'feedback'>('overview');

    useEffect(() => {
        if (user?.role === 'LEADER') {
            fetchStats().then(() => {
                setLoading(false);
                setRefreshing(false);
            });
        } else {
            setLoading(false);
        }
    }, [user]);

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
                <View style={styles.statCard}>
                    <View style={[styles.statIcon, { backgroundColor: '#FEF9C3' }]}>
                        <MaterialCommunityIcons name="star" size={24} color="#A16207" />
                    </View>
                    <View style={styles.statMain}>
                        <Text style={styles.statVal}>{stats?.average_rating?.toFixed(1) || '0.0'}</Text>
                        <Text style={styles.statTotal}>/ 5.0</Text>
                    </View>
                    <Text style={styles.statLabel}>Public Approval</Text>
                    <Text style={styles.statFooter}>Based on constituent reviews</Text>
                </View>
                <View style={styles.statCard}>
                    <View style={[styles.statIcon, { backgroundColor: '#DCFCE7' }]}>
                        <MaterialCommunityIcons name="trending-up" size={24} color="#166534" />
                    </View>
                    <Text style={styles.statVal}>Positive</Text>
                    <Text style={styles.statLabel}>Sentiment Index</Text>
                    <Text style={[styles.statFooter, { color: '#16a34a' }]}>Up 12% this month</Text>
                </View>
            </View>

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

    const renderFeed = () => (
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
                <View style={styles.badge}>
                    <MaterialCommunityIcons name="shield-check" size={16} color="#007AFF" />
                    <Text style={styles.badgeText}>Verified</Text>
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
                    style={[styles.mainTab, activeTab === 'feed' && styles.mainTabActive]}
                    onPress={() => setActiveTab('feed')}
                >
                    <Text style={[styles.mainTabText, activeTab === 'feed' && styles.mainTabTextActive]}>Live Stances</Text>
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
                {activeTab === 'overview' ? renderOverview() : activeTab === 'feed' ? renderFeed() : renderFeedback()}
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
    badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F7FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 4 },
    badgeText: { fontSize: 12, fontWeight: '700', color: '#007AFF' },
    
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
});
