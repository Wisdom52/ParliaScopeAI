import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Linking,
    ActivityIndicator,
    Modal,
    TextInput,
    Alert,
    Dimensions,
    Animated,
    FlatList,
    Keyboard
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { API_BASE_URL } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

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
    points_reward: number;
    questions: Question[];
    difficulty: string;
    source_type?: string;
}

interface Question {
    id: number;
    question_text: string;
    options: string; // JSON
}

interface Badge {
    id: number;
    name: string;
    description: string;
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

interface BarazaProps {
    onSwitchToProfile: () => void;
    user: any;
}

export const BarazaScreen: React.FC<BarazaProps> = ({ onSwitchToProfile, user }) => {
    const [activeSection, setActiveSection] = useState<'meetings' | 'polls' | 'forum' | 'live' | 'game'>('meetings');
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [polls, setPolls] = useState<Poll[]>([]);
    const [posts, setPosts] = useState<ForumPost[]>([]);
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [userStats, setUserStats] = useState({ points: 0, badges: [] as Badge[] });
    const [loading, setLoading] = useState(true);
    const [difficultyFilter, setDifficultyFilter] = useState('all');
    const [generatingQuizzes, setGeneratingQuizzes] = useState(false);

    // Live Stream States
    const [liveVid, setLiveVid] = useState('dQw4w9WgXcQ');
    const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
    const [liveChats, setLiveChats] = useState<LiveChat[]>([]);
    const [newChat, setNewChat] = useState('');
    const chatScrollRef = useRef<ScrollView>(null);

    // Quiz States
    const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
    const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
    const [quizResult, setQuizResult] = useState<{ correct: number, total: number, reward: number } | null>(null);

    // Create Modals visibility
    const [showMeetingModal, setShowMeetingModal] = useState(false);
    const [showPollModal, setShowPollModal] = useState(false);
    const [showForumModal, setShowForumModal] = useState(false);

    // Form states
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newLink, setNewLink] = useState('');
    const [newScheduledAt, setNewScheduledAt] = useState('');
    const [newQuestion, setNewQuestion] = useState('');
    const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
    const [pollOptions, setPollOptions] = useState(['', '']);
    const [pollType, setPollType] = useState('choice'); // choice, checkbox, boolean, text
    const [pollExpiresAt, setPollExpiresAt] = useState('');
    const [currentUserId, setCurrentUserId] = useState<number | null>(user?.id || null);

    useEffect(() => {
        if (user) setCurrentUserId(user.id);
        else setCurrentUserId(null);
    }, [user]);

    useEffect(() => {
        fetchData();
        if (activeSection === 'game') fetchGamification();
    }, [activeSection, difficultyFilter]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeSection === 'live') {
                const res = await fetch(`${API_BASE_URL}/baraza/live/stream`);
                const data = await res.json();
                if (data.channel_id) {
                    setLiveVid(`live_stream?channel=${data.channel_id}`);
                } else {
                    setLiveVid(data.youtube_id);
                }
                fetchChats();
            } else if (activeSection === 'game') {
                const url = difficultyFilter !== 'all'
                    ? `${API_BASE_URL}/baraza/quizzes?difficulty=${difficultyFilter}`
                    : `${API_BASE_URL}/baraza/quizzes`;
                const res = await fetch(url);
                const data = await res.json();
                setQuizzes(Array.isArray(data) ? data : []);
            } else {
                const endpoint = activeSection === 'forum' ? 'forum' : activeSection;
                const res = await fetch(`${API_BASE_URL}/baraza/${endpoint}`);
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
            const res = await fetch(`${API_BASE_URL}/baraza/live/chat`);
            const data = await res.json();
            setLiveChats(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Chat fetch error", err);
        }
    };

