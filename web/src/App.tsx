import { useState, useEffect } from 'react';
import { FileText, Calendar, User, Users, MessageSquare, Shield, Activity } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Onboarding } from './pages/Onboarding';
import { ProfilePage } from './pages/ProfilePage';
import { SearchPage } from './pages/SearchPage';
import { DailyPage } from './pages/DailyPage';
import { RepresentativesPage } from './pages/RepresentativesPage';
import { BarazaPage } from './pages/BarazaPage';
import { AdminOverviewPage } from './pages/AdminOverviewPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { AdminSystemPage } from './pages/AdminSystemPage';
import { LeaderDashboard } from './pages/LeaderDashboard';
import './App.css';

type TabId = 'docs' | 'daily' | 'representative' | 'profile' | 'baraza' | 'admin_overview' | 'admin_users' | 'admin_system' | 'leader_portal';

const TABS: { id: TabId; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
  { id: 'daily', label: 'Daily', icon: <Calendar size={18} /> },
  { id: 'docs', label: 'Docs', icon: <FileText size={18} /> },
  { id: 'baraza', label: 'Baraza', icon: <MessageSquare size={18} /> },
  { id: 'representative', label: 'Leaders', icon: <Users size={18} /> },
  { id: 'leader_portal', label: 'Rep Portal', icon: <Shield size={18} /> },
  { id: 'admin_overview', label: 'Overview', icon: <Activity size={18} />, adminOnly: true },
  { id: 'admin_users', label: 'Users', icon: <Users size={18} />, adminOnly: true },
  { id: 'admin_system', label: 'System', icon: <Shield size={18} />, adminOnly: true },
  { id: 'profile', label: 'Profile', icon: <User size={18} /> },
];

function AppContent() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('daily');

  // Ensure leaders are not on restricted tabs
  useEffect(() => {
    if (user?.is_admin && !['admin_overview', 'admin_users', 'admin_system', 'profile'].includes(activeTab)) {
        setActiveTab('admin_overview');
    }
    else if (user?.role === 'LEADER' && (activeTab === 'daily' || activeTab === 'docs')) {
      setActiveTab('leader_portal');
    }
  }, [user, activeTab]);

  const handleLogout = () => {
    logout();
    setActiveTab('daily');
  };

  const handleTabClick = (tabId: TabId) => {
    if (tabId === 'profile' && !user) {
      // Mandatory sign-in check
      setActiveTab('profile');
      return;
    }
    setActiveTab(tabId);
  };

  return (
    <div className="app-container">
      {/* Top Navigation Bar */}
      <nav className="tab-bar">
        <div className="tab-bar-brand">ParliaScope</div>
        <div className="tab-bar-tabs">
          {TABS.filter(tab => {
            if (tab.adminOnly) return user?.is_admin;
            if (tab.id === 'leader_portal') return user?.role === 'LEADER';
            
            // Admins should only see the Admin tabs and Profile tabs. Hide Daily, Docs, Baraza, Leaders.
            if (user?.is_admin && !tab.adminOnly && tab.id !== 'profile') return false;
            
            // Leaders don't see Daily or Docs
            if (user?.role === 'LEADER' && (tab.id === 'daily' || tab.id === 'docs')) return false;
            return true;
          }).map(tab => (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? 'tab-active' : ''}`}
              onClick={() => handleTabClick(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Tab Content */}
      <main className="tab-content">
        {activeTab === 'daily' && <DailyPage />}
        {activeTab === 'docs' && <SearchPage onSwitchToProfile={() => setActiveTab('profile')} />}
        {activeTab === 'baraza' && <BarazaPage onSwitchToProfile={() => setActiveTab('profile')} />}
        {activeTab === 'representative' && <RepresentativesPage onSwitchToProfile={() => setActiveTab('profile')} />}
        {activeTab === 'leader_portal' && user?.role === 'LEADER' && <LeaderDashboard />}
        {activeTab === 'admin_overview' && user?.is_admin && <AdminOverviewPage />}
        {activeTab === 'admin_users' && user?.is_admin && <AdminUsersPage />}
        {activeTab === 'admin_system' && user?.is_admin && <AdminSystemPage />}
        {activeTab === 'profile' && (
          user ? <ProfilePage onLogout={handleLogout} /> : <Onboarding onComplete={() => setActiveTab('profile')} />
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
