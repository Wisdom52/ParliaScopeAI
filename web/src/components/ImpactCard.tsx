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
    const getIconConfig = (archetype: string) => {
        const type = archetype.toLowerCase();
        if (type.includes('sme') || type.includes('business')) return { icon: <Briefcase size={20} color="#007AFF" />, color: "#007AFF" };
        if (type.includes('student') || type.includes('education')) return { icon: <GraduationCap size={20} color="#FF9500" />, color: "#FF9500" };
        if (type.includes('farmer') || type.includes('agriculture')) return { icon: <Tractor size={20} color="#34C759" />, color: "#34C759" };
        return { icon: <Info size={20} color="#5856D6" />, color: "#5856D6" };
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
        <div style={{
            background: 'white',
            border: '1px solid #E2E8F0',
            borderLeft: `5px solid ${sentimentColor}`,
            borderRadius: '16px',
            padding: '1.5rem',
            marginBottom: '1.25rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            transition: 'transform 0.2s, box-shadow 0.2s',
        }}
            className="impact-card-hover"
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        background: `${iconConfig.color}15`,
                        padding: '10px',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        {iconConfig.icon}
                    </div>
                    <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1E293B' }}>
                        {impact.archetype}
                    </h4>
                </div>
                <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    color: sentimentColor,
                    background: `${sentimentColor}15`,
                    padding: '4px 12px',
                    borderRadius: '20px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                }}>
                    {impact.sentiment}
                </span>
            </div>

            <p style={{
                margin: 0,
                fontSize: '0.95rem',
                color: '#475569',
                lineHeight: '1.6',
                fontWeight: 450
            }}>
                {impact.description}
            </p>
        </div>
    );
};
