import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Input } from '../components/ui/Input';
import { ImpactAlertTracking } from '../components/ImpactAlertTracking';
import { Switch } from 'react-native';

interface ProfileScreenProps {
    user: any;
    token: string | null;
    onUpdate: () => void;
    onLogout: () => void;
}

import { API_BASE_URL } from '../config/api';

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ user, token, onUpdate, onLogout }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        full_name: user?.full_name || '',
        id_number: user?.id_number || '',
        county_id: user?.county_id || 0,
        constituency_id: user?.constituency_id || 0,
        whatsapp_number: user?.whatsapp_number || '',
        push_token: user?.push_token || '',
        display_name: user?.display_name || '',
        is_anonymous_default: user?.is_anonymous_default || false
    });
    const [counties, setCounties] = useState<any[]>([]);
    const [constituencies, setConstituencies] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [gamification, setGamification] = useState({ points: 0, badges: [] as any[] });

    const [leaderStats, setLeaderStats] = useState<any>(null);

    useEffect(() => {
        fetch(`${API_BASE_URL}/location/counties`)
            .then(res => res.json())
            .then(data => setCounties(data))
            .catch(err => console.error("Failed to fetch counties", err));
        
        if (user?.role === 'LEADER' && user?.speaker_id) {
            fetchLeaderStats();
        } else if (user) {
            fetchGamification();
        }
    }, [user]);

    const fetchGamification = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/baraza/user/gamification`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setGamification({
                    points: data.prosperity_points ?? 0,
                    badges: Array.isArray(data.badges) ? data.badges : []
                });
            }
        } catch (e) {
            console.error("Failed to fetch gamification", e);
        }
    };

    const fetchLeaderStats = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/representatives/${user.speaker_id}`);
            if (res.ok) {
                const data = await res.json();
                setLeaderStats(data);
            }
        } catch (e) {
            console.error("Failed to fetch leader stats", e);
        }
    };

    useEffect(() => {
        if (formData.county_id) {
            fetch(`${API_BASE_URL}/location/constituencies?county_id=${formData.county_id}`)
                .then(res => res.json())
                .then(data => setConstituencies(data))
                .catch(err => console.error("Failed to fetch constituencies", err));
        }
    }, [formData.county_id]);

    const handleSave = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/auth/profile`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
            if (response.ok) {
                Alert.alert("Success", "Profile updated successfully!");
                setIsEditing(false);
                onUpdate();
            } else {
                Alert.alert("Error", "Failed to update profile.");
            }
        } catch (error) {
            Alert.alert("Error", "Error connecting to server.");
        } finally {
            setLoading(false);
        }
    };

    const confirmLogout = () => {
        Alert.alert(
            "Logout",
            "Are you sure you want to log out?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Logout", style: "destructive", onPress: onLogout }
            ]
        );
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <View style={styles.avatarContainer}>
                    <MaterialCommunityIcons name="account" size={60} color="#fff" />
                </View>
                <Text style={styles.userName}>{user?.full_name || 'ParliaScope User'}</Text>
                <Text style={styles.userEmail}>{user?.email}</Text>
            </View>

            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Account Information</Text>
                    {!isEditing && (
                        <TouchableOpacity onPress={() => setIsEditing(true)}>
                            <Text style={styles.editLink}>Edit</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.card}>
                    <View style={styles.field}>
                        <Text style={styles.label}>Full Name</Text>
                        {isEditing ? (
                            <Input value={formData.full_name} onChangeText={(text) => setFormData({ ...formData, full_name: text })} />
                        ) : (
                            <Text style={styles.value}>{user?.full_name || 'Not provided'}</Text>
                        )}
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>ID / Passport Number</Text>
                        {isEditing ? (
                            <Input value={formData.id_number} onChangeText={(text) => setFormData({ ...formData, id_number: text })} />
                        ) : (
                            <Text style={styles.value}>{user?.id_number || 'Not provided'}</Text>
                        )}
                    </View>

                    {user?.role !== 'LEADER' && !user?.is_admin && (
                        <>
                            <View style={styles.field}>
                                <Text style={styles.label}>WhatsApp Number (Alerts)</Text>
                                {isEditing ? (
                                    <Input
                                        value={formData.whatsapp_number}
                                        onChangeText={(text) => setFormData({ ...formData, whatsapp_number: text })}
                                        placeholder="+254700000000"
                                    />
                                ) : (
                                    <Text style={styles.value}>{user?.whatsapp_number || 'Not provided'}</Text>
                                )}
                            </View>

                            <View style={styles.field}>
                                <Text style={styles.label}>Public Display Name (Pseudonym)</Text>
                                {isEditing ? (
                                    <Input
                                        value={formData.display_name}
                                        onChangeText={(text) => setFormData({ ...formData, display_name: text })}
                                        placeholder="e.g. Concerned Citizen 001"
                                    />
                                ) : (
                                    <Text style={styles.value}>{user?.display_name || 'Not provided'}</Text>
                                )}
                            </View>
                        </>
                    )}
                </View>

                {!user?.is_admin && (
                    <>
                        <Text style={styles.sectionTitle}>{user?.role === 'LEADER' ? 'Representation Location' : 'Location Details'}</Text>
                        <View style={styles.card}>
                            <View style={styles.field}>
                                <Text style={styles.label}>County</Text>
                                {isEditing ? (
                                    <View style={styles.pickerContainer}>
                                        {counties.map(c => (
                                            <TouchableOpacity
                                                key={c.id}
                                                style={[styles.chip, formData.county_id === c.id && styles.chipActive]}
                                                onPress={() => setFormData({ ...formData, county_id: c.id, constituency_id: 0 })}
                                            >
                                                <Text style={[styles.chipText, formData.county_id === c.id && styles.chipTextActive]}>{c.name}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                ) : (
                                    <Text style={styles.value}>{user?.role === 'LEADER' ? (leaderStats?.county_name || leaderStats?.county_id || 'National') : (user?.county_name || 'Not selected')}</Text>
                                )}
                            </View>

                            <View style={styles.field}>
                                <Text style={styles.label}>Constituency</Text>
                                {isEditing ? (
                                    <View style={styles.pickerContainer}>
                                        {constituencies.map(c => (
                                            <TouchableOpacity
                                                key={c.id}
                                                style={[styles.chip, formData.constituency_id === c.id && styles.chipActive]}
                                                onPress={() => setFormData({ ...formData, constituency_id: c.id })}
                                            >
                                                <Text style={[styles.chipText, formData.constituency_id === c.id && styles.chipTextActive]}>{c.name}</Text>
                                            </TouchableOpacity>
                                        ))}
                                        {!formData.county_id && <Text style={styles.placeholder}>Select a county first</Text>}
                                    </View>
                                ) : (
                                    <Text style={styles.value}>{user?.role === 'LEADER' ? (leaderStats?.constituency_name || leaderStats?.constituency_id || 'National') : (user?.constituency_name || 'Not selected')}</Text>
                                )}
                            </View>
                        </View>
                    </>
                )}

                {/* Civic Passport (Gamification) - Citizens only */}
                {user?.role !== 'LEADER' && !user?.is_admin && (
                    <View style={styles.passportCard}>
                        <View style={styles.sectionHeader}>
                            <MaterialCommunityIcons name="trophy" size={20} color="#FFD700" />
                            <Text style={[styles.sectionTitle, { color: '#FFD700', marginLeft: 8 }]}>Civic Passport</Text>
                        </View>
                        
                        <View style={styles.pointsContainer}>
                            <View>
                                <Text style={styles.pointsLabel}>Prosperity Points</Text>
                                <Text style={styles.pointsValue}>{gamification.points}</Text>
                            </View>
                            <View style={styles.rankBadge}>
                                <Text style={styles.rankText}>
                                    {gamification.points < 50 ? 'NOVICE' : gamification.points < 200 ? 'PATRIOT' : 'CHAMPION'}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.progressBarContainer}>
                            <View style={[styles.progressBar, { width: `${Math.min((gamification.points / 200) * 100, 100)}%` }]} />
                        </View>

                        <Text style={styles.badgesHeader}>Earned Badges</Text>
                        <View style={styles.badgesGrid}>
                            {gamification.badges.length > 0 ? gamification.badges.map((badge, idx) => (
                                <View key={idx} style={styles.badgeItem}>
                                    <Text style={styles.badgeIcon}>{badge.icon_url || '🏅'}</Text>
                                    <Text style={styles.badgeName} numberOfLines={1}>{badge.name}</Text>
                                </View>
                            )) : (
                                <View style={styles.emptyBadges}>
                                    <Text style={styles.emptyBadgesText}>No badges yet. Start a quiz in Baraza!</Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}

                {/* Unified Impact & Alert Tracking (Citizens only) */}
                {user?.role !== 'LEADER' && !user?.is_admin && <ImpactAlertTracking token={token} />}

                {/* Baraza Privacy Settings */}
                {user?.role !== 'LEADER' && !user?.is_admin && (
                    <View style={styles.card}>
                        <View style={styles.sectionHeader}>
                            <MaterialCommunityIcons name="shield-account" size={20} color="#007AFF" />
                            <Text style={[styles.sectionTitle, { marginLeft: 8 }]}>Baraza Privacy</Text>
                        </View>
                        
                        <View style={styles.anonymityOption}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.optionsTitle}>Post Anonymously by Default</Text>
                                <Text style={styles.optionSub}>Hide your real name on public forum posts</Text>
                            </View>
                            <Switch
                                value={isEditing ? formData.is_anonymous_default : user.is_anonymous_default}
                                onValueChange={(val) => isEditing && setFormData({ ...formData, is_anonymous_default: val })}
                                disabled={!isEditing}
                                trackColor={{ false: "#D1D1D6", true: "#34C759" }}
                            />
                        </View>
                    </View>
                )}
            </View>

            {isEditing && (
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.button, styles.cancelButton]}
                        onPress={() => setIsEditing(false)}
                    >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.button, styles.saveButton]}
                        onPress={handleSave}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
                    </TouchableOpacity>
                </View>
            )}

            <TouchableOpacity style={styles.logoutButton} onPress={confirmLogout}>
                <MaterialCommunityIcons name="logout" size={20} color="#FF3B30" />
                <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F2F2F7' },
    content: { paddingBottom: 40 },
    header: {
        backgroundColor: '#007AFF',
        padding: 30,
        alignItems: 'center',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    avatarContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    userName: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 5 },
    userEmail: { fontSize: 16, color: 'rgba(255,255,255,0.8)' },
    section: { padding: 20 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1C1C1E', marginBottom: 15 },
    editLink: { color: '#007AFF', fontWeight: '600' },
    card: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 15,
        marginBottom: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    field: { marginBottom: 15 },
    label: { fontSize: 12, color: '#8E8E93', textTransform: 'uppercase', marginBottom: 5, letterSpacing: 0.5 },
    value: { fontSize: 16, color: '#1C1C1E', fontWeight: '500' },
    pickerContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 5 },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#F2F2F7',
        borderWidth: 1,
        borderColor: '#E5E5EA',
    },
    chipActive: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    chipText: { fontSize: 13, color: '#3A3A3C' },
    chipTextActive: { color: '#fff', fontWeight: '600' },
    placeholder: { color: '#8E8E93', fontStyle: 'italic' },
    actions: { flexDirection: 'row', paddingHorizontal: 20, gap: 15, marginBottom: 20 },
    button: { flex: 1, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    cancelButton: { backgroundColor: '#E5E5EA' },
    cancelButtonText: { color: '#1C1C1E', fontWeight: '600' },
    saveButton: { backgroundColor: '#007AFF' },
    saveButtonText: { color: '#fff', fontWeight: '600' },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        paddingVertical: 15,
        marginHorizontal: 20,
        backgroundColor: '#fff',
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#FFD6D6',
    },
    logoutText: { color: '#FF3B30', fontWeight: '700', marginLeft: 10, fontSize: 16 },

    // Web Parity Styles
    passportCard: {
        backgroundColor: '#1C1C1E',
        borderRadius: 20,
        padding: 20,
        marginBottom: 25,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 5
    },
    pointsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 15
    },
    pointsLabel: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.6)',
        marginBottom: 4,
        fontWeight: '600'
    },
    pointsValue: {
        fontSize: 32,
        fontWeight: '800',
        color: '#fff'
    },
    rankBadge: {
        backgroundColor: 'rgba(255, 215, 0, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.3)'
    },
    rankText: {
        color: '#FFD700',
        fontSize: 11,
        fontWeight: '800'
    },
    progressBarContainer: {
        height: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 25
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#FFD700',
        borderRadius: 4
    },
    badgesHeader: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.6)',
        fontWeight: '700',
        textTransform: 'uppercase',
        marginBottom: 15,
        letterSpacing: 0.5
    },
    badgesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12
    },
    badgeItem: {
        width: 75,
        alignItems: 'center',
        padding: 10,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12
    },
    badgeIcon: {
        fontSize: 24,
        marginBottom: 6
    },
    badgeName: {
        fontSize: 9,
        fontWeight: '700',
        color: '#fff',
        textAlign: 'center'
    },
    emptyBadges: {
        padding: 20,
        width: '100%',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
        borderStyle: 'dashed'
    },
    emptyBadgesText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        fontStyle: 'italic'
    },
    anonymityOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        marginTop: 5
    },
    optionsTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1C1C1E'
    },
    optionSub: {
        fontSize: 12,
        color: '#8E8E93',
        marginTop: 2
    }
});
