import React, { useState, useEffect } from 'react';
import { Target, X, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Input } from './ui/Input';
import { Button } from './ui/Button';

export const ImpactAlertTracking: React.FC = () => {
    const { token } = useAuth();
    const [subscriptions, setSubscriptions] = useState<any[]>([]);
    const [newTopic, setNewTopic] = useState('');
    const [loading, setLoading] = useState(false);

    const fetchSubscriptions = async () => {
        try {
            const apiBase = (window as any).API_BASE_URL || 'http://localhost:8000';
            const response = await fetch(`${apiBase}/subscriptions/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setSubscriptions(data);
            }
        } catch (error) {
            console.error("Failed to fetch subscriptions:", error);
        }
    };

    useEffect(() => {
        if (token) fetchSubscriptions();
    }, [token]);

    const handleAddTopic = async () => {
        if (!newTopic.trim()) return;
        setLoading(true);
        try {
            const apiBase = (window as any).API_BASE_URL || 'http://localhost:8000';
            const response = await fetch(`${apiBase}/subscriptions/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ topic: newTopic.trim() })
            });
            if (response.ok) {
                setNewTopic('');
                fetchSubscriptions();
            }
        } catch (error) {
            console.error("Failed to add topic:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            const apiBase = (window as any).API_BASE_URL || 'http://localhost:8000';
            const response = await fetch(`${apiBase}/subscriptions/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                fetchSubscriptions();
            }
        } catch (error) {
            console.error("Failed to delete subscription:", error);
        }
    };

    return (
        <div className="card" style={{ 
            background: 'var(--surface)', 
            border: '1px solid var(--border)', 
            borderRadius: 'var(--radius)', 
            padding: '1.5rem', 
            boxShadow: 'var(--shadow)',
            position: 'relative',
            overflow: 'hidden'
        }}>
            <div style={{ 
                position: 'absolute', 
                top: 0, 
                right: 0, 
                padding: '4px 12px', 
                background: 'rgba(34, 197, 94, 0.1)', 
                color: '#16a34a', 
                fontSize: '0.7rem', 
                fontWeight: 700,
                borderRadius: '0 0 0 8px'
            }}>
                AI POWERED ALERTS
            </div>

            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem', fontSize: '1.1rem', color: 'var(--primary)' }}>
                <Target size={20} /> Personal Impact & Alert Tracking
            </h3>
            
            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1.25rem', lineHeight: '1.4' }}>
                Define specific sectors (e.g. Hospitality, Mining, Teachers) you want the AI to track. You will receive <strong>instant alerts</strong> when new legislation matching these topics is introduced.
            </p>

            <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <Input
                        value={newTopic}
                        onChangeText={setNewTopic}
                        placeholder="e.g. Hospitality, Jua Kali..."
                    />
                    <div style={{ width: '80px' }}>
                        <Button label="Add" onPress={handleAddTopic} loading={loading} />
                    </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {subscriptions.filter(s => s.topic).map(sub => (
                        <div key={sub.id} style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '6px', 
                            background: '#e6fcf5', 
                            color: '#0ca678',
                            padding: '6px 12px', 
                            borderRadius: '16px', 
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            border: '1px solid #c3fae8'
                        }}>
                            <Bell size={12} />
                            {sub.topic}
                            <button onClick={() => handleDelete(sub.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}>
                                <X size={14} color="#fa5252" />
                            </button>
                        </div>
                    ))}
                    {subscriptions.filter(s => s.topic).length === 0 && (
                        <p style={{ fontSize: '0.85rem', color: '#999', fontStyle: 'italic' }}>No tracking topics set.</p>
                    )}
                </div>
            </div>
        </div>
    );
};
