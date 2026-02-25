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
            <View style={styles.header}>
                <View style={styles.iconTitleContainer}>
                    <View style={[styles.iconContainer, { backgroundColor: `${iconConfig.color}15` }]}>
                        <Feather name={iconConfig.name} size={20} color={iconConfig.color} />
                    </View>
                    <Text style={styles.archetypeTitle}>{impact.archetype}</Text>
                </View>
                <View style={[styles.sentimentTag, { backgroundColor: `${sentimentColor}15` }]}>
                    <Text style={[styles.sentimentText, { color: sentimentColor }]}>
                        {impact.sentiment.toUpperCase()}
                    </Text>
                </View>
            </View>
            <View style={styles.contentContainer}>
                <Text style={styles.description}>{impact.description}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    cardContainer: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderLeftWidth: 5,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        flexDirection: 'column',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    iconTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconContainer: {
        padding: 8,
        borderRadius: 10,
    },
    archetypeTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1A202C',
        textTransform: 'capitalize',
    },
    sentimentTag: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    sentimentText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    contentContainer: {
        marginTop: 4,
    },
    description: {
        fontSize: 14,
        color: '#4A5568',
        lineHeight: 22,
        fontWeight: '400',
    },
});
