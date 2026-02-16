import { Onboarding } from './pages/Onboarding'
import { ChatInterface } from './pages/ChatInterface'
import { AudioPlayer } from './components/ui/AudioPlayer'
import { SearchPage } from './pages/SearchPage'
import './App.css'

function App() {
  return (
    <>
      <Onboarding />
      <hr />
      <AudioPlayer src="http://localhost:8000/audio/daily-brief?lang=en" title="Daily Brief (English)" />
      <div style={{ marginTop: '10px' }}></div>
      <SearchPage />
      <hr />
      <ChatInterface />
    </>
  )
}

export default App
