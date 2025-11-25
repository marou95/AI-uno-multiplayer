// src/client/components/SoundToggle.tsx

import React, { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react'; 
import { audioManager } from '../utils/sounds';

export const SoundToggle = () => {
  const [isMuted, setIsMuted] = useState(audioManager.isMuted);

  const toggle = () => {
    const newState = audioManager.toggleMute();
    setIsMuted(newState);
  };

  return (
    <button 
      onClick={toggle}
      className="fixed top-4 right-4 z-[60] bg-black/50 hover:bg-black/80 text-white p-3 rounded-full backdrop-blur-md transition-all border border-white/20 shadow-lg"
      title={isMuted ? "Unmute SFX" : "Mute SFX"}
    >
      {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
    </button>
  );
};