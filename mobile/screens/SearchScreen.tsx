import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Button } from '../components/ui/Button';
import { API_BASE_URL } from '../config/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface SearchResult {
    id: number;
    speaker_name: string;
    content: string;
    created_at: string;
}

interface HistoryItem {
    query: string;
}

interface Hansard {
    id: number;
    title: string;
    pdf_url: string;
    created_at: string;
}

export const SearchScreen: React.FC = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [documents, setDocuments] = useState<Hansard[]>([]);
    const [loading, setLoading] = useState(false);
    const [docsLoading, setDocsLoading] = useState(false);

    const fetchHistory = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/search/history`);
            if (res.ok) setHistory(await res.json());
        } catch (e) {
            console.error("History fetch failed", e);
        }
    };

    const fetchDocs = async () => {
        setDocsLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/docs/`);
            if (res.ok) setDocuments(await res.json());
        } catch (e) {
            console.error("Docs fetch failed", e);
        } finally {
            setDocsLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
        fetchDocs();
    }, []);

    const handleSearch = async () => {
        if (!query.trim()) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/search/query?q=${encodeURIComponent(query)}`);
            if (res.ok) {
                setResults(await res.json());
                fetchHistory();
            }
        } catch (e) {
            console.error("Search failed", e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
            </View>

            <View style={styles.searchRow}>
                <View style={styles.inputContainer}>
                    <MaterialCommunityIcons name="magnify" size={20} color="#888" style={styles.searchIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Topics, speakers, keywords..."
                        value={query}
                        onChangeText={setQuery}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                    />
                </View>
                <Button label="Search" onPress={handleSearch} disabled={loading} />
            </View>

            {loading && <ActivityIndicator style={{ marginTop: 20 }} />}

            <FlatList
                data={results}
                keyExtractor={item => item.id.toString()}
                style={{ marginTop: 12 }}
                renderItem={({ item }) => (
                    <View style={styles.resultCard}>
                        <View style={styles.resultHeader}>
                            <Text style={styles.speaker}>{item.speaker_name}</Text>
                            <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
                        </View>
                        <Text style={styles.content}>{item.content}</Text>
                    </View>
                )}
                ListEmptyComponent={!loading && query ? <Text style={styles.empty}>No results found.</Text> : null}
            />

            {history.length > 0 && !results.length && (
                <View style={styles.historySection}>
                    <Text style={styles.historyTitle}>Recent Searches</Text>
                    {history.slice(0, 5).map((h, i) => (
                        <TouchableOpacity key={i} onPress={() => { setQuery(h.query); handleSearch(); }}>
                            <Text style={styles.historyItem}>{h.query}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {!results.length && (
                <View style={styles.docsSection}>
                    <Text style={styles.historyTitle}>Processed Documents</Text>
                    {docsLoading ? (
                        <ActivityIndicator size="small" color="#007AFF" style={{ marginTop: 10 }} />
                    ) : documents.length > 0 ? (
                        documents.map(doc => (
                            <TouchableOpacity key={doc.id} style={styles.docListItem}>
                                <MaterialCommunityIcons name="file-document-outline" size={24} color="#007AFF" />
                                <View style={{ marginLeft: 12, flex: 1 }}>
                                    <Text style={styles.speaker}>{doc.title}</Text>
                                    <Text style={styles.date}>{new Date(doc.created_at).toLocaleDateString()}</Text>
                                </View>
                            </TouchableOpacity>
                        ))
                    ) : (
                        <Text style={styles.empty}>No documents processed yet.</Text>
                    )}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#fff' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 24, fontWeight: '800', color: '#1a1a1a', letterSpacing: -0.5 },
    searchRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 20 },
    inputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 48,
        borderWidth: 1,
        borderColor: '#eee'
    },
    searchIcon: { marginRight: 8 },
    input: { flex: 1, fontSize: 16, color: '#1a1a1a' },
    resultCard: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#f0f0f0',
        backgroundColor: '#fff',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1
    },
    resultHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    speaker: { fontWeight: '700', fontSize: 15, color: '#1a1a1a' },
    date: { color: '#888', fontSize: 13 },
    content: { fontSize: 14, color: '#444', lineHeight: 20 },
    empty: { textAlign: 'center', color: '#888', marginTop: 40, fontSize: 15 },
    historySection: { marginTop: 24, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 16 },
    historyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, color: '#1a1a1a' },
    historyItem: { color: '#007AFF', paddingVertical: 8, fontSize: 15, fontWeight: '500' },
    docsSection: { marginTop: 24 },
    docListItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#f9f9f9',
        borderRadius: 12,
        marginBottom: 8
    }
});