    useEffect(() => {
        let interval: NodeJS.Timeout;
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
            const token = await AsyncStorage.getItem('parliaScope_token');
            const res = await fetch(`${API_BASE_URL}/baraza/user/gamification`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setUserStats({
                points: data.prosperity_points || 0,
                badges: Array.isArray(data.badges) ? data.badges : []
            });
            // Also get current user ID for meeting permissions
            const meRes = await fetch(`${API_BASE_URL}/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (meRes.ok) {
                const meData = await meRes.json();
                setCurrentUserId(meData.id);
            }
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
            const token = await AsyncStorage.getItem('parliaScope_token');
            const res = await fetch(`${API_BASE_URL}/baraza/polls/vote`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ poll_id: pollId, option_id: optionId })
            });
            const data = await res.json();
            if (res.ok) {
                Alert.alert("Success", "Your vote has been recorded!");
                fetchData();
            } else {
                Alert.alert("Error", data.detail || "Could not record vote.");
            }
        } catch (err) {
            Alert.alert("Error", "Network error. Please try again.");
        }
    };

    const handlePulse = async (type: string) => {
        if (!ensureLoggedIn()) return;
        const newReaction = { id: Date.now(), type, left: Math.random() * 80 + 10 };
        setFloatingReactions(prev => [...prev, newReaction]);
        setTimeout(() => setFloatingReactions(prev => prev.filter(r => r.id !== newReaction.id)), 3000);

        try {
            const token = await AsyncStorage.getItem('parliaScope_token');
            await fetch(`${API_BASE_URL}/baraza/live/pulse`, {
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

    const handleSendChat = async () => {
        if (!newChat.trim() || !ensureLoggedIn()) return;
        try {
            const token = await AsyncStorage.getItem('parliaScope_token');
            const res = await fetch(`${API_BASE_URL}/baraza/live/chat`, {
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
                Alert.alert("Error", "Failed to send chat.");
            }
        } catch (err) {
            Alert.alert("Error", "Network error while sending chat.");
        }
    };

    const submitQuiz = async () => {
        if (!currentQuiz) return;
        if (!ensureLoggedIn()) {
            setCurrentQuiz(null); // Close quiz view if redirecting
            return;
        }
        try {
            const token = await AsyncStorage.getItem('parliaScope_token');
            const res = await fetch(`${API_BASE_URL}/baraza/quizzes/${currentQuiz.id}/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(quizAnswers)
            });
            const data = await res.json();
            setQuizResult({ correct: data.correct, total: data.total, reward: data.points_awarded });
            if (data.new_badges && data.new_badges.length > 0) {
                Alert.alert("New Badges!", `You unlocked: ${data.new_badges.map((b: any) => b.name).join(', ')}`);
            }
            fetchGamification();
        } catch (err) {
            Alert.alert("Error", "Failed to submit quiz.");
        }
    };

