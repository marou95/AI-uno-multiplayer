import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react'; 
import { audioManager } from '../utils/sounds';
import { useStore } from '../store/useStore';

export const SoundToggle = () => {
  const [isMuted, setIsMuted] = useState(audioManager.isMuted);
  const { gameState } = useStore();

  const toggle = () => {
    const newState = audioManager.toggleMute();
    setIsMuted(newState);

    // Relancer la musique appropriée si on réactive le son
    if (!newState) {
      if (gameState && gameState.status === 'PLAYING') {
        audioManager.playMusic('bgm_game');
      } else {
        audioManager.playMusic('bgm_lobby');
      }
    }
  };

  // Gestion dynamique de la musique selon l'état du jeu
  useEffect(() => {
    if (isMuted) return;

    if (!gameState || gameState.status === 'LOBBY') {
        audioManager.playMusic('bgm_lobby');
    } else if (gameState.status === 'PLAYING') {
        audioManager.playMusic('bgm_game');
    } else if (gameState.status === 'FINISHED') {
        audioManager.stopMusic(); // Silence ou son spécifique à la fin
    }
  }, [gameState?.status, isMuted]);

  return (
    <button 
      onClick={toggle}
      className="fixed top-4 right-4 z-[60] bg-black/50 hover:bg-black/80 text-white p-3 rounded-full backdrop-blur-md transition-all border border-white/20 shadow-lg"
      title={isMuted ? "Activer le son" : "Couper le son"}
    >
      {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
    </button>
  );
};