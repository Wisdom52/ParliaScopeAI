import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ImpactCard } from '../components/ImpactCard';
import { Button } from '../components/ui/Button';
import { Loader2, FileText, Activity } from 'lucide-react';

interface Bill {
    id: number;
    title: string;
    summary: string;
    document_url: string;
    impacts: any[];
}

export const BillsPage: React.FC = () => {
    const { token } = useAuth();
    const [bills, setBills] = useState<Bill[]>([]);
    const [loading, setLoading] = useState(true);
    const [analyzingId, setAnalyzingId] = useState<number | null>(null);

    const fetchBills = async () => {
        try {
            const response = await fetch('http://localhost:8000/bills/', {
                headers: { 'Authorization': `Bearer ${token}` }
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
        if (token) fetchBills();
    }, [token]);

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
                            <p style={{ color: '#3A3A3C', lineHeight: '1.6', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                                {bill.summary}
                            </p>

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
