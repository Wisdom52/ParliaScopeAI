import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TextInput, Image,
    TouchableOpacity, Modal, ScrollView, ActivityIndicator,
    SafeAreaView, RefreshControl, Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';
import { tokens } from '@shared/tokens';
import { Button } from '../components/ui/Button';

interface Review {
    id: number;
    rating: number;
    comment: string;
    user_name: string;
    created_at: string;
}

interface Representative {
    id: number;
    name: string;
    role: string;
    party: string;
    constituency_id: number;
    county_id: number;
    constituency_name?: string;
    county_name?: string;
    bio: string;
    education: string;
    experience: string;
    image_url: string;
    sittings_attended: number;
    votes_cast: number;
    bills_sponsored: number;
    average_rating: number;
    reviews: Review[];
}

export const RepresentativeScreen: React.FC = () => {
    const [reps, setReps] = useState<Representative[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRep, setSelectedRep] = useState<Representative | null>(null);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewComment, setReviewComment] = useState('');
    const [submittingReview, setSubmittingReview] = useState(false);
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const storedToken = await AsyncStorage.getItem('parliaScope_token');
        setToken(storedToken);
        fetchReps();
    };

    const fetchReps = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/representatives/`);
            if (res.ok) {
                setReps(await res.json());
            }
        } catch (e) {
            console.error("Failed to fetch reps", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchRepDetail = async (id: number) => {
        try {
            const res = await fetch(`${API_BASE_URL}/representatives/${id}`);
            if (res.ok) {
                setSelectedRep(await res.json());
            }
        } catch (e) {
            console.error("Failed to fetch rep detail", e);
        }
    };

    const handleReviewSubmit = async () => {
        if (!selectedRep || !token) return;
        setSubmittingReview(true);
        try {
            const res = await fetch(`${API_BASE_URL}/representatives/${selectedRep.id}/reviews`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    rating: reviewRating,
                    comment: reviewComment
                })
            });
            if (res.ok) {
                setReviewComment('');
                setReviewRating(5);
                fetchRepDetail(selectedRep.id);
                fetchReps();
            }
        } catch (e) {
            console.error("Failed to submit review", e);
        } finally {
            setSubmittingReview(false);
        }
    };

    const filteredReps = reps.filter(r =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.constituency_name || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderRepItem = ({ item }: { item: Representative }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => fetchRepDetail(item.id)}
            activeOpacity={0.7}
        >
            <Image source={{ uri: item.image_url }} style={styles.cardImage} />
            <View style={styles.cardContent}>
                <Text style={styles.cardName}>{item.name}</Text>
                <Text style={styles.cardSub}>{item.constituency_name || "National"}</Text>
                <View style={styles.tagRow}>
                    <View style={styles.partyTag}>
                        <Text style={styles.partyText}>{item.party}</Text>
                    </View>
                    <View style={styles.ratingTag}>
                        <MaterialCommunityIcons name="star" size={14} color="#16a34a" />
                        <Text style={styles.ratingText}>{item.average_rating.toFixed(1)}</Text>
                    </View>
                </View>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.searchContainer}>
                <MaterialCommunityIcons name="magnify" size={20} color="#999" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search name or constituency..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {loading && !refreshing ? (
                <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={filteredReps}
                    renderItem={renderRepItem}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.listContainer}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchReps(); }} />
                    }
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>No representatives found.</Text>
                    }
                />
            )}

            <Modal
                visible={!!selectedRep}
                animationType="slide"
                onRequestClose={() => setSelectedRep(null)}
            >
                {selectedRep && (
                    <SafeAreaView style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setSelectedRep(null)} style={styles.closeButton}>
                                <MaterialCommunityIcons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>MP Profile</Text>
                            <View style={{ width: 24 }} />
                        </View>

                        <ScrollView style={styles.modalScroll} contentContainerStyle={{ paddingBottom: 40 }}>
                            <View style={styles.profileHeader}>
                                <Image source={{ uri: selectedRep.image_url }} style={styles.profileImage} />
                                <Text style={styles.profileName}>{selectedRep.name}</Text>
                                <View style={styles.profileMeta}>
                                    <Text style={styles.profileSub}>{selectedRep.party} • {selectedRep.constituency_name}</Text>
                                </View>
                            </View>

                            <View style={styles.statsRow}>
                                <View style={styles.statBox}>
                                    <Text style={styles.statVal}>{selectedRep.bills_sponsored}</Text>
                                    <Text style={styles.statLabel}>Bills</Text>
                                </View>
                                <View style={styles.statBox}>
                                    <Text style={styles.statVal}>{selectedRep.sittings_attended}</Text>
                                    <Text style={styles.statLabel}>Sittings</Text>
                                </View>
                                <View style={styles.statBox}>
                                    <Text style={styles.statVal}>{selectedRep.votes_cast}</Text>
                                    <Text style={styles.statLabel}>Votes</Text>
                                </View>
                            </View>

                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Biography</Text>
                                <Text style={styles.sectionText}>{selectedRep.bio}</Text>
                            </View>

                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Education</Text>
                                <View style={styles.infoBox}>
                                    <Text style={styles.infoText}>{selectedRep.education || "Information not available."}</Text>
                                </View>
                            </View>

                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Experience</Text>
                                <View style={styles.infoBox}>
                                    <Text style={styles.infoText}>{selectedRep.experience || "Information not available."}</Text>
                                </View>
                            </View>

                            <View style={styles.section}>
                                <View style={styles.reviewHeaderRow}>
                                    <Text style={styles.sectionTitle}>Citizen Reviews</Text>
                                    <Text style={styles.reviewCount}>({selectedRep.reviews.length})</Text>
                                </View>

                                {token ? (
                                    <View style={styles.reviewForm}>
                                        <Text style={styles.formLabel}>Rate this representative</Text>
                                        <View style={styles.starRow}>
                                            {[1, 2, 3, 4, 5].map(s => (
                                                <TouchableOpacity key={s} onPress={() => setReviewRating(s)}>
                                                    <MaterialCommunityIcons
                                                        name={s <= reviewRating ? "star" : "star-outline"}
                                                        size={32}
                                                        color="#eab308"
                                                    />
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                        <TextInput
                                            placeholder="Write your review..."
                                            value={reviewComment}
                                            onChangeText={setReviewComment}
                                            style={styles.commentInput}
                                            multiline
                                        />
                                        <Button
                                            label={submittingReview ? 'Submitting...' : 'Submit Review'}
                                            onPress={handleReviewSubmit}
                                            disabled={submittingReview}
                                        />
                                    </View>
                                ) : (
                                    <View style={styles.loginCard}>
                                        <Text style={styles.loginNote}>Sign in to review your representative.</Text>
                                    </View>
                                )}

                                {selectedRep.reviews.map(review => (
                                    <View key={review.id} style={styles.reviewItem}>
                                        <View style={styles.reviewHead}>
                                            <Text style={styles.reviewer}>{review.user_name}</Text>
                                            <View style={styles.miniStarRow}>
                                                {[...Array(5)].map((_, i) => (
                                                    <MaterialCommunityIcons key={i} name="star" size={14} color={i < review.rating ? "#eab308" : "#eee"} />
                                                ))}
                                            </View>
                                        </View>
                                        <Text style={styles.reviewComment}>{review.comment}</Text>
                                        <Text style={styles.reviewDate}>{new Date(review.created_at).toLocaleDateString()}</Text>
                                    </View>
                                ))}
                            </View>
                        </ScrollView>
                    </SafeAreaView>
                )}
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa' },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        margin: 15,
        paddingHorizontal: 15,
        borderRadius: 12,
        height: 50,
        borderWidth: 1,
        borderColor: '#eee',
    },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },
    listContainer: { padding: 15 },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#f0f0f0',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    cardImage: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#eee' },
    cardContent: { flex: 1, marginLeft: 15 },
    cardName: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
    cardSub: { fontSize: 13, color: '#666', marginTop: 2 },
    tagRow: { flexDirection: 'row', marginTop: 8, gap: 8 },
    partyTag: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#eef2ff', borderRadius: 6 },
    partyText: { fontSize: 11, color: '#4f46e5', fontWeight: '600' },
    ratingTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#f0fdf4', borderRadius: 6 },
    ratingText: { fontSize: 11, color: '#16a34a', fontWeight: '700', marginLeft: 4 },
    emptyText: { textAlign: 'center', marginTop: 40, color: '#999', fontSize: 14 },

    modalContainer: { flex: 1, backgroundColor: '#fff' },
    modalHeader: {
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee'
    },
    modalTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
    closeButton: { padding: 5 },
    modalScroll: { flex: 1 },
    profileHeader: { alignItems: 'center', padding: 30 },
    profileImage: { width: 100, height: 100, borderRadius: 50, marginBottom: 15, backgroundColor: '#eee' },
    profileName: { fontSize: 24, fontWeight: '800', textAlign: 'center', color: '#1a1a1a' },
    profileMeta: { marginTop: 5 },
    profileSub: { fontSize: 14, color: '#666' },

    statsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 30 },
    statBox: { flex: 1, alignItems: 'center', padding: 15, backgroundColor: '#f8fafc', borderRadius: 16, marginHorizontal: 5 },
    statVal: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
    statLabel: { fontSize: 12, color: '#64748b', marginTop: 4 },

    section: { paddingHorizontal: 20, marginBottom: 25 },
    sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, color: '#1a1a1a' },
    sectionText: { fontSize: 15, color: '#4b5563', lineHeight: 22 },
    infoBox: { backgroundColor: '#f9fafb', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9' },
    infoText: { fontSize: 14, color: '#4b5563', lineHeight: 20 },

    reviewHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    reviewCount: { fontSize: 16, color: '#999', marginLeft: 8 },
    reviewForm: { backgroundColor: '#f3f4f6', padding: 15, borderRadius: 16, marginBottom: 20 },
    formLabel: { fontWeight: '700', marginBottom: 10, color: '#374151' },
    starRow: { flexDirection: 'row', gap: 12, marginBottom: 15 },
    commentInput: { backgroundColor: '#fff', borderRadius: 12, padding: 12, height: 100, marginBottom: 15, textAlignVertical: 'top', borderWidth: 1, borderColor: '#e5e7eb' },

    loginCard: { padding: 15, backgroundColor: '#fff7ed', borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#ffedd5' },
    loginNote: { color: '#c2410c', textAlign: 'center', fontSize: 14 },

    reviewItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
    reviewHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    reviewer: { fontWeight: '700', fontSize: 14, color: '#1a1a1a' },
    miniStarRow: { flexDirection: 'row', gap: 2 },
    reviewComment: { fontSize: 14, color: '#4b5563', lineHeight: 20 },
    reviewDate: { fontSize: 11, color: '#9ca3af', marginTop: 6 }
});
