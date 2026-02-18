import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { HomeScreen } from './screens/HomeScreen';
import { SearchScreen } from './screens/SearchScreen';
import { ChatScreen } from './screens/ChatScreen';
import { ListenScreen } from './screens/ListenScreen';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type TabId = 'home' | 'search' | 'chat' | 'listen';

const TABS: { id: TabId; label: string; icon: keyof typeof MaterialCommunityIcons.hasIcon | string }[] = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'search', label: 'Search', icon: 'magnify' },
    { id: 'chat', label: 'Chat', icon: 'chat' },
    { id: 'listen', label: 'Listen', icon: 'headphones' },
];

export default function App() {
    const [isOnboarded, setIsOnboarded] = useState(false);
    const [activeTab, setActiveTab] = useState<TabId>('home');

    const handleOnboardingComplete = () => {
        setIsOnboarded(true);
    };

    if (!isOnboarded) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <OnboardingScreen onComplete={handleOnboardingComplete} />
                <StatusBar style="auto" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>ParliaScope</Text>
            </View>

            {/* Tab Content */}
            <View style={styles.content}>
                {activeTab === 'home' && <HomeScreen onNavigate={(tab) => setActiveTab(tab as TabId)} />}
                {activeTab === 'search' && <SearchScreen />}
                {activeTab === 'chat' && <ChatScreen />}
                {activeTab === 'listen' && <ListenScreen />}
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
        </SafeAreaView>
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
