import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ImpactCard } from '../components/ImpactCard';
import { Button } from '../components/ui/Button';
import { Loader2, FileText, Activity, Headphones, Target, X, Info } from 'lucide-react';
import { AudioPlayer } from '../components/ui/AudioPlayer';

interface Impact {
    id: number;
    archetype: string;
    description: string;
    sentiment: string;
}

interface Bill {
    id: number;
    title: string;
    date: string | null;
    summary: string;
    document_url: string;
    impacts: Impact[];
    matching_topics?: string[];
}

export const BillsPage: React.FC = () => {
    const { token } = useAuth();
    const [bills, setBills] = useState<Bill[]>([]);
    const [loading, setLoading] = useState(true);
    const [analyzingId, setAnalyzingId] = useState<number | null>(null);
    const [audioData, setAudioData] = useState<Record<number, { en: string, sw: string }>>({});
    const [loadingAudio, setLoadingAudio] = useState<Record<number, boolean>>({});
    const [personalImpact, setPersonalImpact] = useState<{ topic: string, explanation: string, sentiment: string } | null>(null);
    const [loadingPersonal, setLoadingPersonal] = useState(false);

    const fetchBills = async () => {
        try {
            const response = await fetch('http://localhost:8000/bills/', {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            if (response.ok) {
                const data = await response.json();
                setBills(data);
            }
        } catch (error) {
            console.error("Failed to fetch bills:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBills();
    }, []);

    const handleAnalyze = async (billId: number, rawText: string) => {
        setAnalyzingId(billId);
        try {
            const response = await fetch(`http://localhost:8000/bills/${billId}/analyze?raw_text=${encodeURIComponent(rawText)}`, {
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

    const fetchAudio = async (billId: number) => {
        if (audioData[billId]) return;
        setLoadingAudio(prev => ({ ...prev, [billId]: true }));
        try {
            const [enRes, swRes] = await Promise.all([
                fetch(`http://localhost:8000/audio/daily-brief?item_id=${billId}&item_type=bill&lang=en`),
                fetch(`http://localhost:8000/audio/daily-brief?item_id=${billId}&item_type=bill&lang=sw`)
            ]);
            if (enRes.ok && swRes.ok) {
                const enData = await enRes.json();
                const swData = await swRes.json();
                if (enData.audio_url && swData.audio_url) {
                    setAudioData(prev => ({ 
                        ...prev, 
                        [billId]: { en: enData.audio_url, sw: swData.audio_url } 
                    }));
                }
            }
        } catch (err) {
            console.error("Failed to load audio", err);
        } finally {
            setLoadingAudio(prev => ({ ...prev, [billId]: false }));
        }
    };

    const handlePersonalImpact = async (billId: number, topic: string) => {
        setLoadingPersonal(true);
        setPersonalImpact({ topic, explanation: "AI is analyzing how this bill affects your interest in " + topic + "...", sentiment: "Neutral" });
        try {
            const res = await fetch(`http://localhost:8000/bills/${billId}/personalized-impact?topic=${encodeURIComponent(topic)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setPersonalImpact(data);
            } else {
                setPersonalImpact({ topic, explanation: "Failed to generate AI analysis for this topic.", sentiment: "Neutral" });
            }
        } catch (err) {
            console.error(err);
            setPersonalImpact(null);
        } finally {
            setLoadingPersonal(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <Loader2 className="animate-spin" size={40} color="var(--primary)" />
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Activity size={32} color="var(--primary)" />
                    AI Bill Impact Engine
                </h1>
                <p style={{ color: '#666', fontSize: '1.1rem', margin: 0 }}>
                    Understand how complex legislation specifically affects critical demographics like SMEs, Students, and Farmers.
                </p>
            </div>

            {/* Personalized Impact Modal */}
            {personalImpact && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div className="card" style={{ maxWidth: '500px', width: '100%', padding: '2rem', background: 'white', position: 'relative' }}>
                        <button onClick={() => setPersonalImpact(null)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer' }}>
                            <X size={24} color="#666" />
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', color: 'var(--primary)' }}>
                            <Target size={24} />
                            <h2 style={{ margin: 0 }}>Impact on: {personalImpact.topic}</h2>
                        </div>
                        <div style={{ background: '#f8f9fa', padding: '1.25rem', borderRadius: '12px', marginBottom: '1.5rem', borderLeft: `6px solid ${personalImpact.sentiment === 'Positive' ? '#22c55e' : personalImpact.sentiment === 'Negative' ? '#ef4444' : '#6b7280'}` }}>
                            {loadingPersonal && <Loader2 className="animate-spin" size={24} style={{ marginBottom: '10px' }} />}
                            <p style={{ fontSize: '1.1rem', lineHeight: '1.6', margin: 0, color: '#1a1a1a' }}>{personalImpact.explanation}</p>
                            <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#666' }}>SITUATION SENTIMENT:</span>
                                <span style={{ 
                                    padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800, 
                                    background: personalImpact.sentiment === 'Positive' ? '#dcfce7' : personalImpact.sentiment === 'Negative' ? '#fee2e2' : '#f3f4f6',
                                    color: personalImpact.sentiment === 'Positive' ? '#166534' : personalImpact.sentiment === 'Negative' ? '#991b1b' : '#374151'
                                }}>
                                    {personalImpact.sentiment.toUpperCase()}
                                </span>
                            </div>
                        </div>
                        <Button label="Close" onPress={() => setPersonalImpact(null)} />
                    </div>
                </div>
            )}

            {bills.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                    <FileText size={48} color="#ccc" style={{ marginBottom: '1rem' }} />
                    <h3 style={{ margin: '0 0 0.5rem 0' }}>No Bills Analyzed Yet</h3>
                    <p style={{ color: '#666' }}>We are waiting for new bills to be submitted for AI analysis.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {bills.map(bill => (
                        <div key={bill.id} className="card" style={{
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius)',
                            padding: '1.5rem',
                            boxShadow: 'var(--shadow)'
                        }}>
                            <h2 style={{ fontSize: '1.4rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>{bill.title}</h2>
                            
                            {/* Personalized Impact Pills */}
                            {/* @ts-ignore */}
                            {bill.matching_topics && bill.matching_topics.length > 0 && (
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap' }}>
                                    {/* @ts-ignore */}
                                    {bill.matching_topics.map(topic => (
                                        <button 
                                            key={topic} 
                                            onClick={() => handlePersonalImpact(bill.id, topic)}
                                            style={{ 
                                                background: '#22c55e', color: 'white', border: 'none', padding: '6px 14px', 
                                                borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', 
                                                display: 'flex', alignItems: 'center', gap: '6px', transition: 'transform 0.2s',
                                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                        >
                                            <Target size={14} />
                                            Tracking: {topic}
                                            <Info size={12} style={{ opacity: 0.8 }} />
                                        </button>
                                    ))}
                                </div>
                            )}

                            {bill.date && (
                                <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.5rem', fontWeight: 500 }}>
                                    Dated: {new Date(bill.date).toLocaleDateString()}
                                </p>
                            )}
                            <p style={{ color: '#3A3A3C', lineHeight: '1.6', marginBottom: '0.75rem', fontSize: '0.95rem' }}>
                                {bill.summary}
                            </p>
                            {/* Traceable source — addresses AI Hallucination & Bias risk */}
                            {bill.document_url && (
                                <div style={{
                                    marginBottom: '1rem',
                                    padding: '0.65rem 1rem',
                                    background: '#f0f4ff',
                                    borderLeft: '3px solid var(--primary)',
                                    borderRadius: '6px',
                                    fontSize: '0.82rem',
                                    color: '#444',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    flexWrap: 'wrap'
                                }}>
                                    <span>⚠️ <strong>AI-Generated Summary</strong> — Always verify against the official source.</span>
                                    <a
                                        href={bill.document_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'underline' }}
                                    >
                                        📄 View Original Bill PDF on parliament.go.ke
                                    </a>
                                </div>
                            )}

                            {/* Audio-First Engagement UI */}
                            <div style={{ marginTop: '1rem', marginBottom: '1.5rem', background: '#FAFAFA', padding: '1rem', borderRadius: '8px', border: '1px solid #eee' }}>
                                <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#333' }}>
                                    <Headphones size={18} color="var(--primary)" />
                                    Audio-First Engagement
                                </h3>
                                {!audioData[bill.id] ? (
                                    <div style={{ maxWidth: '300px' }}>
                                        <Button 
                                            label="Generate & Listen to Audio Summary" 
                                            variant="outline" 
                                            onPress={() => fetchAudio(bill.id)} 
                                            loading={loadingAudio[bill.id]} 
                                        />
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <AudioPlayer src={audioData[bill.id].en} title="🇬🇧 English Brief" />
                                        <AudioPlayer src={audioData[bill.id].sw} title="🇰🇪 Swahili Brief (Kiswahili)" />
                                    </div>
                                )}
                            </div>

                            {bill.impacts && bill.impacts.length > 0 ? (
                                <div>
                                    <h3 style={{ fontSize: '1.1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                                        AI Archetype Analysis
                                    </h3>
                                    {bill.impacts.map(impact => (
                                        <ImpactCard key={impact.id} impact={impact} />
                                    ))}
                                    <div style={{ marginTop: '1rem', width: '200px' }}>
                                        <Button
                                            label={analyzingId === bill.id ? "Re-Analyzing..." : "Refresh Analysis"}
                                            onPress={() => handleAnalyze(bill.id, bill.summary)}
                                            loading={analyzingId === bill.id}
                                            variant="outline"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div style={{ background: '#F2F2F7', padding: '2rem', borderRadius: '12px', textAlign: 'center' }}>
                                    <p style={{ margin: '0 0 1rem 0', color: '#666' }}>
                                        This bill hasn't been segmented by the AI Engine yet.
                                    </p>
                                    <div style={{ margin: '0 auto', maxWidth: '250px' }}>
                                        <Button
                                            label="Run AI Impact Analysis"
                                            onPress={() => handleAnalyze(bill.id, bill.summary)}
                                            loading={analyzingId === bill.id}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
