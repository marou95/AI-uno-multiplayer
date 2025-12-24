import React, { useEffect, useState } from 'react';
import { useStore } from './store/useStore';
import { Lobby } from './screens/Lobby';
import { GameBoard } from './screens/GameBoard';
import { GameStatus } from '../shared/types';
import { AnimatePresence, motion } from 'framer-motion';
import { SoundToggle } from './components/SoundToggle';
import { playSound } from './utils/sounds';
import { Loader2, Gamepad2, ArrowRight } from 'lucide-react';

const App = () => {
  const { gameState, nickname, setNickname, createRoom, joinRoom, error, notifications, isConnecting } = useStore();
  const [code, setCode] = useState('');
  const [view, setView] = useState<'home' | 'lobby' | 'game'>('home');

  useEffect(() => {
    // ✅ NOUVEAU: Vérifier l'URL au démarrage
    const params = new URLSearchParams(window.location.search);
    const roomCodeFromUrl = params.get('room');
    
    if (roomCodeFromUrl && !gameState && nickname) {
      setCode(roomCodeFromUrl);
      // Auto-join après un court délai
      setTimeout(() => {
        joinRoom(roomCodeFromUrl);
      }, 500);
    }
  }, []);

  useEffect(() => {
    // Gestion automatique des vues selon l'état du jeu
    if (!gameState) {
      setView('home');
    } else if (gameState.status === GameStatus.LOBBY) {
      setView('lobby');
    } else if (gameState.status === GameStatus.PLAYING || gameState.status === GameStatus.FINISHED) {
      setView('game');
    }
  }, [gameState, gameState?.status]);

  // --- ÉCRAN D'ACCUEIL (HOME) ---
  if (view === 'home') {
    return (
      <div className="min-h-screen w-full bg-slate-900 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
        <SoundToggle />
        
        {/* Décorations d'arrière-plan */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
           <div className="absolute top-10 left-10 w-64 h-64 bg-red-600 rounded-full blur-3xl animate-pulse" />
           <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-600 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-yellow-400 rounded-full blur-3xl opacity-10" />
        </div>

        <motion.div 
           initial={{ opacity: 0, y: 20 }} 
           animate={{ opacity: 1, y: 0 }}
           className="bg-slate-800/80 backdrop-blur-lg p-8 rounded-3xl shadow-2xl w-full max-w-md space-y-8 border border-white/10 relative z-10"
        >
          {/* Titre */}
          <div className="text-center">
            <div className="inline-block transform hover:rotate-3 transition-transform duration-300">
               <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-red-500 to-yellow-500 tracking-tighter drop-shadow-sm">UNO</h1>
            </div>
            <p className="text-slate-400 mt-2 font-medium tracking-wide text-sm uppercase">Multiplayer</p>
          </div>

          {/* Formulaire */}
          <div className="space-y-6">
             {/* Input Pseudo */}
             <div className="space-y-2">
               <label className="text-xs text-slate-400 font-bold uppercase ml-1 tracking-wider">YOUR NICKNAME</label>
               <input 
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Type here"
                  disabled={isConnecting}
                  className="w-full bg-slate-900/50 text-white p-4 rounded-xl border border-slate-700 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none font-bold text-lg disabled:opacity-50 transition-all placeholder:text-slate-600"
               />
             </div>
             
             <div className="grid grid-cols-1 gap-4">
                {/* Bouton Créer */}
                <button 
                   onClick={() => { playSound('click'); createRoom(); }}
                   disabled={!nickname || isConnecting}
                   className="group relative overflow-hidden w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  {isConnecting ? <Loader2 className="animate-spin" /> : <Gamepad2 size={24} />}
                  <span>CREATE ROOM</span>
                </button>
                
                {/* Séparateur */}
                <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-slate-700"></div>
                    <span className="flex-shrink-0 mx-4 text-slate-500 text-[10px] font-black uppercase tracking-widest">OR JOIN GAME</span>
                    <div className="flex-grow border-t border-slate-700"></div>
                </div>

                {/* Zone Rejoindre */}
                <div className="flex gap-2 h-14">
                   <input 
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="CODE"
                      maxLength={5}
                      disabled={isConnecting}
                      className="w-28 h-full bg-slate-900/50 text-center font-mono font-black text-xl text-white rounded-xl border border-slate-700 focus:border-blue-500 focus:outline-none uppercase disabled:opacity-50 placeholder:text-slate-600 placeholder:text-base placeholder:font-sans"
                   />
                   <button 
                      onClick={() => { playSound('click'); joinRoom(code); }}
                      disabled={!nickname || code.length !== 5 || isConnecting}
                      className="flex-1 h-full bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                   >
                      <span>JOIN</span>
                      <ArrowRight size={20} />
                   </button>
                </div>
             </div>
          </div>
          
          {/* Message d'erreur */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-xl text-sm text-center font-semibold animate-pulse">
              ⚠️ {error}
            </div>
          )}

          <div className="text-center text-slate-600 text-xs font-medium">
            v2.0 • Powered by Colyseus & React
          </div>
        </motion.div>
        
        {/* Notifications Toast (Global) */}
        <div className="fixed top-20 right-4 flex flex-col gap-2 z-[100] pointer-events-none">
            {notifications.map((note, i) => (
                <div key={i} className="bg-slate-800 text-white px-4 py-2 rounded shadow-lg animate-in fade-in slide-in-from-right-10 border-l-4 border-yellow-400 max-w-xs break-words">
                {note}
                </div>
            ))}
        </div>
      </div>
    );
  }

  // --- VUES JEU & LOBBY ---
  return (
    <>
      <SoundToggle />
      
      {/* Notifications Toast (En Jeu) */}
      <div className="fixed top-20 right-4 flex flex-col gap-2 z-[100] pointer-events-none">
        <AnimatePresence>
          {notifications.map((note, i) => (
             <motion.div 
               key={i}
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0 }}
               className="bg-slate-800/90 backdrop-blur text-white px-6 py-3 rounded-xl shadow-2xl border border-white/10 font-semibold text-sm border-l-4 border-l-yellow-400"
             >
               {note}
             </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {view === 'lobby' && <Lobby />}
      {view === 'game' && <GameBoard />}
    </>
  );
};

export default App;