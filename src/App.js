import React, { useEffect, useState } from 'react';
import RocketArena from './components/RocketArena';
import StartupAnimation from './components/UI/StartupAnimation';
import { audio } from './utils/audio';
import './App.css';

function App() {
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    const handleGesture = () => {
      audio.init();
      window.removeEventListener('click', handleGesture);
      window.removeEventListener('keydown', handleGesture);
    };

    window.addEventListener('click', handleGesture);
    window.addEventListener('keydown', handleGesture);
  }, []);

  if (showIntro) {
    return <StartupAnimation onComplete={() => setShowIntro(false)} />;
  }

  return <RocketArena />;
}

export default App;