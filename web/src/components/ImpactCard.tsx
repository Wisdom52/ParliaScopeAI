import React from 'react';
import { Briefcase, GraduationCap, Tractor, Info } from 'lucide-react';

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
    const getIcon = (archetype: string) => {
        const type = archetype.toLowerCase();
        if (type.includes('sme') || type.includes('business')) return <Briefcase size={20} color="#007AFF" />;
        if (type.includes('student') || type.includes('education')) return <GraduationCap size={20} color="#FF9500" />;
        if (type.includes('farmer') || type.includes('agriculture')) return <Tractor size={20} color="#34C759" />;
        return <Info size={20} color="#5856D6" />;
    };

    // Determine the border and tag color based on sentiment
    const getSentimentColor = (sentiment: string) => {
        const sen = sentiment.toLowerCase();
        if (sen === 'positive') return '#34C759'; // Green
        if (sen === 'negative') return '#FF3B30'; // Red
        return '#8E8E93'; // Neutral Gray
    };

    const sentimentColor = getSentimentColor(impact.sentiment);

    return (
        <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderLeft: `4px solid ${sentimentColor}`,
            borderRadius: 'var(--radius)',
            padding: '1.25rem',
            marginBottom: '1rem',
            boxShadow: 'var(--shadow)',
            display: 'flex',
            gap: '1rem',
            alignItems: 'flex-start'
        }}>
            <div style={{ background: '#F2F2F7', padding: '10px', borderRadius: '50%' }}>
                {getIcon(impact.archetype)}
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--primary)', textTransform: 'capitalize' }}>
                        {impact.archetype} Impact
                    </h4>
                    <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: sentimentColor,
                        background: `${sentimentColor}20`, // 20% opacity background
                        padding: '2px 8px',
                        borderRadius: '12px',
                        textTransform: 'uppercase'
                    }}>
                        {impact.sentiment}
                    </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.95rem', color: '#3A3A3C', lineHeight: '1.5' }}>
                    {impact.description}
                </p>
            </div>
        </div>
    );
};
