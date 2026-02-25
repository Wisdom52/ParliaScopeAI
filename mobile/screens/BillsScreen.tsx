import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { Button } from '../components/ui/Button';
import { ImpactCard } from '../components/ImpactCard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';
import { Feather } from '@expo/vector-icons';

interface Bill {
    id: number;
    title: string;
    summary: string;
    impacts: any[];
}

export const BillsScreen = () => {
    const [token, setToken] = useState<string | null>(null);
    const [bills, setBills] = useState<Bill[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [analyzingId, setAnalyzingId] = useState<number | null>(null);

    const fetchBills = async (currentToken: string | null) => {
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
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        const loadInitialData = async () => {
            const storedToken = await AsyncStorage.getItem('parliaScope_token');
            setToken(storedToken);
            await fetchBills(storedToken);
        };
        loadInitialData();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchBills(token);
    };

    const handleAnalyze = async (billId: number, rawText: string) => {
        setAnalyzingId(billId);
        try {
            const response = await fetch(`${API_BASE_URL}/bills/${billId}/analyze?raw_text=${encodeURIComponent(rawText)}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                // Background task started, let's poll after 5 seconds
                setTimeout(fetchBills, 5000);
            }
        } catch (error) {
            console.error("Failed to start analysis:", error);
            setAnalyzingId(null);
        }
    };

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text>Loading bills...</Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: '#F2F2F7' }}
            contentContainerStyle={{ padding: 16 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <View style={{ marginBottom: 24 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Feather name="activity" size={28} color="#007AFF" style={{ marginRight: 8 }} />
                    <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#1C1C1E' }}>
                        AI Bill Impact Engine
                    </Text>
                </View>
                <Text style={{ fontSize: 16, color: '#8E8E93', lineHeight: 22 }}>
                    Understand how complex legislation affects specific demographics.
                </Text>
            </View>

            {bills.length === 0 ? (
                <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
                    <Feather name="file-text" size={48} color="#C7C7CC" style={{ marginBottom: 16 }} />
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#8E8E93', marginBottom: 8 }}>No Bills Analyzed Yet</Text>
                    <Text style={{ fontSize: 14, color: '#AEAEB2', textAlign: 'center' }}>
                        Wait for new bills to be submitted for AI analysis.
                    </Text>
                </View>
            ) : (
                bills.map(bill => (
                    <View key={bill.id} style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: 16,
                        padding: 20,
                        marginBottom: 20,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 8,
                        elevation: 4
                    }}>
                        <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#007AFF', marginBottom: 8 }}>{bill.title}</Text>
                        <Text style={{ fontSize: 15, color: '#3A3A3C', lineHeight: 22, marginBottom: 20 }}>
                            {bill.summary}
                        </Text>

                        {bill.impacts && bill.impacts.length > 0 ? (
                            <View>
                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1C1C1E', marginBottom: 16 }}>
                                    AI Archetype Analysis
                                </Text>
                                {bill.impacts.map(impact => (
                                    <ImpactCard key={impact.id} impact={impact} />
                                ))}
                                <View style={{ marginTop: 12 }}>
                                    <Button
                                        label={analyzingId === bill.id ? "Re-Analyzing..." : "Refresh Analysis"}
                                        onPress={() => handleAnalyze(bill.id, bill.summary)}
                                        loading={analyzingId === bill.id}
                                    />
                                </View>
                            </View>
                        ) : (
                            <View style={{ backgroundColor: '#F2F2F7', padding: 20, borderRadius: 12, alignItems: 'center' }}>
                                <Text style={{ color: '#8E8E93', marginBottom: 16, textAlign: 'center' }}>
                                    This bill hasn't been segmented by the AI Engine yet.
                                </Text>
                                <View style={{ width: '100%' }}>
                                    <Button
                                        label="Run AI Analysis"
                                        onPress={() => handleAnalyze(bill.id, bill.summary)}
                                        loading={analyzingId === bill.id}
                                    />
                                </View>
                            </View>
                        )}
                    </View>
                ))
            )}
        </ScrollView>
    );
};
