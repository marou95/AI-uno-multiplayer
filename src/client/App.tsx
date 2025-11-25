import React from 'react';
import { Lobby } from './screens/Lobby';
import { GameBoard } from './screens/GameBoard';
import { useStore } from './store/useStore';
import { SoundToggle } from './components/SoundToggle';
import { AnimatePresence, motion } from 'framer-motion';

const App = () => {
  const { room, gameState, error, notifications } = useStore();

  // Notifications overlay (toujours visible)
  const renderNotifications = () => (
    <div className="fixed top-20 right-4 flex flex-col gap-2 z-[100] pointer-events-none">
      <AnimatePresence>
        {notifications.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="bg-slate-800/90 backdrop-blur text-white px-6 py-3 rounded-xl shadow-2xl border border-white/10 font-semibold text-sm border-l-4 border-l-yellow-400 max-w-xs break-words pointer-events-auto"
          >
            {msg}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );

  // CAS 1 : Pas de room = Écran de création/join (Lobby = formulaire)
  if (!room) {
    return (
      <>
        <SoundToggle />
        <Lobby />
        {renderNotifications()}
      </>
    );
  }

  // CAS 2 : Room existe, on affiche selon le status
  return (
    <>
      <SoundToggle />
      {renderNotifications()}

      {gameState?.status === 'PLAYING' || gameState?.status === 'FINISHED' ? (
        <GameBoard />
      ) : (
        // Lobby d'attente avec code et liste de joueurs
        <div className="w-full h-screen bg-green-800 flex flex-col items-center justify-center text-white p-4">
          <div className="text-center">
            <h1 className="text-4xl font-black mb-4 animate-bounce">LOBBY</h1>
            <div className="bg-black/30 p-8 rounded-xl backdrop-blur-sm">
              <p className="mb-4 text-xl">
                Code: <span className="font-mono bg-white text-black px-2 py-1 rounded select-all">{gameState?.roomCode}</span>
              </p>
              <p className="mb-8 opacity-75">Waiting for players...</p>

              <button
                onClick={() => useStore.getState().toggleReady()}
                className="bg-yellow-400 text-black font-bold px-8 py-3 rounded-full text-xl hover:scale-105 transition"
              >
                {gameState?.players.get(room.sessionId)?.isReady ? "READY !" : "CLICK TO BE READY"}
              </button>

              <div className="mt-8 flex gap-4 justify-center">
                {Array.from(gameState?.players.values() || []).map((p: any) => (
                  <div
                    key={p.sessionId}
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
                      p.isReady ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  >
                    {p.name[0]}
                  </div>
                ))}
              </div>

              <button
                onClick={() => useStore.getState().startGame()}
                className="mt-8 bg-white/10 hover:bg-white/20 text-white font-bold px-6 py-2 rounded border border-white/50 block mx-auto"
              >
                Force Start (Debug)
              </button>

              <button
                onClick={() => useStore.getState().leaveRoom()}
                className="mt-4 text-red-300 underline text-sm"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default App;