    const handleRefreshQuizzes = async () => {
        setGeneratingQuizzes(true);
        try {
            const res = await fetch(`${API_BASE_URL}/baraza/quizzes/generate-daily`);
            if (res.ok) {
                Alert.alert("Success", "Generated fresh AI quizzes for today!");
                fetchData();
            } else {
                Alert.alert("Info", "New quizzes are already available for today.");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setGeneratingQuizzes(false);
        }
    };

    const handleCreatePost = async () => {
        if ((!newTitle || !newDesc) && !newQuestion) return;
        if (activeSection === 'meetings' && !newLink) {
            Alert.alert("Error", "Meeting link is required.");
            return;
        }
        try {
            const token = await AsyncStorage.getItem('parliaScope_token');
            const endpoint = activeSection === 'forum' ? 'forum' : activeSection;

            let body: any;
            if (activeSection === 'meetings') {
                body = {
                    title: newTitle,
                    description: newDesc,
                    meeting_link: newLink,
                    scheduled_at: newScheduledAt || new Date().toISOString()
                };
            } else if (activeSection === 'polls') {
                let optionsData = pollOptions.filter(o => o.trim()).map(o => ({ text: o }));
                if (pollType === 'boolean') {
                    optionsData = [{ text: 'Yes' }, { text: 'No' }];
                }
                body = {
                    question: newQuestion,
                    poll_type: pollType,
                    expires_at: pollExpiresAt || null,
                    options: optionsData
                };
            } else {
                body = { title: newTitle, content: newDesc };
            }

            const method = editingMeeting ? 'PUT' : 'POST';
            const url = editingMeeting
                ? `${API_BASE_URL}/baraza/meetings/${editingMeeting.id}`
                : `${API_BASE_URL}/baraza/${endpoint}`;

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });
            if (res.ok) {
                Alert.alert("Success", editingMeeting ? "Updated successfully!" : "Created successfully!");
                setShowMeetingModal(false);
                setShowPollModal(false);
                setShowForumModal(false);
                setEditingMeeting(null);
                fetchData();
                setNewTitle('');
                setNewDesc('');
                setNewLink('');
                setNewScheduledAt('');
                setNewQuestion('');
                setPollOptions(['', '']);
                setPollType('choice');
                setPollExpiresAt('');
            } else {
                const data = await res.json();
                Alert.alert("Error", data.detail || "Failed to submit.");
            }
        } catch (err) {
            Alert.alert("Error", "Network error.");
        }
    };

    const handleDeletePoll = async (id: number) => {
        Alert.alert(
            "Delete Poll",
            "Are you sure you want to delete this poll?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const token = await AsyncStorage.getItem('parliaScope_token');
                            const res = await fetch(`${API_BASE_URL}/baraza/polls/${id}`, {
                                method: 'DELETE',
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            if (res.ok) {
                                fetchData();
                            } else {
                                const data = await res.json();
                                Alert.alert("Error", data.detail || "Failed to delete.");
                            }
                        } catch (err) {
                            Alert.alert("Error", "Delete failed.");
                        }
                    }
                }
            ]
        );
    };

    const handleDeleteMeeting = async (id: number) => {
        Alert.alert(
            "Delete Meeting",
            "Are you sure you want to delete this meeting?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const token = await AsyncStorage.getItem('parliaScope_token');
                            const res = await fetch(`${API_BASE_URL}/baraza/meetings/${id}`, {
                                method: 'DELETE',
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            if (res.ok) {
                                fetchData();
                            } else {
                                Alert.alert("Error", "Failed to delete.");
                            }
                        } catch (err) {
                            Alert.alert("Error", "Delete failed.");
                        }
                    }
                }
            ]
        );
    };

    const handleEditMeeting = (m: Meeting) => {
        setEditingMeeting(m);
        setNewTitle(m.title);
        setNewDesc(m.description);
        setNewLink(m.meeting_link);
        const date = new Date(m.scheduled_at);
        const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        setNewScheduledAt(localDate);
        setShowMeetingModal(true);
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

    const renderMeetings = () => (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Upcoming Meetings</Text>
                <TouchableOpacity style={styles.createBtn} onPress={() => ensureLoggedIn() && setShowMeetingModal(true)}>
                    <MaterialCommunityIcons name="calendar-plus" size={20} color="#fff" />
                    <Text style={styles.createBtnText}>Schedule</Text>
                </TouchableOpacity>
            </View>
            {meetings.length > 0 ? meetings.map(m => (
                <View key={m.id} style={styles.card}>
                    <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>UPCOMING</Text>
                    </View>
                    <Text style={styles.cardTitle}>{m.title}</Text>
                    <Text style={styles.cardDesc}>{m.description}</Text>
                    <View style={styles.cardFooter}>
                        <View style={styles.footerInfo}>
                            <MaterialCommunityIcons name="calendar-clock" size={16} color="#8E8E93" />
                            <Text style={styles.footerText}>{new Date(m.scheduled_at).toLocaleString()}</Text>
                        </View>
                        {m.meeting_link && (
                            <TouchableOpacity onPress={() => Linking.openURL(m.meeting_link!)} style={styles.joinBtn}>
                                <Text style={styles.joinBtnText}>Join</Text>
                                <MaterialCommunityIcons name="open-in-new" size={14} color="#007AFF" />
                            </TouchableOpacity>
                        )}
                        {currentUserId === m.host_id && (
                            <View style={styles.actionRow}>
                                <TouchableOpacity onPress={() => handleEditMeeting(m)} style={styles.iconBtn}>
                                    <MaterialCommunityIcons name="pencil-outline" size={18} color="#007AFF" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleDeleteMeeting(m.id)} style={styles.iconBtn}>
                                    <MaterialCommunityIcons name="trash-can-outline" size={18} color="#FF3B30" />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            )) : <Text style={styles.emptyMsg}>No meetings scheduled yet.</Text>}
        </View>
    );

    const renderPolls = () => (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Community Polls</Text>
                <TouchableOpacity style={styles.createBtn} onPress={() => ensureLoggedIn() && setShowPollModal(true)}>
                    <MaterialCommunityIcons name="plus" size={20} color="#fff" />
                    <Text style={styles.createBtnText}>New Poll</Text>
                </TouchableOpacity>
            </View>
            {polls.length > 0 ? polls.map(p => {
                const isExpired = !!(p.expires_at && new Date(p.expires_at) < new Date());
                return (
                    <View key={p.id} style={[styles.card, isExpired && { opacity: 0.7 }]}>
                        <View style={styles.pollHeader}>
                            <View style={styles.pollTags}>
                                <View style={[styles.typeTag, { backgroundColor: p.poll_type === 'boolean' ? '#fff7ed' : p.poll_type === 'checkbox' ? '#f0fdf4' : '#e6f3ff' }]}>
                                    <Text style={[styles.typeTagText, { color: p.poll_type === 'boolean' ? '#ea580c' : p.poll_type === 'checkbox' ? '#16a34a' : '#007AFF' }]}>
                                        {p.poll_type?.toUpperCase()}
                                    </Text>
                                </View>
                                {isExpired && (
                                    <View style={[styles.statusTag, { backgroundColor: '#fee2e2' }]}>
                                        <Text style={[styles.statusTagText, { color: '#dc2626' }]}>EXPIRED</Text>
                                    </View>
                                )}
                            </View>
                            {currentUserId === p.creator_id && (
                                <TouchableOpacity onPress={() => handleDeletePoll(p.id)} style={styles.deleteBtn}>
                                    <MaterialCommunityIcons name="trash-can-outline" size={18} color="#dc2626" />
                                </TouchableOpacity>
                            )}
                        </View>
                        <Text style={styles.cardTitle}>{p.question}</Text>
                        <View style={styles.optionsList}>
                            {p.options.map(o => {
                                const totalVotes = p.options.reduce((acc, opt) => acc + opt.vote_count, 0);
                                const percentage = totalVotes > 0 ? (o.vote_count / totalVotes) * 100 : 0;
                                return (
                                    <TouchableOpacity key={o.id} style={styles.optionItem} onPress={() => !isExpired && handleVote(p.id, o.id)} disabled={isExpired}>
                                        <View style={styles.optionInfo}>
                                            <Text style={styles.optionText}>{o.text}</Text>
                                            <Text style={styles.optionPct}>{Math.round(percentage)}%</Text>
                                        </View>
                                        <View style={styles.progressBar}>
                                            <View style={[styles.progress, { width: `${percentage}%` }]} />
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        <View style={styles.pollFooter}>
                            <Text style={styles.voteHint}>{isExpired ? 'Voting closed' : 'Tap an option to vote'}</Text>
                            {p.expires_at && !isExpired && (
                                <Text style={styles.expiryText}>Ends {new Date(p.expires_at).toLocaleDateString()}</Text>
                            )}
                        </View>
                    </View>
                );
            }) : <Text style={styles.emptyMsg}>No active polls currently.</Text>}
        </View>
    );

    const renderForum = () => (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Community Forum</Text>
                <TouchableOpacity style={styles.createBtn} onPress={() => ensureLoggedIn() && setShowForumModal(true)}>
                    <MaterialCommunityIcons name="plus" size={20} color="#fff" />
                    <Text style={styles.createBtnText}>New Post</Text>
                </TouchableOpacity>
            </View>
            {posts.length > 0 ? posts.map(p => (
                <View key={p.id} style={styles.card}>
                    <View style={styles.authorRow}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{p.author_name ? p.author_name[0] : 'C'}</Text>
                        </View>
                        <Text style={styles.authorName}>{p.author_name || 'Citizen'}</Text>
                        <Text style={styles.dot}> • </Text>
                        <Text style={styles.postDate}>{new Date(p.created_at).toLocaleDateString()}</Text>
                    </View>
                    <Text style={styles.cardTitle}>{p.title}</Text>
                    <Text style={styles.cardDesc} numberOfLines={3}>{p.content}</Text>
                    <View style={styles.cardFooter}>
                        <View style={styles.footerInfo}>
                            <MaterialCommunityIcons name="comment-outline" size={16} color="#8E8E93" />
                            <Text style={styles.footerText}>{p.comment_count || 0} comments</Text>
                        </View>
                        <TouchableOpacity style={styles.viewBtn}>
                            <Text style={styles.viewBtnText}>View</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )) : <Text style={styles.emptyMsg}>Start the first discussion!</Text>}
        </View>
    );

    const renderLive = () => (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Live Sitting</Text>
                <View style={styles.liveBadge}>
                    <Text style={styles.liveBadgeText}>LIVE</Text>
                </View>
            </View>
            <View style={styles.videoWrapper}>
                <WebView
                    style={styles.webview}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    allowsFullscreenVideo={true}
                    mediaPlaybackRequiresUserAction={false}
                    source={{
                        uri: `https://www.youtube-nocookie.com/embed/${liveVid}${liveVid.includes('?') ? '&' : '?'}autoplay=1&mute=1&playsinline=1&rel=0&origin=http://localhost`,
                        headers: { 'Referer': 'http://localhost' }
                    }}
                />
                <View style={styles.pulseOverlay} pointerEvents="none">
                    {floatingReactions.map(r => (
                        <AnimatedReaction key={r.id} emoji={getEmoji(r.type)} left={`${r.left}%`} />
                    ))}
                </View>

                <View style={styles.chatOverlayWrapper} pointerEvents="box-none">
                    <ScrollView
                        style={styles.liveChatOverlay}
                        ref={chatScrollRef}
                        onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
                        showsVerticalScrollIndicator={false}
                    >
                        {liveChats.map(c => (
                            <View key={c.id} style={styles.chatBubble}>
                                <Text style={styles.chatAuthor}>{c.user_name}:</Text>
                                <Text style={styles.chatMsg}>{c.message}</Text>
                            </View>
                        ))}
                    </ScrollView>
                </View>
            </View>
            <View style={styles.pulseControls}>
                {['fire', 'clap', 'love', 'angry', 'sad'].map(t => (
                    <TouchableOpacity key={t} style={styles.pulseBtn} onPress={() => handlePulse(t)}>
                        <Text style={styles.pulseBtnText}>{getEmoji(t)}</Text>
                    </TouchableOpacity>
                ))}
            </View>
            <View style={styles.chatInputContainer}>
                <TextInput
                    style={styles.chatInput}
                    placeholder="Join the conversation..."
                    placeholderTextColor="rgba(255,255,255,0.6)"
                    value={newChat}
                    onChangeText={setNewChat}
                    onFocus={() => {
                        if (!ensureLoggedIn()) {
                            Keyboard.dismiss();
                        }
                    }}
                />
                <TouchableOpacity
                    style={[styles.sendBtn, !newChat.trim() ? styles.sendBtnDisabled : null]}
                    onPress={handleSendChat}
                    disabled={!newChat.trim()}
                >
                    <Text style={styles.sendBtnText}>Send</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderGame = () => (
        <View style={styles.section}>
            <View style={styles.gamificationHeader}>
                <View style={styles.statsBox}>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>POINTS</Text>
                        <Text style={styles.statValue}>{userStats.points}</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>BADGES</Text>
                        <View style={styles.badgeRow}>
                            {userStats.badges?.map(b => (
                                <MaterialCommunityIcons key={b.id} name="trophy" size={20} color="gold" />
                            ))}
                        </View>
                    </View>
                </View>
            </View>

            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Civic IQ Challenges</Text>
            </View>

            {/* Difficulty Tabs & Refresh */}
            <View style={styles.diffTabs}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {['all', 'beginner', 'intermediate', 'advanced'].map(d => (
                        <TouchableOpacity
                            key={d}
                            style={[styles.diffTabTab, difficultyFilter === d && styles.activeDiffTab]}
                            onPress={() => setDifficultyFilter(d)}
                        >
                            <MaterialCommunityIcons
                                name={d === 'beginner' ? 'sprout' : d === 'intermediate' ? 'star' : d === 'advanced' ? 'fire' : 'format-list-bulleted'}
                                size={14}
                                color={difficultyFilter === d ? '#007AFF' : '#666'}
                            />
                            <Text style={[styles.diffTabText, difficultyFilter === d && { color: '#007AFF' }]}>
                                {d.charAt(0).toUpperCase() + d.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <TouchableOpacity
                style={styles.refreshBtn}
                onPress={handleRefreshQuizzes}
                disabled={generatingQuizzes}
            >
                <MaterialCommunityIcons name="robot" size={18} color="#007AFF" />
                <Text style={styles.refreshBtnText}>
                    {generatingQuizzes ? 'Generating...' : 'AI Refresh Quizzes'}
                </Text>
            </TouchableOpacity>

            {quizzes.length > 0 ? quizzes.map(q => (
                <TouchableOpacity key={q.id} style={styles.card} onPress={() => { setCurrentQuiz(q); setQuizAnswers([]); setQuizResult(null); }}>
                    <View style={styles.pollHeader}>
                        <View style={styles.quizIconContainer}>
                            <MaterialCommunityIcons name="brain" size={24} color="#007AFF" />
                        </View>
                        <View style={styles.quizTags}>
                            <View style={[styles.diffPill, q.difficulty === 'beginner' ? styles.diffBeginner : q.difficulty === 'intermediate' ? styles.diffIntermediate : styles.diffAdvanced]}>
                                <MaterialCommunityIcons
                                    name={q.difficulty === 'beginner' ? 'sprout' : q.difficulty === 'intermediate' ? 'star' : 'fire'}
                                    size={10}
                                    color={q.difficulty === 'beginner' ? '#2e7d32' : q.difficulty === 'intermediate' ? '#f57c00' : '#d32f2f'}
                                />
                                <Text style={[styles.diffPillText, { color: q.difficulty === 'beginner' ? '#2e7d32' : q.difficulty === 'intermediate' ? '#f57c00' : '#d32f2f' }]}>
                                    {q.difficulty?.toUpperCase()}
                                </Text>
                            </View>
                            {(q as any).source_type === 'ai_generated' && (
                                <View style={styles.aiPill}>
                                    <MaterialCommunityIcons name="robot" size={10} color="#7b1fa2" />
                                    <Text style={styles.aiPillText}>AI</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    <Text style={styles.cardTitle}>{q.title}</Text>
                    <Text style={styles.cardDesc}>{q.description}</Text>
                    <View style={styles.quizCardFooter}>
                        <Text style={styles.footerText}>{q.questions.length} Questions</Text>
                        <View style={styles.rewardBadge}>
                            <Text style={styles.rewardText}>+{q.points_reward} Points</Text>
                        </View>
                    </View>
                </TouchableOpacity>
            )) : <Text style={styles.emptyMsg}>No quizzes yet — tap AI Refresh to generate today's challenges!</Text>}
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabContainer}>
                    {['meetings', 'polls', 'forum', 'live', 'game'].map((sec) => (
                        <TouchableOpacity
                            key={sec}
                            style={[styles.tab, activeSection === sec && styles.activeTab]}
                            onPress={() => setActiveSection(sec as any)}
                        >
                            <MaterialCommunityIcons
                                name={sec === 'meetings' ? 'calendar' : sec === 'polls' ? 'vote' : sec === 'forum' ? 'forum-outline' : sec === 'live' ? 'play-circle-outline' : 'brain'}
                                size={18}
                                color={activeSection === sec ? '#007AFF' : '#666'}
                            />
                            <Text style={[styles.tabText, activeSection === sec ? styles.activeTabText : null, { textTransform: 'capitalize' }]}>{sec}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {loading ? (
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator size="large" color="#007AFF" />
                        <Text style={styles.loaderText}>Loading town hall...</Text>
                    </View>
                ) : (
                    <>
                        {activeSection === 'meetings' && renderMeetings()}
                        {activeSection === 'polls' && renderPolls()}
                        {activeSection === 'forum' && renderForum()}
                        {activeSection === 'live' && renderLive()}
                        {activeSection === 'game' && renderGame()}
                    </>
                )}
            </ScrollView>

            {/* Quiz Modal */}
            <Modal visible={currentQuiz !== null} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalCard, { height: '85%' }]}>
                        {!quizResult ? (
                            <>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>{currentQuiz?.title}</Text>
                                    <TouchableOpacity onPress={() => setCurrentQuiz(null)}>
                                        <MaterialCommunityIcons name="close" size={24} color="#666" />
                                    </TouchableOpacity>
                                </View>
                                <ScrollView style={{ flex: 1 }}>
                                    {currentQuiz?.questions?.map((q, idx) => {
                                        const options = JSON.parse(q.options);
                                        return (
                                            <View key={q.id} style={styles.mobileQBlock}>
                                                <Text style={styles.mobileQText}>{idx + 1}. {q.question_text}</Text>
                                                {Array.isArray(options) ? options.map((opt: string, optIdx: number) => (
                                                    <TouchableOpacity
                                                        key={optIdx}
                                                        style={[styles.mobileOptBtn, quizAnswers[idx] === optIdx ? styles.mobileOptSelected : null]}
                                                        onPress={() => {
                                                            const next = [...quizAnswers];
                                                            next[idx] = optIdx;
                                                            setQuizAnswers(next);
                                                        }}
                                                    >
                                                        <Text style={[styles.mobileOptText, quizAnswers[idx] === optIdx ? styles.mobileOptTextActive : null]}>{opt}</Text>
                                                    </TouchableOpacity>
                                                )) : <Text>No options available.</Text>}
                                            </View>
                                        );
                                    })}
                                </ScrollView>
                                <TouchableOpacity
                                    style={[styles.submitBtn, quizAnswers.length < (currentQuiz?.questions?.length || 0) ? { backgroundColor: '#ccc' } : null]}
                                    onPress={submitQuiz}
                                    disabled={quizAnswers.length < (currentQuiz?.questions?.length || 0)}
                                >
                                    <Text style={styles.submitBtnText}>Submit Quiz</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <View style={styles.mobileResult}>
                                <MaterialCommunityIcons
                                    name={quizResult.reward > 0 ? "check-decagram" : "close-circle"}
                                    size={80}
                                    color={quizResult.reward > 0 ? "#4CAF50" : "#FF3B30"}
                                />
                                <Text style={styles.resultTitle}>{quizResult.reward > 0 ? "Perfect Score!" : "Try Again"}</Text>
                                <Text style={styles.resultDesc}>You got {quizResult.correct}/{quizResult.total} correct.</Text>
                                {quizResult.reward > 0 && (
                                    <View style={styles.pointsBadge}>
                                        <Text style={styles.pointsBadgeText}>+{quizResult.reward} Prosperity Points!</Text>
                                    </View>
                                )}
                                <TouchableOpacity style={styles.submitBtn} onPress={() => setCurrentQuiz(null)}>
                                    <Text style={styles.submitBtnText}>Awesome</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Modals for creation */}
            <Modal visible={showMeetingModal || showPollModal || showForumModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {editingMeeting ? 'Edit Meeting' : showMeetingModal ? 'Schedule Meeting' : showPollModal ? 'Create Poll' : 'New Forum Post'}
                            </Text>
                            <TouchableOpacity onPress={() => { setShowMeetingModal(false); setShowPollModal(false); setShowForumModal(false); setEditingMeeting(null); }}>
                                <MaterialCommunityIcons name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        {showPollModal ? (
                            <ScrollView style={{ maxHeight: 400 }}>
                                <Text style={styles.label}>Poll Type</Text>
                                <View style={styles.typeSelector}>
                                    {['choice', 'checkbox', 'boolean'].map(t => (
                                        <TouchableOpacity
                                            key={t}
                                            style={[styles.typeBtn, pollType === t && styles.typeBtnSelected]}
                                            onPress={() => setPollType(t)}
                                        >
                                            <Text style={[styles.typeBtnText, pollType === t && styles.typeBtnTextSelected]}>
                                                {t === 'choice' ? 'Single' : t === 'checkbox' ? 'Multi' : 'Yes/No'}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <TextInput style={styles.input} placeholder="Question" value={newQuestion} onChangeText={setNewQuestion} />

                                {pollType !== 'boolean' && (
                                    <>
                                        {pollOptions.map((opt, i) => (
                                            <View key={i} style={styles.pollOptionInputRow}>
                                                <TextInput
                                                    style={[styles.input, { flex: 1 }]}
                                                    placeholder={`Option ${i + 1}`}
                                                    value={opt}
                                                    onChangeText={(val) => {
                                                        const next = [...pollOptions];
                                                        next[i] = val;
                                                        setPollOptions(next);
                                                    }}
                                                />
                                                {pollOptions.length > 2 && (
                                                    <TouchableOpacity onPress={() => setPollOptions(pollOptions.filter((_, idx) => idx !== i))} style={styles.removeBtn}>
                                                        <MaterialCommunityIcons name="close-circle" size={20} color="#dc2626" />
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        ))}
                                        <TouchableOpacity onPress={() => setPollOptions([...pollOptions, ''])}>
                                            <Text style={{ color: '#007AFF', marginBottom: 15, fontWeight: '700' }}>+ Add Option</Text>
                                        </TouchableOpacity>
                                    </>
                                )}

                                <Text style={styles.label}>Expiration (YYYY-MM-DD HH:MM)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. 2024-12-31 23:59"
                                    value={pollExpiresAt}
                                    onChangeText={setPollExpiresAt}
                                />
                            </ScrollView>
                        ) : (
                            <View>
                                <TextInput style={styles.input} placeholder="Title" value={newTitle} onChangeText={setNewTitle} />
                                <TextInput style={[styles.input, { height: 100, textAlignVertical: 'top' }]} placeholder={showMeetingModal ? "Description" : "What's on your mind?"} value={newDesc} onChangeText={setNewDesc} multiline />
                                {showMeetingModal && (
                                    <>
                                        <TextInput style={styles.input} placeholder="YYYY-MM-DDTHH:MM" value={newScheduledAt} onChangeText={setNewScheduledAt} />
                                        <Text style={styles.formatHint}>Use format: 2024-03-25T14:30</Text>
                                        <TextInput style={styles.input} placeholder="Meeting Link (Required)" value={newLink} onChangeText={setNewLink} />
                                    </>
                                )}
                            </View>
                        )}
                        <TouchableOpacity style={styles.submitBtn} onPress={handleCreatePost}>
                            <Text style={styles.submitBtnText}>Submit</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const AnimatedReaction: React.FC<{ emoji: string, left: any }> = ({ emoji, left }) => {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(anim, { toValue: 1, duration: 3000, useNativeDriver: true }).start();
    }, []);
    const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -height] });
    const opacity = anim.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 1, 1, 0] });
    return (
        <Animated.Text style={[styles.floatingEmoji, { left, opacity, transform: [{ translateY }] }]}>
            {emoji}
        </Animated.Text>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { padding: 15, backgroundColor: '#fff' },
    tabContainer: { flexDirection: 'row', backgroundColor: '#F2F2F7', borderRadius: 12, padding: 4 },
    tab: { paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, gap: 6, minWidth: 100 },
    activeTab: { backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
    tabText: { fontSize: 13, fontWeight: '600', color: '#666' },
    activeTabText: { color: '#007AFF' },
    content: { padding: 20 },
    section: { marginBottom: 20 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    sectionTitle: { fontSize: 20, fontWeight: '800', color: '#1a1a1a' },
    createBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#007AFF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 4 },
    createBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#F2F2F7', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8 },
    statusBadge: { alignSelf: 'flex-start', backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: 12 },
    statusText: { fontSize: 10, fontWeight: '800', color: '#2E7D32' },
    cardTitle: { fontSize: 17, fontWeight: '700', color: '#1C1C1E', marginBottom: 8 },
    cardDesc: { fontSize: 15, color: '#666', lineHeight: 22, marginBottom: 16 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F2F2F7' },
    footerInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    footerText: { fontSize: 13, color: '#8E8E93' },
    joinBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    joinBtnText: { fontSize: 14, color: '#007AFF', fontWeight: '700' },
    optionsList: { marginBottom: 10 },
    optionItem: { marginBottom: 15 },
    optionInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    optionText: { fontSize: 14, fontWeight: '600', color: '#3A3A3C' },
    optionPct: { fontSize: 13, color: '#007AFF', fontWeight: '700' },
    progressBar: { height: 8, backgroundColor: '#F2F2F7', borderRadius: 4, overflow: 'hidden' },
    progress: { height: '100%', backgroundColor: '#007AFF' },
    voteHint: { textAlign: 'center', color: '#8E8E93', fontSize: 12, fontStyle: 'italic' },
    authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F2F2F7', alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 14, fontWeight: '700', color: '#007AFF' },
    authorName: { fontSize: 14, fontWeight: '600', color: '#1C1C1E', marginLeft: 8 },
    dot: { color: '#8E8E93' },
    postDate: { fontSize: 13, color: '#8E8E93' },
    viewBtn: { backgroundColor: '#F2F2F7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
    viewBtnText: { fontSize: 13, fontWeight: '600', color: '#3A3A3C' },
    emptyMsg: { textAlign: 'center', color: '#8E8E93', marginTop: 40, fontSize: 16 },
    loaderContainer: { alignItems: 'center', marginTop: 60 },
    loaderText: { marginTop: 12, color: '#666', fontSize: 15 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: '800', color: '#1a1a1a' },
    input: { backgroundColor: '#F2F2F7', borderRadius: 12, padding: 14, marginBottom: 15, fontSize: 16 },
    submitBtn: { backgroundColor: '#007AFF', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

    // Live Styles
    liveBadge: { backgroundColor: '#FF3B30', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    liveBadgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
    videoWrapper: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000', borderRadius: 16, overflow: 'hidden', position: 'relative' },
    webview: { flex: 1 },
    pulseOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 10 },
    floatingEmoji: { position: 'absolute', bottom: 0, fontSize: 32 },
    pulseControls: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 20, paddingVertical: 10 },
    pulseBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#F2F2F7', alignItems: 'center', justifyContent: 'center' },
    pulseBtnText: { fontSize: 24 },

    // Game Styles
    gamificationHeader: { padding: 20, backgroundColor: '#007AFF', borderRadius: 20, marginBottom: 20 },
    statsBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', padding: 15, borderRadius: 12 },
    statItem: { flex: 1, alignItems: 'center' },
    statLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '700' },
    statValue: { color: '#fff', fontSize: 24, fontWeight: '800' },
    statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.2)' },
    badgeRow: { flexDirection: 'row', gap: 4, marginTop: 4 },
    quizIconContainer: { width: 44, height: 44, backgroundColor: '#F2F2F7', borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
    quizCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
    rewardBadge: { backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    rewardText: { color: '#2E7D32', fontSize: 12, fontWeight: '800' },
    mobileQBlock: { marginBottom: 30, backgroundColor: '#F2F2F7', padding: 15, borderRadius: 15 },
    mobileQText: { fontSize: 16, fontWeight: '700', color: '#1c1c1e', marginBottom: 15 },
    mobileOptBtn: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#e5e5e7' },
    mobileOptSelected: { borderColor: '#007AFF', backgroundColor: '#eef7ff' },
    mobileOptText: { fontSize: 14, color: '#1c1c1e', fontWeight: '500' },
    mobileOptTextActive: { color: '#007AFF', fontWeight: '700' },
    mobileResult: { alignItems: 'center', paddingVertical: 40 },
    resultTitle: { fontSize: 24, fontWeight: '800', marginTop: 20, color: '#1c1c1e' },
    resultDesc: { fontSize: 16, color: '#666', marginTop: 10 },
    pointsBadge: { backgroundColor: '#4CAF50', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 30, marginTop: 20, marginBottom: 20 },
    pointsBadgeText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    formatHint: { fontSize: 11, color: '#888', marginBottom: 15, marginTop: -10, marginLeft: 5 },
    actionRow: { flexDirection: 'row', gap: 12 },
    iconBtn: { padding: 4 },
    pollHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    pollTags: { flexDirection: 'row', gap: 8 },
    typeTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    typeTagText: { fontSize: 10, fontWeight: 'bold' },
    statusTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    statusTagText: { fontSize: 10, fontWeight: 'bold' },
    deleteBtn: { padding: 5 },
    pollFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F2F2F7' },
    expiryText: { fontSize: 10, color: '#8E8E93', fontStyle: 'italic' },
    typeSelector: { flexDirection: 'row', gap: 10, marginBottom: 15 },
    typeBtn: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f0f0f5', borderWidth: 1, borderColor: '#e0e0e0' },
    typeBtnSelected: { backgroundColor: '#e6f3ff', borderColor: '#007AFF' },
    typeBtnText: { fontSize: 12, fontWeight: '600', color: '#666' },

    // Chat Overlay Styles
    chatOverlayWrapper: { position: 'absolute', bottom: 10, left: 10, width: '75%', height: '45%' },
    liveChatOverlay: { flex: 1 },
    chatBubble: { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 6, alignSelf: 'flex-start', flexWrap: 'wrap', flexDirection: 'row', alignItems: 'center' },
    chatAuthor: { fontWeight: '700', color: '#e0e7ff', fontSize: 13, marginRight: 4 },
    chatMsg: { color: '#fff', fontSize: 13 },
    chatInputContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 10 },
    chatInput: { flex: 1, backgroundColor: '#F2F2F7', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#000' },
    sendBtn: { backgroundColor: '#007AFF', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 20 },
    sendBtnDisabled: { opacity: 0.5 },
    sendBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    typeBtnTextSelected: { color: '#007AFF' },
    pollOptionInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    removeBtn: { marginBottom: 15 },
    label: { fontSize: 12, fontWeight: '700', color: '#666', marginBottom: 8, textTransform: 'uppercase' },
    diffTabs: { backgroundColor: '#F2F2F7', borderRadius: 12, padding: 4, marginBottom: 15 },
    diffTabTab: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
    activeDiffTab: { backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
    diffTabText: { fontSize: 12, fontWeight: '700', color: '#666' },
    refreshBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, backgroundColor: '#f0f7ff', borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#cce5ff' },
    refreshBtnText: { color: '#007AFF', fontSize: 14, fontWeight: '700' },
    quizTags: { alignItems: 'flex-end', gap: 6 },
    diffPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    diffPillText: { fontSize: 9, fontWeight: '800' },
    aiPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: '#f3e5f5' },
    aiPillText: { fontSize: 9, fontWeight: '800', color: '#7b1fa2' },
    diffBeginner: { backgroundColor: '#e8f5e9' },
    diffIntermediate: { backgroundColor: '#fff3e0' },
    diffAdvanced: { backgroundColor: '#ffebee' },
});
