import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface BillImpact {
    id: number;
    archetype: string;
    description: string;
    sentiment: string;
}

interface ImpactCardProps {
    impact: BillImpact;
}

export const ImpactCard: React.FC<ImpactCardProps> = ({ impact }) => {

    // Determine the icon and color based on the archetype
    const getIconConfig = (archetype: string): { name: keyof typeof Feather.glyphMap; color: string } => {
        const type = archetype.toLowerCase();
        if (type.includes('sme') || type.includes('business')) return { name: 'briefcase', color: '#007AFF' };
        if (type.includes('student') || type.includes('education')) return { name: 'book-open', color: '#FF9500' };
        if (type.includes('farmer') || type.includes('agriculture')) return { name: 'sun', color: '#34C759' };
        return { name: 'info', color: '#5856D6' };
    };

    // Determine the border and tag color based on sentiment
    const getSentimentColor = (sentiment: string) => {
        const sen = sentiment.toLowerCase();
        if (sen === 'positive') return '#34C759'; // Green
        if (sen === 'negative') return '#FF3B30'; // Red
        return '#8E8E93'; // Neutral Gray
    };

    const iconConfig = getIconConfig(impact.archetype);
    const sentimentColor = getSentimentColor(impact.sentiment);

    return (
        <View style={[styles.cardContainer, { borderLeftColor: sentimentColor }]}>
            <View style={styles.iconContainer}>
                <Feather name={iconConfig.name} size={24} color={iconConfig.color} />
            </View>
            <View style={styles.contentContainer}>
                <View style={styles.header}>
                    <Text style={styles.archetypeTitle}>{impact.archetype} Impact</Text>
                    <View style={[styles.sentimentTag, { backgroundColor: `${sentimentColor}20` }]}>
                        <Text style={[styles.sentimentText, { color: sentimentColor }]}>
                            {impact.sentiment.toUpperCase()}
                        </Text>
                    </View>
                </View>
                <Text style={styles.description}>{impact.description}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    cardContainer: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#EFEFF4',
        borderLeftWidth: 4,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'flex-start',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    iconContainer: {
        backgroundColor: '#F2F2F7',
        padding: 10,
        borderRadius: 24,
        marginRight: 16,
    },
    contentContainer: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    archetypeTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1C1C1E',
        textTransform: 'capitalize',
    },
    sentimentTag: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    sentimentText: {
        fontSize: 10,
        fontWeight: '700',
    },
    description: {
        fontSize: 14,
        color: '#3A3A3C',
        lineHeight: 20,
    },
});
