import { useState } from 'react';
import { Home, Search, MessageSquare, Headphones } from 'lucide-react';
import { Onboarding } from './pages/Onboarding';
import { HomePage } from './pages/HomePage';
import { SearchPage } from './pages/SearchPage';
import { ChatInterface } from './pages/ChatInterface';
import { ListenPage } from './pages/ListenPage';
import './App.css';

type TabId = 'home' | 'search' | 'chat' | 'listen';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'home', label: 'Home', icon: <Home size={18} /> },
  { id: 'search', label: 'Search', icon: <Search size={18} /> },
  { id: 'chat', label: 'Chat', icon: <MessageSquare size={18} /> },
  { id: 'listen', label: 'Listen', icon: <Headphones size={18} /> },
];

function App() {
  const [isOnboarded, setIsOnboarded] = useState(() => {
    return localStorage.getItem('parliaScope_onboarded') === 'true';
  });
  const [activeTab, setActiveTab] = useState<TabId>('home');

  const handleOnboardingComplete = () => {
    localStorage.setItem('parliaScope_onboarded', 'true');
    setIsOnboarded(true);
  };

  if (!isOnboarded) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

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
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Tab Content */}
      <main className="tab-content">
        {activeTab === 'home' && <HomePage onNavigate={(tab) => setActiveTab(tab as TabId)} />}
        {activeTab === 'search' && <SearchPage />}
        {activeTab === 'chat' && <ChatInterface />}
        {activeTab === 'listen' && <ListenPage />}
      </main>
    </div>
  );
}

export default App;
