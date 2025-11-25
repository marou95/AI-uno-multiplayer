import React, { useState, useEffect } from 'react';
import { useStore } from './store/useStore';
import { Lobby } from './screens/Lobby';
import { GameBoard } from './screens/GameBoard';
import { GameStatus } from '../shared/types';
import { AnimatePresence, motion } from 'framer-motion';
import { SoundToggle } from './components/SoundToggle';
import { playSound } from './utils/sounds';
import { Loader2, Gamepad2, ArrowRight } from 'lucide-react';

const App = () => {
  const { room, nickname, setNickname, createRoom, joinRoom, error, notifications, isConnecting, gameState } = useStore();
  const [code, setCode] = useState('');
  
  // Gestion des Notifications (Toujours visible)
  const renderNotifications = () => (
    <div className="fixed top-20 right-4 flex flex-col gap-2 z-[100] pointer-events-none">
      <AnimatePresence>
        {notifications.map((note, i) => (
           <motion.div 
             key={i}
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             exit={{ opacity: 0 }}
             className="bg-slate-800/90 backdrop-blur text-white px-6 py-3 rounded-xl shadow-2xl border border-white/10 font-semibold text-sm border-l-4 border-l-yellow-400 max-w-xs break-words"
           >
             {note}
           </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );

  // CAS 1: Pas de Room = Écran d'Accueil (HOME)
  if (!room) {
    return (
      <div className="min-h-screen w-full bg-slate-900 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
        <SoundToggle />
        {renderNotifications()}
        
        {/* Background */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
           <div className="absolute top-10 left-10 w-64 h-64 bg-red-600 rounded-full blur-3xl animate-pulse" />
           <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-600 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <motion.div 
           initial={{ opacity: 0, y: 20 }} 
           animate={{ opacity: 1, y: 0 }}
           className="bg-slate-800/80 backdrop-blur-lg p-8 rounded-3xl shadow-2xl w-full max-w-md space-y-8 border border-white/10 relative z-10"
        >
          <div className="text-center">
            <h1 className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-400 via-orange-500 to-red-600 italic tracking-tighter drop-shadow-sm transform hover:rotate-3 transition-transform duration-300 inline-block">UNO</h1>
            <p className="text-slate-400 mt-2 font-medium tracking-wide text-sm uppercase">Multiplayer AI Edition</p>
          </div>

          <div className="space-y-6">
             <div className="space-y-2">
               <label className="text-xs text-slate-400 font-bold uppercase ml-1 tracking-wider">YOUR NICKNAME</label>
               <input 
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Ex: Maverick"
                  disabled={isConnecting}
                  className="w-full bg-slate-900/50 text-white p-4 rounded-xl border border-slate-700 focus:border-yellow-500 focus:ring-1 focus:outline-none font-bold text-lg disabled:opacity-50 transition-all placeholder:text-slate-600"
               />
             </div>
             
             <div className="grid grid-cols-1 gap-4">
                <button 
                   onClick={() => { playSound('click'); createRoom(); }}
                   disabled={!nickname || isConnecting}
                   className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  {isConnecting ? <Loader2 className="animate-spin" /> : <Gamepad2 size={24} />}
                  <span>CREATE ROOM</span>
                </button>
                
                <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-slate-700"></div>
                    <span className="flex-shrink-0 mx-4 text-slate-500 text-[10px] font-black uppercase tracking-widest">OR JOIN GAME</span>
                    <div className="flex-grow border-t border-slate-700"></div>
                </div>

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
                      className="flex-1 h-full bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
                   >
                      <span>JOIN</span>
                      <ArrowRight size={20} />
                   </button>
                </div>
             </div>
          </div>
          
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-xl text-sm text-center font-semibold animate-pulse">
              ⚠️ {error}
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  // CAS 2: Room existe mais pas encore de GameState = CHARGEMENT
  if (!gameState) {
     return (
        <div className="min-h-screen w-full bg-slate-900 flex flex-col items-center justify-center text-white">
            <SoundToggle />
            {renderNotifications()}
            <Loader2 size={48} className="animate-spin text-yellow-500 mb-4" />
            <h2 className="text-xl font-bold animate-pulse">Connecting to Lobby...</h2>
        </div>
     );
  }

  // CAS 3: Affichage selon le statut de la partie
  // CORRECTIF : On vérifie explicitement si status === 'lobby' (en minuscule)
  const isInLobby = gameState.status === 'lobby' || gameState.status === GameStatus.LOBBY;

  return (
    <>
      <SoundToggle />
      {renderNotifications()}
      {isInLobby ? <Lobby /> : <GameBoard />}
    </>
  );
};

export default App;