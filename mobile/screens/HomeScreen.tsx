import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Props {
    onNavigate: (tab: string) => void;
}

const cards = [
    { id: 'search', icon: 'magnify', title: 'Search Hansard', desc: 'Find speeches by topic or speaker.', bg: '#f1f8ff', color: '#007AFF' },
    { id: 'chat', icon: 'chat-outline', title: 'Chat with AI', desc: 'Ask questions and get AI answers.', bg: '#f6ffed', color: '#52c41a' },
    { id: 'listen', icon: 'headphones', title: 'Daily Brief', desc: 'Listen to highlights in EN/SW.', bg: '#fff7e6', color: '#faad14' },
    { id: 'info', icon: 'file-document-outline', title: 'Hansard Pipeline', desc: 'Real-time ingestion stats.', bg: '#fff1f0', color: '#f5222d' },
];

export const HomeScreen: React.FC<Props> = ({ onNavigate }) => {
    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.title}>Welcome to ParliaScope</Text>
            <Text style={styles.subtitle}>Your AI-powered window into Kenya's Parliament</Text>

            <View style={styles.grid}>
                {cards.map(card => (
                    <TouchableOpacity
                        key={card.id}
                        style={[styles.card, { backgroundColor: card.bg, borderColor: card.color + '22' }]}
                        onPress={() => card.id !== 'info' && onNavigate(card.id)}
                        activeOpacity={card.id === 'info' ? 1 : 0.7}
                    >
                        <View style={styles.iconContainer}>
                            <MaterialCommunityIcons name={card.icon as any} size={28} color={card.color} />
                        </View>
                        <Text style={styles.cardTitle}>{card.title}</Text>
                        <Text style={styles.cardDesc}>{card.desc}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    content: { padding: 20 },
    title: { fontSize: 26, fontWeight: '800', marginBottom: 6, color: '#1a1a1a', letterSpacing: -0.5 },
    subtitle: { fontSize: 15, color: '#666', marginBottom: 28, lineHeight: 22 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    card: {
        width: '48%',
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    iconContainer: { marginBottom: 12 },
    cardTitle: { fontSize: 17, fontWeight: '700', marginBottom: 6, color: '#1a1a1a' },
    cardDesc: { fontSize: 13, color: '#666', lineHeight: 18 },
});
