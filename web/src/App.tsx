import { useState } from 'react';
import { Home, FileText, Calendar, User } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Onboarding } from './pages/Onboarding';
import { ProfilePage } from './pages/ProfilePage';
import { HomePage } from './pages/HomePage';
import { SearchPage } from './pages/SearchPage';
import { DailyPage } from './pages/DailyPage';
import './App.css';

type TabId = 'home' | 'docs' | 'chat' | 'daily' | 'profile';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'home', label: 'Home', icon: <Home size={18} /> },
  { id: 'docs', label: 'Docs', icon: <FileText size={18} /> },
  { id: 'daily', label: 'Daily', icon: <Calendar size={18} /> },
  { id: 'profile', label: 'Profile', icon: <User size={18} /> },
];

function AppContent() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('home');

  const handleLogout = () => {
    logout();
    setActiveTab('home');
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
              className={`tab - button ${activeTab === tab.id ? 'tab-active' : ''} `}
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
        {activeTab === 'home' && <HomePage onNavigate={(tab) => handleTabClick(tab as TabId)} />}
        {activeTab === 'docs' && <SearchPage />}
        {activeTab === 'daily' && <DailyPage />}
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
