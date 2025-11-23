import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Copy, User, CheckCircle2, Play, LogOut } from 'lucide-react';
import { Player } from '../../server/schema/UNOState';

export const Lobby = () => {
  const { gameState, playerId, toggleReady, startGame, leaveRoom } = useStore();
  const [copied, setCopied] = useState(false);

  if (!gameState) return null;

  const players = Array.from(gameState.players.values()) as Player[];
  const me = gameState.players.get(playerId || "");
  const isHost = players.length > 0 && players[0].id === playerId;
  const canStart = isHost && players.length >= 2 && players.every(p => p.isReady);

  const copyCode = () => {
    navigator.clipboard.writeText(gameState.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center p-4">
      <div className="max-w-md w-full bg-slate-800 rounded-2xl shadow-2xl p-6 space-y-8 mt-10">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-black text-yellow-400 tracking-wider drop-shadow-lg">LOBBY</h1>
          <div className="flex items-center justify-center gap-2 bg-slate-700 p-3 rounded-lg cursor-pointer hover:bg-slate-600 transition" onClick={copyCode}>
            <span className="text-gray-400 text-sm">ROOM CODE:</span>
            <span className="text-2xl font-mono font-bold text-white tracking-widest">{gameState.roomCode}</span>
            <Copy size={16} className={copied ? "text-green-400" : "text-white"} />
          </div>
        </div>

        {/* Players List */}
        <div className="space-y-3">
          <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider">Players ({players.length}/6)</h3>
          <div className="space-y-2">
            {players.map((p) => (
              <div key={p.sessionId} className="flex items-center justify-between bg-slate-700/50 p-3 rounded-xl border border-slate-600">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-white">
                      {p.name.substring(0,1)}
                   </div>
                   <div>
                       <div className="text-white font-bold">{p.name} {p.sessionId === playerId && "(You)"}</div>
                       <div className="text-xs text-slate-400">{isHost && players[0].sessionId === p.sessionId ? "Host" : "Player"}</div>
                   </div>
                </div>
                {p.isReady ? (
                  <CheckCircle2 className="text-green-400" />
                ) : (
                  <span className="text-xs text-slate-500 font-bold px-2 py-1 rounded bg-slate-800">WAITING</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-3 pt-4 border-t border-slate-700">
           <button 
              onClick={toggleReady}
              className={`w-full py-4 rounded-xl font-black text-xl tracking-wide transition-all ${
                 me?.isReady 
                 ? "bg-slate-600 text-slate-300 hover:bg-slate-500"
                 : "bg-green-500 text-white shadow-lg shadow-green-900/50 hover:bg-green-400 hover:scale-[1.02]"
              }`}
           >
              {me?.isReady ? "NOT READY" : "READY UP!"}
           </button>

           {isHost && (
             <button 
                disabled={!canStart}
                onClick={startGame}
                className="w-full bg-yellow-400 text-yellow-900 py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-yellow-300 transition"
             >
                <Play size={20} fill="currentColor" /> START GAME
             </button>
           )}

           <button onClick={leaveRoom} className="w-full text-red-400 text-sm py-2 hover:text-red-300 flex items-center justify-center gap-1">
              <LogOut size={14} /> Leave Room
           </button>
        </div>

      </div>
    </div>
  );
};