import React, { useEffect, useState } from 'react';
import { useStore } from './store/useStore';
import { Lobby } from './screens/Lobby';
import { GameBoard } from './screens/GameBoard';
import { GameStatus } from '../shared/types';
import { AnimatePresence, motion } from 'framer-motion';

const App = () => {
  const { gameState, nickname, setNickname, createRoom, joinRoom, error, notifications, isConnecting } = useStore();
  const [code, setCode] = useState('');
  const [view, setView] = useState<'home' | 'lobby' | 'game'>('home');

  useEffect(() => {
    console.log('🔄 App state changed:', { 
      hasGameState: !!gameState, 
      status: gameState?.status,
      currentView: view 
    });

    if (!gameState) {
      setView('home');
    } else if (gameState.status === GameStatus.LOBBY) {
      console.log('➡️ Switching to lobby view');
      setView('lobby');
    } else if (gameState.status === GameStatus.PLAYING || gameState.status === GameStatus.FINISHED) {
      console.log('➡️ Switching to game view');
      setView('game');
    }
  }, [gameState?.status, gameState]);

  // Welcome Screen
  if (view === 'home') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <motion.div 
           initial={{ opacity: 0, y: 20 }} 
           animate={{ opacity: 1, y: 0 }}
           className="bg-slate-800 p-8 rounded-3xl shadow-2xl w-full max-w-md space-y-6 border border-slate-700"
        >
          <div className="text-center">
            <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-500 italic transform -skew-x-12">UNO</h1>
            <p className="text-slate-400 mt-2 font-medium">Real-time Multiplayer</p>
          </div>

          <div className="space-y-4">
             <div>
               <label className="text-xs text-slate-500 font-bold uppercase ml-1">Nickname</label>
               <input 
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && nickname && !isConnecting) {
                      createRoom();
                    }
                  }}
                  placeholder="Enter your name"
                  disabled={isConnecting}
                  className="w-full bg-slate-900 text-white p-4 rounded-xl border border-slate-600 focus:border-yellow-400 focus:outline-none font-bold text-lg disabled:opacity-50"
               />
             </div>
             
             <div className="grid grid-cols-2 gap-4">
                <button 
                   onClick={createRoom}
                   disabled={!nickname || isConnecting}
                   className="bg-yellow-400 text-yellow-900 font-bold py-4 rounded-xl hover:bg-yellow-300 transition disabled:opacity-50 disabled:cursor-not-allowed relative"
                >
                  {isConnecting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-yellow-900 border-t-transparent rounded-full animate-spin"></span>
                      Creating...
                    </span>
                  ) : (
                    'Create Room'
                  )}
                </button>
                <div className="relative">
                   <input 
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && nickname && code.length === 5 && !isConnecting) {
                          joinRoom(code);
                        }
                      }}
                      placeholder="CODE"
                      maxLength={5}
                      disabled={isConnecting}
                      className="w-full h-full bg-slate-900 text-center font-mono font-bold text-white rounded-xl border border-slate-600 focus:border-blue-500 focus:outline-none uppercase disabled:opacity-50"
                   />
                </div>
             </div>
             <button 
                onClick={() => joinRoom(code)}
                disabled={!nickname || code.length !== 5 || isConnecting}
                className="w-full bg-blue-500 text-white font-bold py-3 rounded-xl hover:bg-blue-400 transition disabled:opacity-50 disabled:cursor-not-allowed relative"
             >
                {isConnecting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Joining...
                  </span>
                ) : (
                  'Join Room'
                )}
             </button>
          </div>
          
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-500/10 text-red-400 p-3 rounded-lg text-sm text-center font-semibold border border-red-500/20"
            >
              {error}
            </motion.div>
          )}

          {/* Debug info en dev */}
          {import.meta.env.DEV && (
            <div className="text-xs text-slate-600 text-center font-mono">
              State: {gameState?.status || 'none'} | View: {view}
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence mode="wait">
        {view === 'lobby' && (
          <motion.div
            key="lobby"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Lobby />
          </motion.div>
        )}
        {view === 'game' && (
          <motion.div
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <GameBoard />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Toast Notifications */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {notifications.map((note, i) => (
             <motion.div 
               key={`${i}-${note}`}
               initial={{ opacity: 0, y: -20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.8 }}
               className="bg-slate-800 text-white px-6 py-3 rounded-full shadow-xl border border-slate-600 font-semibold text-sm"
             >
               {note}
             </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
};

export default App;