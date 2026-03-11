import React, { useState, useEffect } from 'react';
import { Users, Vote, MessageSquare, Calendar, ExternalLink, Plus, PlayCircle, Trophy, Brain, CheckCircle2, XCircle, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './BarazaPage.css';

interface Meeting {
    id: number;
    title: string;
    description: string;
    scheduled_at: string;
    meeting_link: string;
    host_id: number;
}

interface PollOption {
    id: number;
    text: string;
    vote_count: number;
}

interface Poll {
    id: number;
    question: string;
    poll_type: string;
    expires_at: string | null;
    creator_id: number | null;
    is_active: boolean;
    options: PollOption[];
}

interface ForumPost {
    id: number;
    title: string;
    content: string;
    author_name: string;
    created_at: string;
    comment_count?: number;
}

interface Quiz {
    id: number;
    title: string;
    description: string;
    icon?: string;
    points_reward: number;
    questions: Question[];
}

interface Question {
    id: number;
    question_text: string;
    options: string; // JSON string
    correct_option_index: number;
}

interface Badge {
    id: number;
    name: string;
    description: string;
    icon_url?: string;
}

interface FloatingReaction {
    id: number;
    type: string;
    left: number;
}

interface LiveChat {
    id: number;
    message: string;
    user_name: string;
    created_at: string;
}

type Section = 'meetings' | 'polls' | 'forum' | 'live' | 'game';

interface BarazaProps {
    onSwitchToProfile: () => void;
}

export const BarazaPage: React.FC<BarazaProps> = ({ onSwitchToProfile }) => {
    const { user } = useAuth();
    const [activeSection, setActiveSection] = useState<Section>('meetings');
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [polls, setPolls] = useState<Poll[]>([]);
    const [posts, setPosts] = useState<ForumPost[]>([]);
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [userStats, setUserStats] = useState({ points: 0, badges: [] as Badge[] });
    const [loading, setLoading] = useState(true);

    // Live Stream States
    const [liveVid, setLiveVid] = useState('dQw4w9WgXcQ');
    const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
    const [liveChats, setLiveChats] = useState<LiveChat[]>([]);
    const [newChat, setNewChat] = useState('');
    const chatContainerRef = React.useRef<HTMLDivElement>(null);

    // Quiz States
    const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
    const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
    const [quizResult, setQuizResult] = useState<{ correct: number, total: number, reward: number } | null>(null);

    // Modal & Form states
    const [showModal, setShowModal] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');
    const [newLink, setNewLink] = useState('');
    const [newScheduledAt, setNewScheduledAt] = useState('');
    const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
    const [pollType, setPollType] = useState('choice'); // choice, checkbox, boolean, text
    const [pollExpiresAt, setPollExpiresAt] = useState('');
    const [pollOptions, setPollOptions] = useState(['', '']);

    useEffect(() => {
        fetchData();
        if (activeSection === 'game') fetchGamification();
    }, [activeSection]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeSection === 'live') {
                const res = await fetch(`http://localhost:8000/baraza/live/stream`);
                const data = await res.json();
                if (data.channel_id) {
                    setLiveVid(`live_stream?channel=${data.channel_id}`);
                } else {
                    setLiveVid(data.youtube_id);
                }
                fetchChats();
            } else if (activeSection === 'game') {
                const res = await fetch(`http://localhost:8000/baraza/quizzes`);
                const data = await res.json();
                setQuizzes(Array.isArray(data) ? data : []);
            } else {
                const res = await fetch(`http://localhost:8000/baraza/${activeSection === 'forum' ? 'forum' : activeSection}`);
                const data = await res.json();
                if (activeSection === 'meetings') setMeetings(Array.isArray(data) ? data : []);
                else if (activeSection === 'polls') setPolls(Array.isArray(data) ? data : []);
                else if (activeSection === 'forum') setPosts(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error("Failed to fetch baraza data", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchChats = async () => {
        try {
            const res = await fetch(`http://localhost:8000/baraza/live/chat`);
            const data = await res.json();
            setLiveChats(Array.isArray(data) ? data : []);
            if (chatContainerRef.current) {
                chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            }
        } catch (err) {
            console.error("Chat fetch error", err);
        }
    };

    useEffect(() => {
        let interval: any;
        if (activeSection === 'live') {
            interval = setInterval(() => {
                fetchChats();
            }, 3000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [activeSection]);

    const fetchGamification = async () => {
        try {
            const token = localStorage.getItem('parliaScope_token');
            const res = await fetch(`http://localhost:8000/baraza/user/gamification`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setUserStats({ points: data.prosperity_points, badges: data.badges });
        } catch (err) {
            console.error("Gamification error", err);
        }
    };

    const ensureLoggedIn = () => {
        if (!user) {
            onSwitchToProfile();
            return false;
        }
        return true;
    };

    const handleVote = async (pollId: number, optionId: number) => {
        if (!ensureLoggedIn()) return;
        try {
            const token = localStorage.getItem('parliaScope_token');
            const res = await fetch(`http://localhost:8000/baraza/polls/vote`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ poll_id: pollId, option_id: optionId })
            });
            if (res.ok) {
                alert("Vote recorded!");
                fetchData();
            } else {
                const data = await res.json();
                alert(data.detail || "Error voting.");
            }
        } catch (err) {
            alert("Connection error.");
        }
    };

    const handlePulse = async (type: string) => {
        if (!ensureLoggedIn()) return;
        const newReaction = { id: Date.now(), type, left: Math.random() * 80 + 10 };
        setFloatingReactions(prev => [...prev, newReaction]);
        setTimeout(() => setFloatingReactions(prev => prev.filter(r => r.id !== newReaction.id)), 3000);

        try {
            const token = localStorage.getItem('parliaScope_token');
            await fetch(`http://localhost:8000/baraza/live/pulse`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ type })
            });
        } catch (err) {
            console.error("Pulse error", err);
        }
    };

    const handleSendChat = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newChat.trim() || !ensureLoggedIn()) return;
        try {
            const token = localStorage.getItem('parliaScope_token');
            const res = await fetch(`http://localhost:8000/baraza/live/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ message: newChat })
            });
            if (res.ok) {
                setNewChat('');
                fetchChats();
            } else {
                alert("Failed to send chat.");
            }
        } catch (err) {
            alert("Error sending chat.");
        }
    };

    const submitQuiz = async () => {
        if (!currentQuiz) return;
        if (!ensureLoggedIn()) {
            setCurrentQuiz(null);
            return;
        }
        try {
            const token = localStorage.getItem('parliaScope_token');
            const res = await fetch(`http://localhost:8000/baraza/quizzes/${currentQuiz.id}/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(quizAnswers)
            });
            const data = await res.json();
            setQuizResult({ correct: data.correct, total: data.total, reward: data.points_awarded });
            fetchGamification();
        } catch (err) {
            alert("Failed to submit quiz.");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('parliaScope_token');
            const endpoint = activeSection === 'forum' ? 'forum' : activeSection;

            let body: any;
            if (activeSection === 'meetings') {
                body = {
                    title: newTitle,
                    description: newContent,
                    meeting_link: newLink,
                    scheduled_at: newScheduledAt || new Date().toISOString()
                };
            } else if (activeSection === 'polls') {
                let options = pollOptions.filter(o => o.trim()).map(o => ({ text: o }));
                if (pollType === 'boolean') {
                    options = [{ text: 'Yes' }, { text: 'No' }];
                }
                body = {
                    question: newTitle,
                    poll_type: pollType,
                    expires_at: pollExpiresAt || null,
                    options
                };
            } else {
                body = { title: newTitle, content: newContent };
            }

            const method = editingMeeting ? 'PUT' : 'POST';
            const url = editingMeeting
                ? `http://localhost:8000/baraza/meetings/${editingMeeting.id}`
                : `http://localhost:8000/baraza/${endpoint}`;

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });
            if (res.ok) {
                setShowModal(false);
                fetchData();
                setNewTitle('');
                setNewContent('');
                setNewLink('');
                setNewScheduledAt('');
                setPollExpiresAt('');
                setPollType('choice');
                setEditingMeeting(null);
                setPollOptions(['', '']);
            } else {
                const data = await res.json();
                alert(data.detail || "Failed to submit.");
            }
        } catch (err) {
            alert("Failed to submit.");
        }
    };

    const handleDeleteMeeting = async (id: number) => {
        if (!window.confirm("Are you sure you want to delete this meeting?")) return;
        try {
            const token = localStorage.getItem('parliaScope_token');
            const res = await fetch(`http://localhost:8000/baraza/meetings/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                fetchData();
            } else {
                const data = await res.json();
                alert(data.detail || "Failed to delete.");
            }
        } catch (err) {
            alert("Delete failed.");
        }
    };

    const handleEditMeeting = (m: Meeting) => {
        setEditingMeeting(m);
        setNewTitle(m.title);
        setNewContent(m.description);
        setNewLink(m.meeting_link);
        const date = new Date(m.scheduled_at);
        // Format for datetime-local input: YYYY-MM-DDTHH:MM
        const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        setNewScheduledAt(localDate);
        setShowModal(true);
    };

    const handleDeletePoll = async (id: number) => {
        if (!window.confirm("Are you sure you want to delete this poll?")) return;
        try {
            const token = localStorage.getItem('parliaScope_token');
            const res = await fetch(`http://localhost:8000/baraza/polls/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                fetchData();
            } else {
                const data = await res.json();
                alert(data.detail || "Failed to delete.");
            }
        } catch (err) {
            alert("Delete failed.");
        }
    };

    const getEmoji = (type: string) => {
        switch (type) {
            case 'fire': return '🔥';
            case 'clap': return '👏';
            case 'angry': return '😡';
            case 'love': return '❤️';
            case 'sad': return '😢';
            default: return '👍';
        }
    };

    return (
        <div className="baraza-page">
            <div className="baraza-header">
                <div className="baraza-title">
                    <Users size={28} className="header-icon" />
                    <div>
                        <h2>Digital Baraza</h2>
                        <p>Virtual Town Hall & Community Hub</p>
                    </div>
                </div>

                <div className="section-tabs">
                    {['meetings', 'polls', 'forum', 'live', 'game'].map((sec) => (
                        <button
                            key={sec}
                            className={`tab-btn ${activeSection === sec ? 'active' : ''}`}
                            onClick={() => setActiveSection(sec as Section)}
                        >
                            {sec === 'meetings' && <Calendar size={18} />}
                            {sec === 'polls' && <Vote size={18} />}
                            {sec === 'forum' && <MessageSquare size={18} />}
                            {sec === 'live' && <PlayCircle size={18} />}
                            {sec === 'game' && <Brain size={18} />}
                            <span style={{ textTransform: 'capitalize' }}>{sec}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="baraza-content">
                {loading ? (
                    <div className="loading-container">
                        <div className="loader"></div>
                        <p>Loading Baraza data...</p>
                    </div>
                ) : (
                    <>
                        {activeSection === 'meetings' && (
                            <div className="meetings-section">
                                <div className="section-header">
                                    <h3>Upcoming Meetings</h3>
                                    <button className="create-btn" onClick={() => ensureLoggedIn() && setShowModal(true)}>
                                        <Plus size={16} /> Schedule
                                    </button>
                                </div>
                                <div className="grid-list">
                                    {meetings.length > 0 ? meetings.map(m => (
                                        <div key={m.id} className="meeting-card">
                                            <div className="card-status">Upcoming</div>
                                            <h4>{m.title}</h4>
                                            <p className="description">{m.description}</p>
                                            <div className="card-footer">
                                                <div className="time">
                                                    <Calendar size={14} />
                                                    {new Date(m.scheduled_at).toLocaleString()}
                                                </div>
                                                {m.meeting_link && (
                                                    <a href={m.meeting_link} target="_blank" rel="noreferrer" className="join-link">
                                                        Join Meeting <ExternalLink size={14} />
                                                    </a>
                                                )}
                                                {user && m.host_id === user.id && (
                                                    <div className="card-actions">
                                                        <button onClick={() => handleEditMeeting(m)} className="icon-btn edit-btn" title="Edit">
                                                            <Pencil size={14} />
                                                        </button>
                                                        <button onClick={() => handleDeleteMeeting(m.id)} className="icon-btn delete-btn" title="Delete">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )) : <p className="empty-msg">No meetings scheduled. Check back later!</p>}
                                </div>
                            </div>
                        )}

                        {activeSection === 'polls' && (
                            <div className="polls-section">
                                <div className="section-header">
                                    <h3>Active Polls</h3>
                                    <button className="create-btn" onClick={() => ensureLoggedIn() && setShowModal(true)}>
                                        <Plus size={16} /> New Poll
                                    </button>
                                </div>
                                <div className="grid-list">
                                    {polls.length > 0 ? polls.map(p => {
                                        const isExpired = p.expires_at && new Date(p.expires_at) < new Date();
                                        return (
                                            <div key={p.id} className={`poll-card ${isExpired ? 'expired' : ''}`}>
                                                <div className="poll-meta">
                                                    <span className={`type-tag ${p.poll_type}`}>{p.poll_type}</span>
                                                    {isExpired ? (
                                                        <span className="status-tag expired">Expired</span>
                                                    ) : p.expires_at ? (
                                                        <span className="status-tag active">
                                                            Ends {new Date(p.expires_at).toLocaleDateString()}
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <h4>{p.question}</h4>
                                                <div className="options-list">
                                                    {p.options.map(o => {
                                                        const totalVotes = p.options.reduce((acc, opt) => acc + opt.vote_count, 0);
                                                        const percentage = totalVotes > 0 ? (o.vote_count / totalVotes) * 100 : 0;
                                                        return (
                                                            <div key={o.id} className={`poll-option ${isExpired ? 'disabled' : 'clickable'}`} onClick={() => !isExpired && handleVote(p.id, o.id)}>
                                                                <div className="option-info">
                                                                    <span>{o.text}</span>
                                                                    <span className="vote-pct">{o.vote_count} votes ({Math.round(percentage)}%)</span>
                                                                </div>
                                                                <div className="progress-bar">
                                                                    <div className="progress" style={{ width: `${percentage}%` }}></div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                <div className="poll-footer">
                                                    <p className="vote-hint">{isExpired ? 'Voting closed' : 'Click an option to vote'}</p>
                                                    {user && p.creator_id === user.id && (
                                                        <button onClick={() => handleDeletePoll(p.id)} className="icon-btn delete-btn" title="Delete Poll">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    }) : <p className="empty-msg">No active polls at the moment.</p>}
                                </div>
                            </div>
                        )}

                        {activeSection === 'forum' && (
                            <div className="forum-section">
                                <div className="section-header">
                                    <h3>Community Discussions</h3>
                                    <button className="create-btn" onClick={() => ensureLoggedIn() && setShowModal(true)}>
                                        <Plus size={16} /> New Post
                                    </button>
                                </div>
                                <div className="forum-list">
                                    {posts.length > 0 ? posts.map(p => (
                                        <div key={p.id} className="forum-card">
                                            <div className="forum-author">
                                                <div className="avatar">{p.author_name ? p.author_name[0] : 'C'}</div>
                                                <span>{p.author_name || 'Citizen'}</span>
                                                <span className="dot">•</span>
                                                <span className="date">{new Date(p.created_at).toLocaleDateString()}</span>
                                            </div>
                                            <h4>{p.title}</h4>
                                            <p className="excerpt">{p.content}</p>
                                            <div className="forum-footer">
                                                <div className="comment-count">
                                                    <MessageSquare size={14} /> {p.comment_count || 0} comments
                                                </div>
                                                <button className="view-btn">View Discussion</button>
                                            </div>
                                        </div>
                                    )) : <p className="empty-msg">No forum posts yet. Be the first to start a conversation!</p>}
                                </div>
                            </div>
                        )}

                        {activeSection === 'live' && (
                            <div className="live-section">
                                <div className="section-header">
                                    <h3>Live Parliamentary Sitting</h3>
                                    <div className="live-badge">LIVE</div>
                                </div>
                                <div className="video-wrapper">
                                    <div className="video-container">
                                        <iframe
                                            width="100%"
                                            height="100%"
                                            src={`https://www.youtube.com/embed/${liveVid}${liveVid.includes('?') ? '&' : '?'}autoplay=1&mute=1&playsinline=1`}
                                            title="YouTube video player"
                                            frameBorder="0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                            allowFullScreen
                                        ></iframe>

                                        <div className="pulse-overlay">
                                            {floatingReactions.map(r => (
                                                <span key={r.id} className="floating-emoji" style={{ left: `${r.left}%` }}>{getEmoji(r.type)}</span>
                                            ))}
                                        </div>

                                        <div className="live-chat-overlay" ref={chatContainerRef}>
                                            {liveChats.map(c => (
                                                <div key={c.id} className="chat-bubble">
                                                    <span className="chat-author">{c.user_name}:</span>
                                                    <span className="chat-msg">{c.message}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="pulse-controls">
                                        {['fire', 'clap', 'love', 'angry', 'sad'].map(t => (
                                            <button key={t} onClick={() => handlePulse(t)}>{getEmoji(t)}</button>
                                        ))}
                                    </div>
                                    <form className="chat-input-form" onSubmit={handleSendChat}>
                                        <input
                                            type="text"
                                            placeholder="Join the conversation..."
                                            value={newChat}
                                            onChange={(e) => setNewChat(e.target.value)}
                                            onFocus={(e) => {
                                                if (!ensureLoggedIn()) e.target.blur();
                                            }}
                                        />
                                        <button type="submit" disabled={!newChat.trim()}>Send</button>
                                    </form>
                                </div>
                            </div>
                        )}

                        {activeSection === 'game' && (
                            <div className="game-section">
                                <div className="gamification-header">
                                    <div className="stats-box">
                                        <div className="points">
                                            <span className="points-label">Prosperity Points</span>
                                            <span className="points-value">{userStats.points}</span>
                                        </div>
                                        <div className="badges-list">
                                            {userStats.badges.map(b => (
                                                <div key={b.id} className="badge-icon" title={b.description}>
                                                    <Trophy size={20} />
                                                </div>
                                            ))}
                                            {userStats.badges.length === 0 && <p className="no-badges">Earn your first badge!</p>}
                                        </div>
                                    </div>
                                    <div className="civic-intro">
                                        <h3>Civic IQ Challenges</h3>
                                        <p>Learn parliamentary procedures and earn Prosperity Points!</p>
                                    </div>
                                </div>

                                <div className="grid-list">
                                    {quizzes.length > 0 ? quizzes.map(q => (
                                        <div key={q.id} className="quiz-card" onClick={() => ensureLoggedIn() && (setCurrentQuiz(q), setQuizAnswers([]), setQuizResult(null))}>
                                            <div className="quiz-icon"><Brain size={24} /></div>
                                            <h4>{q.title}</h4>
                                            <p>{q.description}</p>
                                            <div className="quiz-footer">
                                                <span>{q.questions.length} Questions</span>
                                                <span className="reward">+{q.points_reward} Points</span>
                                            </div>
                                        </div>
                                    )) : <p className="empty-msg">New challenges coming soon!</p>}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Quiz Modal */}
            {currentQuiz && (
                <div className="modal-backdrop">
                    <div className="modal-content quiz-modal">
                        {!quizResult ? (
                            <>
                                <div className="modal-header">
                                    <h3>{currentQuiz.title}</h3>
                                    <button className="close-btn" onClick={() => setCurrentQuiz(null)}>✕</button>
                                </div>
                                <div className="quiz-body">
                                    {currentQuiz.questions.map((q, idx) => {
                                        const options = JSON.parse(q.options);
                                        return (
                                            <div key={q.id} className="question-block">
                                                <p className="q-text">{idx + 1}. {q.question_text}</p>
                                                <div className="options-grid">
                                                    {options.map((opt: string, optIdx: number) => (
                                                        <button
                                                            key={optIdx}
                                                            className={`opt-btn ${quizAnswers[idx] === optIdx ? 'selected' : ''}`}
                                                            onClick={() => {
                                                                const next = [...quizAnswers];
                                                                next[idx] = optIdx;
                                                                setQuizAnswers(next);
                                                            }}
                                                        >
                                                            {opt}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <button
                                    className="submit-btn"
                                    disabled={quizAnswers.length < currentQuiz.questions.length}
                                    onClick={submitQuiz}
                                >
                                    Finish Quiz
                                </button>
                            </>
                        ) : (
                            <div className="result-view">
                                {quizResult.reward > 0 ? <CheckCircle2 size={64} color="#4CAF50" /> : <XCircle size={64} color="#FF5252" />}
                                <h3>{quizResult.reward > 0 ? 'Excellent!' : 'Try Again!'}</h3>
                                <p>You got {quizResult.correct} out of {quizResult.total} correct.</p>
                                {quizResult.reward > 0 && <p className="reward-text">+{quizResult.reward} Prosperity Points Earned!</p>}
                                <button className="submit-btn" onClick={() => setCurrentQuiz(null)}>Close</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Creation Modal */}
            {showModal && (
                <div className="modal-backdrop">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>
                                {editingMeeting ? 'Edit Meeting' :
                                    activeSection === 'meetings' ? 'Schedule Meeting' :
                                        activeSection === 'polls' ? 'Create Poll' : 'New Forum Post'}
                            </h3>
                            <button className="close-btn" onClick={() => { setShowModal(false); setEditingMeeting(null); }}>✕</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            {activeSection === 'polls' ? (
                                <>
                                    <div className="form-group">
                                        <label>Poll Type</label>
                                        <select value={pollType} onChange={(e) => setPollType(e.target.value)} className="form-select">
                                            <option value="choice">Multiple Choice (Single Select)</option>
                                            <option value="checkbox">Multiple Choice (Checkboxes)</option>
                                            <option value="boolean">Yes / No</option>
                                            <option value="text">Open Ended (Coming Soon)</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Expiration Date & Time</label>
                                        <input type="datetime-local" value={pollExpiresAt} onChange={(e) => setPollExpiresAt(e.target.value)} />
                                        <small className="help-text">Leave blank for no expiration</small>
                                    </div>
                                    <div className="form-group">
                                        <label>Question</label>
                                        <input type="text" placeholder="What would you like to ask?" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required />
                                    </div>
                                    {pollType !== 'boolean' && pollType !== 'text' && (
                                        <div className="form-group">
                                            <label>Options</label>
                                            {pollOptions.map((opt, i) => (
                                                <div key={i} className="poll-opt-row">
                                                    <input type="text" placeholder={`Option ${i + 1}`} value={opt} onChange={(e) => {
                                                        const next = [...pollOptions];
                                                        next[i] = e.target.value;
                                                        setPollOptions(next);
                                                    }} className="poll-opt-input" required />
                                                    {pollOptions.length > 2 && (
                                                        <button type="button" className="remove-opt-btn" onClick={() => setPollOptions(pollOptions.filter((_, idx) => idx !== i))}>✕</button>
                                                    )}
                                                </div>
                                            ))}
                                            <button type="button" className="add-opt-btn" onClick={() => setPollOptions([...pollOptions, ''])}>+ Add Option</button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <div className="form-group">
                                        <label>Title</label>
                                        <input type="text" placeholder="Descriptive title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required />
                                    </div>
                                    <div className="form-group">
                                        <label>{activeSection === 'meetings' ? 'Description' : 'Content'}</label>
                                        <textarea placeholder={activeSection === 'meetings' ? "Meeting details, goals, etc." : "What's on your mind?"} value={newContent} onChange={(e) => setNewContent(e.target.value)} required></textarea>
                                    </div>
                                    {activeSection === 'meetings' && (
                                        <>
                                            <div className="form-group">
                                                <label>Date & Time</label>
                                                <input
                                                    type="datetime-local"
                                                    value={newScheduledAt}
                                                    onChange={(e) => setNewScheduledAt(e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Meeting Link</label>
                                                <input
                                                    type="text"
                                                    placeholder="Zoom, GMeet, etc."
                                                    value={newLink}
                                                    onChange={(e) => setNewLink(e.target.value)}
                                                    required
                                                />
                                            </div>
                                        </>
                                    )}
                                </>
                            )}
                            <button type="submit" className="submit-btn" disabled={loading}>
                                {editingMeeting ? 'Save Changes' : 'Create'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
