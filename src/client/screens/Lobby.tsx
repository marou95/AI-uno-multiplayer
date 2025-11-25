import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Copy, User, CheckCircle2, Play, LogOut, Loader2 } from 'lucide-react';
import { Player } from '../../server/schema/UNOState';
import { playSound } from '../utils/sounds';

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
    playSound('click');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen w-full bg-slate-900 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
         <div className="absolute top-10 left-10 w-64 h-64 bg-red-600 rounded-full blur-3xl animate-pulse" />
         <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-600 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="max-w-2xl w-full bg-slate-800/80 backdrop-blur-lg p-8 rounded-3xl shadow-2xl border border-white/10 relative z-10 animate-in fade-in zoom-in duration-300">
        
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
            <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-orange-500 mb-2 drop-shadow-sm tracking-wider">
                LOBBY
            </h1>
            
            {/* Room Code Badge */}
            <div 
                onClick={copyCode}
                className="group flex items-center gap-3 bg-black/40 hover:bg-black/60 px-6 py-3 rounded-xl cursor-pointer border border-white/10 transition-all hover:scale-105 active:scale-95"
            >
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">ROOM CODE</span>
                <span className="text-3xl font-mono font-black text-white tracking-widest">{gameState.roomCode}</span>
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 group-hover:bg-white/20 transition-colors">
                    {copied ? <CheckCircle2 size={16} className="text-green-400" /> : <Copy size={16} />}
                </div>
            </div>
        </div>

        {/* Players Grid */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">PLAYERS ({players.length}/6)</h3>
            {isHost && <span className="text-yellow-500 text-xs font-bold bg-yellow-500/10 px-2 py-1 rounded">YOU ARE HOST</span>}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {players.map((p) => (
              <div key={p.sessionId} className="flex items-center justify-between bg-slate-700/50 p-3 rounded-xl border border-white/5 transition-all hover:bg-slate-700/80">
                <div className="flex items-center gap-3">
                   <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-inner ${p.isReady ? 'bg-green-500 text-white' : 'bg-slate-600 text-slate-300'}`}>
                      {p.name.substring(0,1).toUpperCase()}
                   </div>
                   <div className="flex flex-col">
                       <div className="text-white font-bold flex items-center gap-2">
                           {p.name} 
                           {p.sessionId === playerId && <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded text-white/80">YOU</span>}
                       </div>
                       <div className="text-xs text-slate-400 font-medium">
                           {players[0].sessionId === p.sessionId ? "👑 Host" : "Player"}
                       </div>
                   </div>
                </div>
                
                {/* Ready Status Badge */}
                {p.isReady ? (
                  <div className="flex items-center gap-1.5 bg-green-500/20 text-green-400 px-3 py-1.5 rounded-lg text-xs font-bold border border-green-500/30">
                    <CheckCircle2 size={14} /> READY
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 bg-slate-800/50 text-slate-500 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-700">
                    <Loader2 size={14} className="animate-spin" /> WAITING
                  </div>
                )}
              </div>
            ))}
            
            {/* Empty Slots (Visual filler) */}
            {Array.from({ length: Math.max(0, 6 - players.length) }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 bg-slate-800/30 p-3 rounded-xl border border-white/5 border-dashed opacity-50">
                    <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center text-slate-600">
                        <User size={20} />
                    </div>
                    <span className="text-slate-600 text-sm font-bold italic">Empty Slot</span>
                </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col gap-3 pt-6 border-t border-white/10">
           {/* READY BUTTON */}
           <button 
              onClick={() => { toggleReady(); playSound('click'); }}
              className={`w-full py-4 rounded-xl font-black text-xl tracking-wide transition-all transform hover:scale-[1.01] active:scale-[0.99] shadow-lg flex items-center justify-center gap-3 ${
                 me?.isReady 
                 ? "bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600"
                 : "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-400 hover:to-emerald-500 shadow-green-900/30"
              }`}
           >
              {me?.isReady ? "CANCEL READY" : "READY UP !"}
           </button>

           {/* START BUTTON (HOST ONLY) */}
           {isHost && (
             <button 
                disabled={!canStart}
                onClick={() => { startGame(); playSound('play'); }}
                className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-black py-4 rounded-xl font-black text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale hover:brightness-110 transition-all shadow-lg shadow-orange-900/20"
             >
                <Play size={24} fill="currentColor" /> START GAME
             </button>
           )}

           {/* LEAVE BUTTON */}
           <button 
              onClick={() => { leaveRoom(); playSound('click'); }}
              className="mt-2 w-full text-slate-400 text-sm py-2 hover:text-red-400 flex items-center justify-center gap-2 transition-colors font-medium"
           >
              <LogOut size={16} /> Leave Room
           </button>
        </div>

      </div>
    </div>
  );
};