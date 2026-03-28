import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, RefreshControl,
    TouchableOpacity, ActivityIndicator, SafeAreaView, FlatList, Alert, Image, Platform, TextInput
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { API_BASE_URL } from '../config/api';

interface AdminDashboardProps {
    user: any;
    token: string | null;
    activeTab: 'overview' | 'users' | 'system' | 'database';
}

export const AdminDashboardScreen: React.FC<AdminDashboardProps> = ({ user, token, activeTab }) => {
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    
    // Search and filter state for Citizens
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'citizen'>('all');
    
    // Data states
    const [stats, setStats] = useState<any>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [pendingLeaders, setPendingLeaders] = useState<any[]>([]);
    const [activeLeaders, setActiveLeaders] = useState<any[]>([]);
    const [logs, setLogs] = useState<string>('');
    const [notifications, setNotifications] = useState<any[]>([]);
    const [userTab, setUserTab] = useState<'citizens' | 'leaders'>('citizens');
    
    // Database inspection states
    const [tables, setTables] = useState<string[]>([]);
    const [selectedTable, setSelectedTable] = useState<string | null>(null);
    const [tableData, setTableData] = useState<any>(null);

    // Health states
    const [health, setHealth] = useState<any>(null);
    const [healthLoading, setHealthLoading] = useState(false);
    
    // Modal state for leader review
    const [reviewClaim, setReviewClaim] = useState<any>(null);

    const fetchData = async () => {
        if (!token) return;
        setLoading(true);
        try {
            if (activeTab === 'overview') {
                const res = await fetch(`${API_BASE_URL}/admin/dashboard/stats`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) setStats(await res.json());
            } else if (activeTab === 'users') {
                if (userTab === 'citizens') {
                    const res = await fetch(`${API_BASE_URL}/admin/users`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) setUsers(await res.json());
                } else {
                    const pRes = await fetch(`${API_BASE_URL}/admin/leaders/pending`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (pRes.ok) setPendingLeaders(await pRes.json());
                    const aRes = await fetch(`${API_BASE_URL}/admin/leaders/active`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (aRes.ok) setActiveLeaders(await aRes.json());
                }
            } else if (activeTab === 'system') {
                const lRes = await fetch(`${API_BASE_URL}/admin/logs?lines=100`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (lRes.ok) setLogs((await lRes.json()).logs);
                const nRes = await fetch(`${API_BASE_URL}/admin/notifications`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (nRes.ok) setNotifications(await nRes.json());
            } else if (activeTab === 'database') {
                const res = await fetch(`${API_BASE_URL}/admin/db/tables`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) setTables(await res.json());
            }
        } catch (e) {
            console.error("Fetch failed", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchHealth = async () => {
        setHealthLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/admin/health`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setHealth(await res.json());
        } catch (e) {
            console.error("Health fetch failed", e);
        } finally {
            setHealthLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'system') {
            fetchHealth();
            const timer = setInterval(fetchHealth, 10000);
            return () => clearInterval(timer);
        }
    }, [activeTab]);

    const fetchTableData = async (tableName: string) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/admin/db/table/${tableName}?limit=50`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setTableData(await res.json());
                setSelectedTable(tableName);
            }
        } catch (e) {
            console.error("Table fetch failed", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [activeTab, userTab]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    // Actions
    const handleRoleToggle = async (userId: number) => {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/role`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) fetchData();
        } catch (e) {
            Alert.alert("Error", "Action failed");
        }
    };

    const handleStatusToggle = async (userId: number) => {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/status`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) fetchData();
        } catch (e) {
            Alert.alert("Error", "Action failed");
        }
    };

    const handleDeleteUser = (userId: number, email: string) => {
        Alert.alert(
            "Delete User",
            `Permanently delete ${email}?`,
            [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: async () => {
                    await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    fetchData();
                }}
            ]
        );
    };

    const handleTriggerIngest = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/admin/ingest/hansard`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                Alert.alert("Success", `Hansard Ingestion complete: ${data.summary?.total_processed} items.`);
            }
        } catch (e) {
            Alert.alert("Error", "Ingestion failed");
        } finally {
            setLoading(false);
        }
    };

    const handleTriggerBillIngest = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/ingest/crawl/bills?limit=10`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                Alert.alert("Success", `Bill Ingestion complete: ${data.ingested?.length || 0} new bills.`);
            }
        } catch (e) {
            Alert.alert("Error", "Bill Sync failed");
        } finally {
            setLoading(false);
        }
    };

    const renderOverview = () => (
        <ScrollView 
            style={styles.tabContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <View style={styles.metricsGrid}>
                {/* Users Card */}
                <View style={styles.metricCard}>
                    <View style={styles.metricHeader}>
                        <MaterialCommunityIcons name="account-group" size={20} color="#007AFF" />
                        <Text style={styles.metricTitle}>Users</Text>
                    </View>
                    <Text style={styles.metricValue}>{stats?.users?.total || 0}</Text>
                    <View style={styles.metricDetail}>
                        <Text style={styles.detailText}>Active: {stats?.users?.active || 0}</Text>
                        <Text style={styles.detailText}>Leaders: {stats?.users?.leaders || 0}</Text>
                    </View>
                </View>

                {/* Content Card */}
                <View style={styles.metricCard}>
                    <View style={styles.metricHeader}>
                        <MaterialCommunityIcons name="file-document" size={20} color="#5856D6" />
                        <Text style={styles.metricTitle}>Content</Text>
                    </View>
                    <Text style={styles.metricValue}>{(stats?.content?.bills || 0) + (stats?.content?.hansard_sessions || 0)}</Text>
                    <View style={styles.metricDetail}>
                        <Text style={styles.detailText}>Bills: {stats?.content?.bills || 0}</Text>
                        <Text style={styles.detailText}>Hansard: {stats?.content?.hansard_sessions || 0}</Text>
                    </View>
                </View>

                {/* Baraza Activity */}
                <View style={[styles.metricCard, { width: '100%' }]}>
                    <View style={styles.metricHeader}>
                        <MaterialCommunityIcons name="forum" size={20} color="#34C759" />
                        <Text style={styles.metricTitle}>Civic Engagement</Text>
                    </View>
                    <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.metricValueSmall}>{stats?.baraza?.forum_posts || 0}</Text>
                            <Text style={styles.detailText}>Forum Posts</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.metricValueSmall}>{stats?.baraza?.polls || 0}</Text>
                            <Text style={styles.detailText}>Active Polls</Text>
                        </View>
                    </View>
                </View>

                {/* Live Monitoring */}
                <View style={[styles.metricCard, styles.darkCard, { width: '100%' }]}>
                    <View style={styles.metricHeader}>
                        <MaterialCommunityIcons name="pulse" size={20} color="#FF3B30" />
                        <Text style={[styles.metricTitle, { color: '#FF3B30' }]}>Live Monitoring</Text>
                    </View>
                    <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.metricValueSmall, { color: '#fff' }]}>{stats?.live_stream?.chats || 0}</Text>
                            <Text style={[styles.detailText, { color: 'rgba(255,255,255,0.6)' }]}>Chat Messages</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.metricValueSmall, { color: '#fff' }]}>{stats?.live_stream?.reactions || 0}</Text>
                            <Text style={[styles.detailText, { color: 'rgba(255,255,255,0.6)' }]}>Pulse Reactions</Text>
                        </View>
                    </View>
                    <View style={styles.liveIndicator}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>SYSTEM HEALTHY</Text>
                    </View>
                </View>
            </View>
        </ScrollView>
    );

    const renderUsers = () => (
        <View style={styles.tabContent}>
            <View style={styles.subTabs}>
                <TouchableOpacity 
                    style={[styles.subTab, userTab === 'citizens' && styles.subTabActive]}
                    onPress={() => setUserTab('citizens')}
                >
                    <Text style={[styles.subTabText, userTab === 'citizens' && styles.subTabTextActive]}>Citizens</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.subTab, userTab === 'leaders' && styles.subTabActive]}
                    onPress={() => setUserTab('leaders')}
                >
                    <Text style={[styles.subTabText, userTab === 'leaders' && styles.subTabTextActive]}>Leaders</Text>
                </TouchableOpacity>
            </View>

            {userTab === 'citizens' ? (
                <>
                    <View style={{ paddingHorizontal: 15, marginBottom: 10, gap: 10 }}>
                        <TextInput
                            style={{ backgroundColor: '#fff', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 8, fontSize: 14, borderWidth: 1, borderColor: '#E5E5EA' }}
                            placeholder="Search by name or email…"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            {(['all', 'admin', 'citizen'] as const).map(f => (
                                <TouchableOpacity 
                                    key={f}
                                    style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: roleFilter === f ? '#007AFF' : '#E5E5EA' }}
                                    onPress={() => setRoleFilter(f)}
                                >
                                    <Text style={{ fontSize: 12, fontWeight: '600', color: roleFilter === f ? '#fff' : '#8E8E93', textTransform: 'capitalize' }}>
                                        {f}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                    <FlatList
                        data={users.filter(u => u.role !== 'LEADER').filter(u => {
                            if (roleFilter === 'admin' && !u.is_admin) return false;
                            if (roleFilter === 'citizen' && u.is_admin) return false;
                            if (searchQuery.trim()) {
                                const q = searchQuery.toLowerCase();
                                return u.email?.toLowerCase().includes(q) || u.full_name?.toLowerCase().includes(q);
                            }
                            return true;
                        })}
                        keyExtractor={(item) => item.id.toString()}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 30, color: '#8E8E93' }}>No citizens found.</Text>}
                        renderItem={({ item }) => (
                        <View style={styles.userCard}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.userName}>{item.full_name || 'Guest User'}</Text>
                                <Text style={styles.userEmail}>{item.email || '-'}</Text>
                                <View style={styles.row}>
                                    <View style={[styles.tag, item.is_active ? styles.tagActive : styles.tagPaused]}>
                                        <Text style={styles.tagText}>{item.is_active ? 'Active' : 'Paused'}</Text>
                                    </View>
                                    <View style={[styles.tag, item.is_admin ? styles.tagAdmin : styles.tagCitizen]}>
                                        <Text style={styles.tagText}>{item.is_admin ? 'Admin' : 'Citizen'}</Text>
                                    </View>
                                </View>
                            </View>
                            <View style={styles.userActions}>
                                <TouchableOpacity onPress={() => handleRoleToggle(item.id)} disabled={item.id === user.id}>
                                    <MaterialCommunityIcons name="security" size={22} color={item.id === user.id ? "#CCC" : "#007AFF"} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleStatusToggle(item.id)} disabled={item.id === user.id}>
                                    <MaterialCommunityIcons name="pause-circle-outline" size={22} color={item.id === user.id ? "#CCC" : "#FF9500"} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleDeleteUser(item.id, item.email)} disabled={item.id === user.id}>
                                    <MaterialCommunityIcons name="trash-can-outline" size={22} color={item.id === user.id ? "#CCC" : "#FF3B30"} />
                                </TouchableOpacity>
                            </View>
                        </View>
                        )}
                    />
                </>
            ) : (
                <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
                    {pendingLeaders.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Pending Claims ({pendingLeaders.length})</Text>
                            {pendingLeaders.map(p => (
                                <View key={p.id} style={styles.userCard}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.userName}>{p.speaker_name}</Text>
                                        <Text style={styles.userEmail}>{p.user_email}</Text>
                                        <Text style={styles.userRole}>{p.speaker_role}</Text>
                                    </View>
                                    <TouchableOpacity 
                                        style={styles.reviewBtn}
                                        onPress={() => setReviewClaim(p)}
                                    >
                                        <Text style={styles.reviewBtnText}>Review</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    )}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Verified Leaders</Text>
                        {activeLeaders.map(l => (
                            <View key={l.id} style={styles.userCard}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.userName}>{l.speaker_name}</Text>
                                    <Text style={styles.userEmail}>{l.email}</Text>
                                    <View style={[styles.tag, l.is_active ? styles.tagActive : styles.tagPaused]}>
                                        <Text style={styles.tagText}>{l.is_active ? 'Active' : 'Suspended'}</Text>
                                    </View>
                                </View>
                                <TouchableOpacity onPress={() => handleStatusToggle(l.id)}>
                                    <MaterialCommunityIcons name="account-cancel-outline" size={24} color="#FF3B30" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                </ScrollView>
            )}

            {/* Review Modal Placeholder Logic */}
            {reviewClaim && (
                <View style={styles.modalOverlay}>
                    <View style={styles.modal}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Verify Leader</Text>
                            <TouchableOpacity onPress={() => setReviewClaim(null)}>
                                <MaterialCommunityIcons name="close" size={24} color="#1C1C1E" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.modalBody}>
                            <Text style={styles.modalLabel}>Identity Claimed</Text>
                            <Text style={styles.modalValue}>{reviewClaim.speaker_name}</Text>
                            <Text style={styles.modalSubValue}>{reviewClaim.speaker_role}</Text>

                            <Text style={styles.modalLabel}>Submitted Documents</Text>
                            <View style={styles.docPreview}>
                                {reviewClaim.maisha_card_url ? (
                                    <Image 
                                        source={{ uri: `${API_BASE_URL.replace('/api', '')}/${reviewClaim.maisha_card_url}` }} 
                                        style={styles.previewImage} 
                                    />
                                ) : <View style={styles.emptyDoc}><Text>No Maisha Card</Text></View>}
                                <Text style={styles.docLabel}>ID Photo</Text>
                            </View>
                            <View style={styles.docPreview}>
                                {reviewClaim.staff_card_url ? (
                                    <Image 
                                        source={{ uri: `${API_BASE_URL.replace('/api', '')}/${reviewClaim.staff_card_url}` }} 
                                        style={styles.previewImage} 
                                    />
                                ) : <View style={styles.emptyDoc}><Text>No Staff ID</Text></View>}
                                <Text style={styles.docLabel}>Staff Badge</Text>
                            </View>
                            
                            <TouchableOpacity 
                                style={styles.approveBtn}
                                onPress={async () => {
                                    await fetch(`${API_BASE_URL}/admin/leaders/${reviewClaim.id}/authorize`, {
                                        method: 'POST',
                                        headers: { 'Authorization': `Bearer ${token}` }
                                    });
                                    setReviewClaim(null);
                                    fetchData();
                                }}
                            >
                                <Text style={styles.approveBtnText}>Authorize Identity</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            )}
        </View>
    );

    const renderDatabase = () => (
        <View style={styles.tabContent}>
            {selectedTable ? (
                <View style={{ flex: 1 }}>
                    <View style={styles.tableHeader}>
                        <TouchableOpacity onPress={() => setSelectedTable(null)} style={styles.backBtn}>
                            <MaterialCommunityIcons name="arrow-left" size={20} color="#007AFF" />
                            <Text style={styles.backBtnText}>Back to Tables</Text>
                        </TouchableOpacity>
                        <Text style={styles.tableNameTitle}>{selectedTable}</Text>
                    </View>
                    <ScrollView horizontal>
                        <View>
                            <View style={styles.gridRowHeader}>
                                {tableData?.columns.map((col: string) => (
                                    <View key={col} style={styles.gridHeaderCell}>
                                        <Text style={styles.gridHeaderText}>{col}</Text>
                                    </View>
                                ))}
                            </View>
                            <FlatList
                                data={tableData?.rows}
                                keyExtractor={(_, idx) => idx.toString()}
                                renderItem={({ item }) => (
                                    <View style={styles.gridRow}>
                                        {tableData?.columns.map((col: string) => (
                                            <View key={col} style={styles.gridCell}>
                                                <Text style={styles.gridCellText} numberOfLines={2}>
                                                    {typeof item[col] === 'object' ? JSON.stringify(item[col]) : String(item[col])}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            />
                        </View>
                    </ScrollView>
                </View>
            ) : (
                <FlatList
                    data={tables}
                    keyExtractor={(item) => item}
                    contentContainerStyle={{ padding: 15 }}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.tableListItem} onPress={() => fetchTableData(item)}>
                            <View style={styles.tableInfo}>
                                <MaterialCommunityIcons name="table" size={24} color="#8E8E93" />
                                <Text style={styles.tableListName}>{item}</Text>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={20} color="#C7C7CC" />
                        </TouchableOpacity>
                    )}
                    ListHeaderComponent={(
                        <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 12 }]}>
                            <Text style={styles.sectionTitle}>Database Tables</Text>
                            <TouchableOpacity onPress={() => fetchData()}>
                                <MaterialCommunityIcons name="refresh" size={20} color="#007AFF" />
                            </TouchableOpacity>
                        </View>
                    )}
                />
            )}
        </View>
    );

    const GaugeBar: React.FC<{ label: string; value: number; subLabel?: string }> = ({ label, value, subLabel }) => {
        const pct = Math.min(100, value);
        const color = pct > 85 ? '#FF3B30' : pct > 60 ? '#FF9500' : '#34C759';
        return (
            <View style={{ marginBottom: 15 }}>
                <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 6 }]}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#1C1C1E' }}>{label}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color }}>{value}% {subLabel ? `— ${subLabel}` : ''}</Text>
                </View>
                <View style={{ height: 10, backgroundColor: '#E5E5EA', borderRadius: 5, overflow: 'hidden' }}>
                    <View style={{ height: '100%', width: `${pct}%`, backgroundColor: color }} />
                </View>
            </View>
        );
    };

    const renderSystem = () => (
        <ScrollView 
            style={styles.tabContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>System Health Monitor</Text>
                <View style={styles.card}>
                    {health ? (
                        <>
                            <GaugeBar label="CPU Load" value={health.cpu.percent} />
                            <GaugeBar label="RAM (Memory)" value={health.ram.percent} subLabel={`${health.ram.used_gb}/${health.ram.total_gb} GB`} />
                            <GaugeBar label="Disk Usage" value={health.disk.percent} subLabel={`${health.disk.used_gb}/${health.disk.total_gb} GB`} />
                            
                            <View style={{ marginTop: 5, borderTopWidth: 1, borderTopColor: '#F2F2F7', paddingTop: 15 }}>
                                <View style={[styles.row, { justifyContent: 'space-between' }]}>
                                    <View style={styles.row}>
                                        <MaterialCommunityIcons name="database" size={18} color={health.database.ok ? "#34C759" : "#FF3B30"} />
                                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#1C1C1E' }}>PostgreSQL</Text>
                                    </View>
                                    <Text style={{ fontSize: 12, fontWeight: '800', color: health.database.ok ? "#34C759" : "#FF3B30" }}>
                                        {health.database.ok ? 'ONLINE' : 'OFFLINE'} ({health.database.latency_ms}ms)
                                    </Text>
                                </View>
                            </View>
                        </>
                    ) : (
                        <View style={{ padding: 20, alignItems: 'center' }}>
                            <ActivityIndicator color="#007AFF" />
                            <Text style={{ marginTop: 10, color: '#8E8E93', fontSize: 13 }}>Fetching system metrics...</Text>
                        </View>
                    )}
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Data Pipeline</Text>
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Hansard Sync</Text>
                    <Text style={styles.cardDesc}>Crawl official parliamentary records and segment speech.</Text>
                    <TouchableOpacity 
                        style={styles.triggerBtn} 
                        onPress={handleTriggerIngest}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color="#fff" /> : (
                            <>
                                <MaterialCommunityIcons name="sync" size={20} color="#fff" />
                                <Text style={styles.triggerBtnText}>Trigger Hansard Sync</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={[styles.card, { marginTop: 15 }]}>
                    <Text style={styles.cardTitle}>2026 Bill Sync</Text>
                    <Text style={styles.cardDesc}>Crawl parliament.go.ke for 2026 documents & generate AI impacts (OCR enabled).</Text>
                    <TouchableOpacity 
                        style={[styles.triggerBtn, { backgroundColor: '#34C759' }]} 
                        onPress={handleTriggerBillIngest}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color="#fff" /> : (
                            <>
                                <MaterialCommunityIcons name="gavel" size={20} color="#fff" />
                                <Text style={styles.triggerBtnText}>Trigger Bill Sync</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Audit Logs</Text>
                <View style={styles.logsBox}>
                    <Text style={styles.logText}>{logs || 'Loading audit logs...'}</Text>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>System Notifications</Text>
                {notifications.map(n => (
                    <View key={n.id} style={[styles.notifItem, n.severity === 'High' && styles.notifHigh]}>
                        <View style={styles.row}>
                            <Text style={styles.notifType}>{n.type}</Text>
                            <Text style={styles.notifTime}>{new Date(n.created_at).toLocaleDateString()}</Text>
                        </View>
                        <Text style={styles.notifMsg}>{n.message}</Text>
                    </View>
                ))}
            </View>
        </ScrollView>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.appHeader}>
                <Text style={styles.headerTitle}>System Admin Portal</Text>
            </View>

            {loading && !refreshing && (
                <View style={styles.absoluteLoading}>
                    <ActivityIndicator size="large" color="#007AFF" />
                </View>
            )}

            <View style={{ flex: 1, paddingTop: 10 }}>
                {activeTab === 'overview' ? renderOverview() : 
                 activeTab === 'users' ? renderUsers() : 
                 activeTab === 'system' ? renderSystem() : renderDatabase()}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F2F2F7' },
    appHeader: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#1C1C1E' },
    mainTabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
    mainTab: { flex: 1, paddingVertical: 15, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
    mainTabActive: { borderBottomColor: '#007AFF' },
    mainTabText: { fontSize: 13, fontWeight: '700', color: '#8E8E93', textTransform: 'uppercase' },
    mainTabTextActive: { color: '#007AFF' },
    
    tabContent: { flex: 1 },
    metricsGrid: { padding: 15, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    metricCard: { backgroundColor: '#fff', borderRadius: 16, padding: 15, width: '48%', shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
    metricHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 6 },
    metricTitle: { fontSize: 13, fontWeight: '700', color: '#8E8E93' },
    metricValue: { fontSize: 28, fontWeight: '800', color: '#1C1C1E' },
    metricValueSmall: { fontSize: 20, fontWeight: '800', color: '#1C1C1E' },
    detailText: { fontSize: 11, color: '#8E8E93', marginTop: 2 },
    metricDetail: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#F2F2F7', paddingTop: 10 },
    darkCard: { backgroundColor: '#1C1C1E' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 15, backgroundColor: 'rgba(255,59,48,0.1)', padding: 8, borderRadius: 8 },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF3B30' },
    liveText: { fontSize: 10, fontWeight: '800', color: '#FF3B30' },
    
    subTabs: { flexDirection: 'row', padding: 10, backgroundColor: '#E5E5EA', margin: 15, borderRadius: 10 },
    subTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
    subTabActive: { backgroundColor: '#fff', elevation: 2 },
    subTabText: { fontSize: 13, fontWeight: '600', color: '#8E8E93' },
    subTabTextActive: { color: '#1C1C1E' },
    
    userCard: { backgroundColor: '#fff', padding: 15, marginHorizontal: 15, marginBottom: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
    userName: { fontSize: 16, fontWeight: '700', color: '#1C1C1E' },
    userEmail: { fontSize: 13, color: '#8E8E93', marginTop: 2 },
    userRole: { fontSize: 12, color: '#007AFF', marginTop: 4, fontWeight: '600' },
    userActions: { flexDirection: 'row', gap: 15 },
    tag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 8, marginRight: 6 },
    tagText: { fontSize: 10, fontWeight: '700' },
    tagActive: { backgroundColor: '#E8F5E9' },
    tagPaused: { backgroundColor: '#FFEBEE' },
    tagAdmin: { backgroundColor: '#E3F2FD' },
    tagCitizen: { backgroundColor: '#F5F5F5' },
    
    section: { padding: 15 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1C1C1E', marginBottom: 12 },
    card: { backgroundColor: '#fff', padding: 15, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
    cardTitle: { fontSize: 15, fontWeight: '700', color: '#1C1C1E' },
    cardDesc: { fontSize: 12, color: '#8E8E93', marginTop: 4, marginBottom: 15 },
    triggerBtn: { backgroundColor: '#1C1C1E', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 10, gap: 8 },
    triggerBtnText: { color: '#fff', fontWeight: '700' },
    
    logsBox: { backgroundColor: '#1C1C1E', padding: 15, borderRadius: 12, height: 250 },
    logText: { color: '#34C759', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 11 },
    
    notifItem: { backgroundColor: '#fff', padding: 12, borderRadius: 10, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#007AFF' },
    notifHigh: { borderLeftColor: '#FF3B30' },
    notifType: { fontSize: 11, fontWeight: '800', color: '#8E8E93', textTransform: 'uppercase' },
    notifTime: { fontSize: 11, color: '#8E8E93' },
    notifMsg: { fontSize: 13, color: '#1C1C1E', marginTop: 4 },
    
    reviewBtn: { backgroundColor: '#007AFF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
    reviewBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    
    modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modal: { backgroundColor: '#fff', borderRadius: 20, maxHeight: '80%' },
    modalHeader: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#F2F2F7', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    modalTitle: { fontSize: 18, fontWeight: '800', color: '#1C1C1E' },
    modalBody: { padding: 20 },
    modalLabel: { fontSize: 12, color: '#8E8E93', fontWeight: '700', textTransform: 'uppercase', marginTop: 15, marginBottom: 5 },
    modalValue: { fontSize: 16, fontWeight: '700', color: '#1C1C1E' },
    modalSubValue: { fontSize: 13, color: '#8E8E93' },
    docPreview: { marginTop: 15, alignItems: 'center' },
    previewImage: { width: '100%', height: 200, borderRadius: 12, resizeMode: 'contain', backgroundColor: '#F2F2F7' },
    emptyDoc: { width: '100%', height: 100, borderRadius: 12, backgroundColor: '#F2F2F7', justifyContent: 'center', alignItems: 'center' },
    docLabel: { fontSize: 11, color: '#8E8E93', marginTop: 5 },
    approveBtn: { backgroundColor: '#007AFF', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 30, marginBottom: 20 },
    approveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
    
    absoluteLoading: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
    
    // Database tab styles
    tableListItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10 },
    tableInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    tableListName: { fontSize: 16, fontWeight: '700', color: '#1C1C1E' },
    tableHeader: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E5EA', gap: 15 },
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    backBtnText: { color: '#007AFF', fontWeight: '600', fontSize: 14 },
    tableNameTitle: { fontSize: 16, fontWeight: '800', color: '#1C1C1E' },
    gridRowHeader: { flexDirection: 'row', backgroundColor: '#F2F2F7', borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
    gridHeaderCell: { width: 150, padding: 10, borderRightWidth: 1, borderRightColor: '#E5E5EA' },
    gridHeaderText: { fontSize: 12, fontWeight: '800', color: '#8E8E93', textTransform: 'uppercase' },
    gridRow: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
    gridCell: { width: 150, padding: 10, borderRightWidth: 1, borderRightColor: '#F2F2F7', justifyContent: 'center' },
    gridCellText: { fontSize: 13, color: '#1C1C1E' }
});
