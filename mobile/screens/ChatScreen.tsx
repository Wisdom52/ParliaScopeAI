import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Button } from '../components/ui/Button';
import { API_BASE_URL } from '../config/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Source {
    id: number;
    speaker: string;
    preview: string;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
    sources?: Source[];
}

export const ChatScreen: React.FC = () => {
    const [query, setQuery] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);

    const handleSend = async () => {
        if (!query.trim()) return;

        const userMsg: Message = { role: 'user', content: query };
        setMessages(prev => [...prev, userMsg]);
        setLoading(true);
        setQuery('');

        try {
            const response = await fetch(`${API_BASE_URL}/chat/hansard`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: userMsg.content }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessages(prev => [...prev, { role: 'assistant', content: data.answer, sources: data.sources }]);
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${data.detail || 'Failed'}` }]);
            }
        } catch (_error) {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Network error. Please try again.' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.header}>
                <Text style={styles.title}>Chat with Hansard</Text>
                <MaterialCommunityIcons name="chat-outline" size={24} color="#007AFF" />
            </View>

            <FlatList
                data={messages}
                keyExtractor={(_, i) => i.toString()}
                style={styles.messageList}
                renderItem={({ item }) => (
                    <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.botBubble]}>
                        <Text style={styles.role}>{item.role === 'user' ? 'You' : 'ParliaScope AI'}</Text>
                        <Text style={styles.msgText}>{item.content}</Text>
                        {item.sources && item.sources.length > 0 && (
                            <View style={styles.sources}>
                                <Text style={styles.sourcesLabel}>Sources:</Text>
                                {item.sources.map(src => (
                                    <Text key={src.id} style={styles.sourceItem}>• {src.speaker}: "{src.preview}"</Text>
                                ))}
                            </View>
                        )}
                    </View>
                )}
                ListEmptyComponent={<Text style={styles.empty}>Ask a question about parliamentary proceedings...</Text>}
            />

            {loading && <ActivityIndicator style={{ marginBottom: 8 }} />}

            <View style={styles.inputRow}>
                <TextInput
                    style={styles.input}
                    placeholder="Type your question..."
                    value={query}
                    onChangeText={setQuery}
                    onSubmitEditing={handleSend}
                    returnKeyType="send"
                />
                <Button label="Send" onPress={handleSend} disabled={loading} />
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#fff' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    title: { fontSize: 24, fontWeight: '800', color: '#1a1a1a', letterSpacing: -0.5 },
    messageList: { flex: 1, marginBottom: 16 },
    bubble: { padding: 14, borderRadius: 18, marginBottom: 12, maxWidth: '85%' },
    userBubble: { backgroundColor: '#007AFF', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
    botBubble: { backgroundColor: '#f0f0f0', alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
    role: { fontWeight: '700', fontSize: 11, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
    msgText: { fontSize: 15, lineHeight: 22 },
    sources: { marginTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: 8 },
    sourcesLabel: { fontWeight: '700', fontSize: 12, marginBottom: 4, color: '#666' },
    sourceItem: { fontSize: 12, color: '#666', marginBottom: 2, fontStyle: 'italic' },
    empty: { textAlign: 'center', color: '#888', marginTop: 60, fontSize: 15 },
    inputRow: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
    input: {
        flex: 1,
        paddingHorizontal: 16,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#f5f5f5',
        fontSize: 16,
        color: '#1a1a1a'
    },
});
