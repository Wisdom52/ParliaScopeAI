import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Input } from './ui/Input';
import { Button } from './ui/Button';

export const AlertSettings: React.FC = () => {
    const { token } = useAuth();
    const [subscriptions, setSubscriptions] = useState<any[]>([]);
    const [newTopic, setNewTopic] = useState('');
    const [loading, setLoading] = useState(false);

    const fetchSubscriptions = async () => {
        try {
            const response = await fetch('http://localhost:8000/subscriptions/', {
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
            const response = await fetch('http://localhost:8000/subscriptions/', {
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
            const response = await fetch(`http://localhost:8000/subscriptions/${id}`, {
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
        <div className="card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.5rem', boxShadow: 'var(--shadow)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem', fontSize: '1.1rem', color: 'var(--primary)' }}>
                <Bell size={20} /> Alert Preferences
            </h3>

            <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#666', marginBottom: '8px' }}>Followed Topics</label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <Input
                        value={newTopic}
                        onChangeText={setNewTopic}
                        placeholder="e.g., Housing, Taxes..."
                    />
                    <div style={{ width: '80px' }}>
                        <Button label="Add" onPress={handleAddTopic} loading={loading} />
                    </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {subscriptions.filter(s => s.topic).map(sub => (
                        <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f1f3f5', padding: '6px 12px', borderRadius: '16px', fontSize: '0.9rem' }}>
                            {sub.topic}
                            <button onClick={() => handleDelete(sub.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                <X size={14} color="#fa5252" />
                            </button>
                        </div>
                    ))}
                    {subscriptions.filter(s => s.topic).length === 0 && (
                        <p style={{ fontSize: '0.85rem', color: '#999', fontStyle: 'italic' }}>No topics followed yet.</p>
                    )}
                </div>
            </div>
        </div>
    );
};
