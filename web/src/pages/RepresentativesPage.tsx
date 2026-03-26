import React, { useState, useEffect } from 'react';
import { Search, Star, User, MapPin, Building, X, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';

interface Review {
    id: number;
    rating: number;
    comment: string;
    user_name: string;
    created_at: string;
}

interface StanceRecord {
    id: number;
    topic: string;
    stance: string;
    analysis: string;
    consistency_score: number;
    date_recorded: string;
}

interface StanceAnalysisResponse {
    overall_consistency: number;
    summary: string;
    topic_breakdown: StanceRecord[];
}

interface Representative {
    id: number;
    name: string;
    role: string;
    party: string;
    constituency_id: number;
    county_id: number;
    constituency_name?: string;
    county_name?: string;
    bio: string;
    image_url: string;
    sittings_attended: number;
    votes_cast: number;
    bills_sponsored: number;
    average_rating: number;
    reviews: Review[];
}

export const RepresentativesPage: React.FC<{ onSwitchToProfile?: () => void }> = ({ onSwitchToProfile }) => {
    const { token } = useAuth();
    const [reps, setReps] = useState<Representative[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRep, setSelectedRep] = useState<Representative | null>(null);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewComment, setReviewComment] = useState('');
    const [submittingReview, setSubmittingReview] = useState(false);
    const [activeTab, setActiveTab] = useState<'info' | 'stance'>('info');
    const [stanceData, setStanceData] = useState<StanceAnalysisResponse | null>(null);
    const [stanceLoading, setStanceLoading] = useState(false);

    useEffect(() => {
        fetchReps();
    }, []);

    const fetchReps = async () => {
        setLoading(true);
        try {
            const res = await fetch('http://localhost:8000/representatives/');
            if (res.ok) {
                setReps(await res.json());
            }
        } catch (e) {
            console.error("Failed to fetch reps", e);
        } finally {
            setLoading(false);
        }
    };

    const fetchRepDetail = async (id: number) => {
        try {
            const res = await fetch(`http://localhost:8000/representatives/${id}`);
            if (res.ok) {
                setSelectedRep(await res.json());
                setActiveTab('info');
                setStanceData(null);
            }
        } catch (e) {
            console.error("Failed to fetch rep detail", e);
        }
    };

    const fetchStances = async (id: number) => {
        setStanceLoading(true);
        try {
            const res = await fetch(`http://localhost:8000/representatives/${id}/stances`);
            if (res.ok) {
                setStanceData(await res.json());
            }
        } catch (e) {
            console.error("Failed to fetch stances", e);
        } finally {
            setStanceLoading(false);
        }
    };

    const handleReviewSubmit = async () => {
        if (!selectedRep) return;

        if (!token) {
            if (onSwitchToProfile) onSwitchToProfile();
            return;
        }
        setSubmittingReview(true);
        try {
            const res = await fetch(`http://localhost:8000/representatives/${selectedRep.id}/reviews`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    rating: reviewRating,
                    comment: reviewComment
                })
            });
            if (res.ok) {
                setReviewComment('');
                setReviewRating(5);
                fetchRepDetail(selectedRep.id);
                fetchReps(); // Refresh list for average rating
            }
        } catch (e) {
            console.error("Failed to submit review", e);
        } finally {
            setSubmittingReview(false);
        }
    };

    const filteredReps = reps.filter(r =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.constituency_name || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="representatives-container" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div className="header-section" style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Kenya Representatives</h1>
                <p style={{ color: '#666' }}>Track performance and legislative activity of your MPs.</p>

                <div style={{ position: 'relative', marginTop: '1.5rem', maxWidth: '500px' }}>
                    <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} size={18} />
                    <input
                        type="text"
                        placeholder="Search by name or constituency..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '12px 12px 12px 40px',
                            borderRadius: '12px',
                            border: '1px solid #ddd',
                            fontSize: '1rem',
                            outline: 'none',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }}
                    />
                </div>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                    <Loader2 className="animate-spin" size={40} color="#007bff" />
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                    {filteredReps.map(rep => (
                        <div
                            key={rep.id}
                            onClick={() => fetchRepDetail(rep.id)}
                            style={{
                                background: 'white',
                                padding: '1.5rem',
                                borderRadius: '16px',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                                cursor: 'pointer',
                                transition: 'transform 0.2s',
                                border: '1px solid #eee'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                                {rep.image_url ? (
                                    <img
                                        src={rep.image_url}
                                        alt={rep.name}
                                        style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #f0f0f0' }}
                                    />
                                ) : (
                                    <div style={{
                                        width: '60px', height: '60px', borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: '#fff', fontWeight: 700, fontSize: '1.1rem', flexShrink: 0
                                    }}>
                                        {rep.name.replace('Hon. ', '').split(/[,\s]+/).filter(Boolean).slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()}
                                    </div>
                                )}
                                <div style={{ marginLeft: '1rem' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{rep.name}</h3>
                                    <div style={{ display: 'flex', alignItems: 'center', color: '#666', fontSize: '0.85rem' }}>
                                        <MapPin size={14} style={{ marginRight: '4px' }} />
                                        {rep.constituency_name || rep.county_name || "National"}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
                                <span style={{ padding: '4px 8px', background: '#eef2ff', color: '#4f46e5', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
                                    {rep.party}
                                </span>
                                <span style={{ padding: '4px 8px', background: '#f0fdf4', color: '#16a34a', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                                    <Star size={12} style={{ marginRight: '4px', fill: '#16a34a' }} />
                                    {rep.average_rating.toFixed(1)}
                                </span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.8rem', color: '#666' }}>
                                <div style={{ textAlign: 'center', padding: '8px', background: '#f9fafb', borderRadius: '8px' }}>
                                    <div style={{ fontWeight: 700, color: '#111' }}>{rep.bills_sponsored}</div>
                                    <div>Bills</div>
                                </div>
                                <div style={{ textAlign: 'center', padding: '8px', background: '#f9fafb', borderRadius: '8px' }}>
                                    <div style={{ fontWeight: 700, color: '#111' }}>{rep.sittings_attended}</div>
                                    <div>Sittings</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Representative Detail Modal / Drawer */}
            {selectedRep && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div style={{ background: 'white', width: '100%', maxWidth: '800px', maxHeight: '90vh', borderRadius: '24px', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                        <button
                            onClick={() => setSelectedRep(null)}
                            style={{ position: 'absolute', right: '20px', top: '20px', background: '#f3f4f6', border: 'none', borderRadius: '50%', padding: '8px', cursor: 'pointer' }}
                        >
                            <X size={20} />
                        </button>

                        <div style={{ padding: '0 2.5rem', borderBottom: '1px solid #eee', display: 'flex', gap: '2rem' }}>
                            <button
                                onClick={() => setActiveTab('info')}
                                style={{
                                    padding: '1rem 0',
                                    border: 'none',
                                    background: 'none',
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    color: activeTab === 'info' ? '#007bff' : '#666',
                                    borderBottom: activeTab === 'info' ? '2px solid #007bff' : '2px solid transparent'
                                }}
                            >
                                General Info
                            </button>
                            <button
                                onClick={() => { setActiveTab('stance'); if (!stanceData) fetchStances(selectedRep.id); }}
                                style={{
                                    padding: '1rem 0',
                                    border: 'none',
                                    background: 'none',
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    color: activeTab === 'stance' ? '#007bff' : '#666',
                                    borderBottom: activeTab === 'stance' ? '2px solid #007bff' : '2px solid transparent'
                                }}
                            >
                                Stance Analysis
                            </button>
                        </div>

                        <div style={{ overflowY: 'auto', padding: '2.5rem' }}>
                            {activeTab === 'info' ? (
                                <>
                                    <div style={{ display: 'flex', gap: '2rem', marginBottom: '2.5rem' }}>
                                        {selectedRep.image_url ? (
                                            <img src={selectedRep.image_url} alt={selectedRep.name} style={{ width: '120px', height: '120px', borderRadius: '24px', objectFit: 'cover', flexShrink: 0 }} />
                                        ) : (
                                            <div style={{
                                                width: '120px', height: '120px', borderRadius: '24px', flexShrink: 0,
                                                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: '#fff', fontWeight: 800, fontSize: '2rem'
                                            }}>
                                                {selectedRep.name.replace('Hon. ', '').split(/[,\s]+/).filter(Boolean).slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()}
                                            </div>
                                        )}
                                        <div>
                                            <h2 style={{ fontSize: '2rem', margin: '0 0 0.5rem 0' }}>{selectedRep.name}</h2>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', color: '#4b5563' }}><Building size={18} style={{ marginRight: '6px' }} /> {selectedRep.party}</div>
                                                <div style={{ display: 'flex', alignItems: 'center', color: '#4b5563' }}><MapPin size={18} style={{ marginRight: '6px' }} /> {selectedRep.constituency_name || selectedRep.county_name || "National"}</div>
                                                <div style={{ display: 'flex', alignItems: 'center', color: '#eab308', fontWeight: 600 }}><Star size={18} style={{ marginRight: '6px', fill: '#eab308' }} /> {selectedRep.average_rating.toFixed(1)} / 5.0</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
                                        <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '16px', textAlign: 'center' }}>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>{selectedRep.bills_sponsored}</div>
                                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Bills Sponsored</div>
                                        </div>
                                        <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '16px', textAlign: 'center' }}>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>{selectedRep.sittings_attended}</div>
                                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Sittings Attended</div>
                                        </div>
                                        <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '16px', textAlign: 'center' }}>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>{selectedRep.votes_cast}</div>
                                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Votes Cast</div>
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '2.5rem' }}>
                                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}><User size={20} /> Biography</h3>
                                        <p style={{ color: '#4b5563', lineHeight: 1.6 }}>{selectedRep.bio}</p>
                                    </div>


                                    {/* Reviews Section */}
                                    <div style={{ paddingTop: '2rem', borderTop: '1px solid #eee' }}>
                                        <h3 style={{ marginBottom: '1.5rem' }}>Citizen Reviews ({selectedRep.reviews.length})</h3>

                                        <div style={{ background: '#f3f4f6', padding: '1.5rem', borderRadius: '16px', marginBottom: '2rem' }}>
                                            <h4 style={{ margin: '0 0 1rem 0' }}>Submit your review</h4>
                                            <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
                                                {[1, 2, 3, 4, 5].map(star => (
                                                    <Star
                                                        key={star}
                                                        size={24}
                                                        style={{ cursor: 'pointer', fill: star <= reviewRating ? '#eab308' : 'none', color: '#eab308' }}
                                                        onClick={() => setReviewRating(star)}
                                                    />
                                                ))}
                                            </div>
                                            <textarea
                                                placeholder="Write your thoughts on this representative..."
                                                value={reviewComment}
                                                onChange={(e) => setReviewComment(e.target.value)}
                                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', minHeight: '100px', marginBottom: '1rem' }}
                                            />
                                            <Button
                                                label={submittingReview ? 'Submitting...' : 'Submit Review'}
                                                onPress={handleReviewSubmit}
                                                disabled={submittingReview}
                                                variant="primary"
                                                loading={submittingReview}
                                            />
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            {selectedRep.reviews.length === 0 ? (
                                                <p style={{ color: '#9ca3af', textAlign: 'center', padding: '2rem' }}>No reviews yet. Be the first to share your feedback!</p>
                                            ) : (
                                                selectedRep.reviews.map(review => (
                                                    <div key={review.id} style={{ padding: '1.25rem', border: '1px solid #f3f4f6', borderRadius: '12px' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                            <span style={{ fontWeight: 600 }}>{review.user_name}</span>
                                                            <div style={{ display: 'flex', gap: '2px' }}>
                                                                {[...Array(5)].map((_, i) => (
                                                                    <Star key={i} size={14} style={{ fill: i < review.rating ? '#eab308' : 'none', color: '#eab308' }} />
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <p style={{ margin: 0, color: '#4b5563', fontSize: '0.95rem' }}>{review.comment}</p>
                                                        <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' }}>
                                                            {new Date(review.created_at).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="stance-analysis-view">
                                    <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                                        <div style={{ position: 'relative', display: 'inline-block', marginBottom: '1.5rem' }}>
                                            <div style={{
                                                width: '120px',
                                                height: '120px',
                                                borderRadius: '50%',
                                                border: '8px solid #f1f5f9',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '1.5rem',
                                                fontWeight: 800,
                                                color: '#1a1a1a'
                                            }}>
                                                {stanceLoading ? <Loader2 className="animate-spin" /> : `${stanceData?.overall_consistency || 0}%`}
                                            </div>
                                            <div style={{
                                                position: 'absolute',
                                                inset: '-4px',
                                                borderRadius: '50%',
                                                border: '12px solid #007bff',
                                                borderRightColor: 'transparent',
                                                borderBottomColor: 'transparent',
                                                transform: `rotate(${((stanceData?.overall_consistency || 0) * 3.6) - 90}deg)`,
                                                display: stanceLoading ? 'none' : 'block'
                                            }} />
                                        </div>
                                        <h3 style={{ fontSize: '1.5rem', margin: '0 0 0.5rem 0' }}>Consistency Score</h3>
                                        <p style={{ color: '#64748b', maxWidth: '500px', margin: '0 auto' }}>{stanceData?.summary || "AI is analyzing historical stances..."}</p>
                                    </div>

                                    {stanceLoading ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '4rem' }}>
                                            <Loader2 className="animate-spin" size={32} color="#007bff" />
                                            <p style={{ color: '#666' }}>AI is parsing historical transcripts and bills...</p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                            {stanceData?.topic_breakdown.map((item, idx) => (
                                                <div key={idx} style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                                        <div>
                                                            <h4 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: 700 }}>{item.topic}</h4>
                                                            <span style={{
                                                                padding: '4px 10px',
                                                                borderRadius: '20px',
                                                                fontSize: '0.75rem',
                                                                fontWeight: 700,
                                                                background: item.stance === 'Supportive' ? '#dcfce7' : item.stance === 'Opposed' ? '#fee2e2' : '#fef9c3',
                                                                color: item.stance === 'Supportive' ? '#166534' : item.stance === 'Opposed' ? '#991b1b' : '#854d0e'
                                                            }}>
                                                                {item.stance}
                                                            </span>
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Consistency</div>
                                                            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b' }}>{item.consistency_score}%</div>
                                                        </div>
                                                    </div>
                                                    <p style={{ margin: 0, fontSize: '0.95rem', color: '#4b5563', lineHeight: 1.6 }}>{item.analysis}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
