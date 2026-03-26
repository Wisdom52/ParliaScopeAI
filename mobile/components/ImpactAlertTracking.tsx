import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Input } from './ui/Input';
import { API_BASE_URL } from '../config/api';

interface ImpactAlertTrackingProps {
    token: string | null;
}

export const ImpactAlertTracking: React.FC<ImpactAlertTrackingProps> = ({ token }) => {
    const [subscriptions, setSubscriptions] = useState<any[]>([]);
    const [newTopic, setNewTopic] = useState('');
    const [loading, setLoading] = useState(false);

    const fetchSubscriptions = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/subscriptions/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setSubscriptions(data);
            }
        } catch (error) {
            console.error("Failed to fetch subscriptions:", error);
        }
    };

    useEffect(() => {
        if (token) fetchSubscriptions();
    }, [token]);

    const handleAddTopic = async () => {
        if (!newTopic.trim()) return;
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/subscriptions/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ topic: newTopic.trim() })
            });
            if (response.ok) {
                setNewTopic('');
                fetchSubscriptions();
            } else {
                Alert.alert("Error", "Could not add topic.");
            }
        } catch (error) {
            Alert.alert("Network Error", "Failed to add topic.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            const response = await fetch(`${API_BASE_URL}/subscriptions/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                fetchSubscriptions();
            }
        } catch (error) {
            console.error("Failed to delete subscription:", error);
        }
    };

    return (
        <View style={styles.card}>
            <View style={styles.badge}>
                <Text style={styles.badgeText}>AI POWERED ALERTS</Text>
            </View>

            <View style={styles.header}>
                <MaterialCommunityIcons name="target" size={20} color="#007AFF" />
                <Text style={styles.title}>Impact & Alert Tracking</Text>
            </View>
            
            <Text style={styles.description}>
                Set specific topics (e.g. Teachers, Mining) for AI tracking and receive <Text style={{fontWeight: '700'}}>instant alerts</Text> on matching legislation.
            </Text>

            <View style={styles.inputRow}>
                <View style={{ flex: 1 }}>
                    <Input
                        value={newTopic}
                        onChangeText={setNewTopic}
                        placeholder="e.g. Hospitality, Mining..."
                    />
                </View>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={handleAddTopic}
                    disabled={loading}
                >
                    {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.addButtonText}>Add</Text>}
                </TouchableOpacity>
            </View>

            <View style={styles.chipsContainer}>
                {subscriptions.filter(s => s.topic).map(sub => (
                    <View key={sub.id} style={styles.chip}>
                        <MaterialCommunityIcons name="bell-ring" size={14} color="#0ca678" />
                        <Text style={styles.chipText}>{sub.topic}</Text>
                        <TouchableOpacity onPress={() => handleDelete(sub.id)}>
                            <MaterialCommunityIcons name="close-circle" size={16} color="#FF3B30" />
                        </TouchableOpacity>
                    </View>
                ))}
                {subscriptions.filter(s => s.topic).length === 0 && (
                    <Text style={styles.emptyText}>No tracking topics set.</Text>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
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
        position: 'relative',
        overflow: 'hidden'
    },
    badge: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderBottomLeftRadius: 8,
    },
    badgeText: {
        color: '#16a34a',
        fontSize: 10,
        fontWeight: '800',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        marginTop: 5
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#007AFF',
        marginLeft: 8,
    },
    description: {
        fontSize: 13,
        color: '#666',
        lineHeight: 18,
        marginBottom: 15,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 15,
    },
    addButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 20,
        height: 48,
        justifyContent: 'center',
        borderRadius: 12,
    },
    addButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e6fcf5',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 4,
        borderWidth: 1,
        borderColor: '#c3fae8'
    },
    chipText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#0ca678',
    },
    emptyText: {
        fontSize: 13,
        color: '#8E8E93',
        fontStyle: 'italic',
    }
});
