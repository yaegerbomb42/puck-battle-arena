import React, { useEffect, useState } from 'react';
import BattleArena from './components/BattleArena';
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

  return (
    <>
      {showIntro && (
        <StartupAnimation onComplete={() => setShowIntro(false)} />
      )}
      <BattleArena />
    </>
  );
}

export default App;
