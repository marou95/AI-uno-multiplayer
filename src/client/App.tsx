import React from 'react';
import { Lobby } from './screens/Lobby';
import { GameBoard } from './screens/GameBoard';
import { useStore } from './store/useStore';
import { SoundToggle } from './components/SoundToggle';

const App = () => {
  const { room, gameState, notifications } = useStore();

  if (!room) {
    return (
      <>
        <SoundToggle />
        <Lobby />
        <div className="fixed top-20 right-4 flex flex-col gap-2 z-[100] pointer-events-none">
          {notifications.map((msg, i) => (
            <div key={i} className="bg-slate-800 text-white px-4 py-2 rounded shadow-lg animate-in fade-in slide-in-from-right-10 border-l-4 border-yellow-400">
              {msg}
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <SoundToggle />
      
      <div className="fixed top-20 right-4 flex flex-col gap-2 z-[100] pointer-events-none">
        {notifications.map((msg, i) => (
          <div key={i} className="bg-slate-800 text-white px-4 py-2 rounded shadow-lg animate-in fade-in slide-in-from-right-10 border-l-4 border-yellow-400">
            {msg}
          </div>
        ))}
      </div>

      {gameState?.status === 'PLAYING' || gameState?.status === 'FINISHED' ? (
        <GameBoard />
      ) : (
        <div className="w-full h-screen bg-green-800 flex flex-col items-center justify-center text-white p-4">
             <div className="text-center">
                <h1 className="text-4xl font-black mb-4 animate-bounce">LOBBY</h1>
                <div className="bg-black/30 p-8 rounded-xl backdrop-blur-sm">
                    
                    {/* CORRECTION MAJEURE ICI : Affichage du Code à 5 lettres */}
                    <p className="mb-4 text-xl">
                        Room Code: <span className="font-mono bg-white text-black px-2 py-1 rounded select-all tracking-widest">
                            {gameState?.roomCode || "..."}
                        </span>
                    </p>

                    <p className="mb-8 opacity-75">Waiting for players...</p>
                    
                    <button onClick={() => useStore.getState().toggleReady()} className="bg-yellow-400 text-black font-bold px-8 py-3 rounded-full text-xl hover:scale-105 transition">
                        {gameState?.players.get(room.sessionId)?.isReady ? "READY !" : "CLICK TO BE READY"}
                    </button>
                    
                    <div className="mt-8 flex gap-4 justify-center">
                        {Array.from(gameState?.players.values() || []).map((p: any) => (
                            <div key={p.sessionId} className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${p.isReady ? 'bg-green-500' : 'bg-red-500'}`}>
                                {p.name[0]}
                            </div>
                        ))}
                    </div>

                     <button onClick={() => useStore.getState().startGame()} className="mt-8 bg-white/10 hover:bg-white/20 text-white font-bold px-6 py-2 rounded border border-white/50 block mx-auto">
                        Force Start (Debug)
                    </button>
                    <button onClick={() => useStore.getState().leaveRoom()} className="mt-4 text-red-300 underline text-sm">
                        Leave Room
                    </button>
                </div>
             </div>
        </div>
      )}
    </>
  );
};

export default App;