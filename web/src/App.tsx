import { useState } from 'react';
import { FileText, Calendar, User, Users } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Onboarding } from './pages/Onboarding';
import { ProfilePage } from './pages/ProfilePage';
import { SearchPage } from './pages/SearchPage';
import { DailyPage } from './pages/DailyPage';
import { RepresentativesPage } from './pages/RepresentativesPage';
import './App.css';

type TabId = 'docs' | 'daily' | 'representative' | 'profile';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'daily', label: 'Daily', icon: <Calendar size={18} /> },
  { id: 'docs', label: 'Docs', icon: <FileText size={18} /> },
  { id: 'representative', label: 'Representative', icon: <Users size={18} /> },
  { id: 'profile', label: 'Profile', icon: <User size={18} /> },
];

function AppContent() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('daily');

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
          {TABS.map(tab => (
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
        {activeTab === 'docs' && <SearchPage />}
        {activeTab === 'representative' && <RepresentativesPage onSwitchToProfile={() => setActiveTab('profile')} />}
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
