import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Input } from './ui/Input';
import { API_BASE_URL } from '../config/api';

interface AlertSettingsProps {
    token: string | null;
}

export const AlertSettings: React.FC<AlertSettingsProps> = ({ token }) => {
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
            <View style={styles.header}>
                <MaterialCommunityIcons name="bell-ring" size={20} color="#007AFF" />
                <Text style={styles.title}>Alert Preferences</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Followed Topics</Text>

                <View style={styles.inputRow}>
                    <View style={{ flex: 1 }}>
                        <Input
                            value={newTopic}
                            onChangeText={setNewTopic}
                            placeholder="e.g., Housing, Finance..."
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
                            <Text style={styles.chipText}>{sub.topic}</Text>
                            <TouchableOpacity onPress={() => handleDelete(sub.id)}>
                                <MaterialCommunityIcons name="close-circle" size={16} color="#FF3B30" />
                            </TouchableOpacity>
                        </View>
                    ))}
                    {subscriptions.filter(s => s.topic).length === 0 && (
                        <Text style={styles.emptyText}>No topics followed yet.</Text>
                    )}
                </View>
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
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#007AFF',
        marginLeft: 8,
    },
    section: {
        marginBottom: 10,
    },
    label: {
        fontSize: 12,
        color: '#8E8E93',
        textTransform: 'uppercase',
        marginBottom: 10,
        letterSpacing: 0.5,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 15,
    },
    addButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 15,
        height: 44, // Match Input height roughly
        justifyContent: 'center',
        borderRadius: 10,
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
        backgroundColor: '#F2F2F7',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 5,
    },
    chipText: {
        fontSize: 13,
        color: '#1C1C1E',
    },
    emptyText: {
        fontSize: 13,
        color: '#8E8E93',
        fontStyle: 'italic',
    }
});
