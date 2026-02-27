import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, Platform, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { HomeScreen } from './screens/HomeScreen';
import { SearchScreen } from './screens/SearchScreen';
import { DailyScreen } from './screens/DailyScreen';
import { RepresentativeScreen } from './screens/RepresentativeScreen';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ProfileScreen } from './screens/ProfileScreen';
import { API_BASE_URL } from './config/api';

type TabId = 'daily' | 'docs' | 'representative' | 'profile';

const TABS: { id: TabId; label: string; icon: any }[] = [
    { id: 'daily', label: 'Daily', icon: 'calendar-blank' },
    { id: 'docs', label: 'Docs', icon: 'file-document-outline' },
    { id: 'representative', label: 'Representative', icon: 'account-group-outline' },
    { id: 'profile', label: 'Profile', icon: 'account-outline' },
];

export default function App() {
    const [user, setUser] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<TabId>('daily');
    const [token, setToken] = useState<string | null>(null);

    const checkAuth = async () => {
        try {
            const storedToken = await AsyncStorage.getItem('parliaScope_token');
            setToken(storedToken);
            if (storedToken) {
                const response = await fetch(`${API_BASE_URL}/auth/me`, {
                    headers: { 'Authorization': `Bearer ${storedToken}` }
                });
                if (response.ok) {
                    setUser(await response.json());
                } else {
                    await handleLogout();
                }
            }
        } catch (e) {
            console.error("Auth check failed", e);
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    const handleOnboardingComplete = () => {
        checkAuth();
        setActiveTab('profile');
    };

    const handleLogout = async () => {
        await AsyncStorage.removeItem('parliaScope_token');
        setUser(null);
        setToken(null);
        setActiveTab('daily');
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>ParliaScope</Text>
            </View>

            <View style={styles.content}>
                {/* Tab Content */}
                {activeTab === 'daily' && <DailyScreen />}
                {activeTab === 'docs' && <SearchScreen />}
                {activeTab === 'representative' && <RepresentativeScreen onSwitchToProfile={() => setActiveTab('profile')} />}
                {activeTab === 'profile' && (
                    user ? (
                        <ProfileScreen
                            user={user}
                            token={token}
                            onUpdate={checkAuth}
                            onLogout={handleLogout}
                        />
                    ) : (
                        <OnboardingScreen onComplete={handleOnboardingComplete} />
                    )
                )}
            </View>

            {/* Bottom Tab Bar */}
            <View style={styles.tabBar}>
                {TABS.map(tab => (
                    <TouchableOpacity
                        key={tab.id}
                        style={[styles.tabButton, activeTab === tab.id && styles.tabActive]}
                        onPress={() => setActiveTab(tab.id)}
                    >
                        <MaterialCommunityIcons
                            name={tab.icon as any}
                            size={24}
                            color={activeTab === tab.id ? '#007AFF' : '#888'}
                        />
                        <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <StatusBar style="auto" />
        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#fff',
        paddingTop: Platform.OS === 'android' ? Constants.statusBarHeight : 0,
    },
    header: {
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        backgroundColor: '#fff',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#007AFF',
        letterSpacing: -0.5
    },
    profileIcon: {
        padding: 5
    },
    content: { flex: 1 },
    tabBar: {
        flexDirection: 'row',
        height: 64,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        backgroundColor: '#fff',
        paddingBottom: Platform.OS === 'ios' ? 10 : 0,
    },
    tabButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabActive: {},
    tabIcon: { marginBottom: 2 },
    tabLabel: { fontSize: 11, color: '#888', fontWeight: '500' },
    tabLabelActive: { color: '#007AFF', fontWeight: '700' },
});
