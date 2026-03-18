import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ImpactCard } from '../components/ImpactCard';
import { Button } from '../components/ui/Button';
import { Loader2, FileText, Activity, Headphones } from 'lucide-react';
import { AudioPlayer } from '../components/ui/AudioPlayer';

interface Bill {
    id: number;
    title: string;
    date: string | null;
    summary: string;
    document_url: string;
    impacts: any[];
}

export const BillsPage: React.FC = () => {
    const { token } = useAuth();
    const [bills, setBills] = useState<Bill[]>([]);
    const [loading, setLoading] = useState(true);
    const [analyzingId, setAnalyzingId] = useState<number | null>(null);
    const [audioData, setAudioData] = useState<Record<number, { en: string, sw: string }>>({});
    const [loadingAudio, setLoadingAudio] = useState<Record<number, boolean>>({});

    const fetchBills = async () => {
        try {
            const response = await fetch('http://localhost:8000/bills/');
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
