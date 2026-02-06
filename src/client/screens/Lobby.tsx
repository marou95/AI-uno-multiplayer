import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Copy, User, CheckCircle2, Play, LogOut, Loader2 } from 'lucide-react';
import { Player } from '../schema/UNOState';
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
    // CONTENEUR PRINCIPAL : h-[100dvh] pour mobile, p-4 pour l'effet "dézoom" (marges autour)
    <div className="h-[100dvh] w-full bg-slate-900 text-white flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden font-sans">

      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-10 left-10 w-64 h-64 bg-red-600 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-600 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* CARTE LOBBY : max-h-full pour ne jamais dépasser l'écran, flex-col pour structurer l'intérieur */}
      <div className="w-full max-w-2xl max-h-full bg-slate-800/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/10 relative z-10 animate-in fade-in zoom-in duration-300 flex flex-col overflow-hidden">

        {/* HEADER (Fixe) */}
        <div className="shrink-0 bg-slate-800/90 backdrop-blur-md pt-6 pb-4 px-4 md:p-8 border-b border-white/10 z-20">
          <div className="flex flex-col items-center">
            <h1 className="text-3xl md:text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-orange-500 mb-4 drop-shadow-sm tracking-wider">
              LOBBY
            </h1>

            {/* Room Code Badge */}
            <div
              onClick={copyCode}
              className="group flex items-center gap-3 bg-black/40 hover:bg-black/60 px-5 py-2.5 rounded-xl cursor-pointer border border-white/10 transition-all hover:scale-105 active:scale-95"
            >
              <span className="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-wider">ROOM CODE</span>
              <span className="text-2xl md:text-3xl font-mono font-black text-white tracking-widest">{gameState.roomCode}</span>
              <div className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-full bg-white/10 group-hover:bg-white/20 transition-colors">
                {copied ? <CheckCircle2 size={14} className="text-green-400" /> : <Copy size={14} />}
              </div>
            </div>
          </div>
        </div>

        {/* CONTENU DÉFILABLE (Flexible) 
            flex-grow + min-h-0 est l'astuce pour scroller proprement dans une flexbox parente fixe
        */}
        <div className="flex-grow overflow-y-auto min-h-0 px-4 md:px-8 py-4 space-y-4">
          
          <div className="flex items-center justify-between px-1">
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">PLAYERS ({players.length}/6)</h3>
            {isHost && <span className="text-yellow-500 text-[10px] font-bold bg-yellow-500/10 px-2 py-1 rounded border border-yellow-500/20">YOU ARE HOST</span>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {players.map((p) => (
              <div key={p.sessionId} className="flex items-center justify-between bg-slate-700/50 p-2.5 md:p-3 rounded-xl border border-white/5 transition-all hover:bg-slate-700/80">
                
                {/* PARTIE GAUCHE : Avatar + Nom */}
                <div className="flex items-center gap-3 min-w-0 overflow-hidden">
                  <div className={`shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-inner ${p.isReady ? 'bg-green-500 text-white' : 'bg-slate-600 text-slate-300'}`}>
                    {p.name.substring(0, 1).toUpperCase()}
                  </div>
                  
                  <div className="flex flex-col min-w-0">
                    <div className="text-white font-bold flex items-center gap-2">
                      <span className="truncate text-sm md:text-base" title={p.name}>{p.name}</span>
                      {p.sessionId === playerId && <span className="shrink-0 text-[10px] bg-white/20 px-1.5 py-0.5 rounded text-white/80">YOU</span>}
                    </div>
                    <div className="text-[10px] md:text-xs text-slate-400 font-medium truncate">
                      {players[0].sessionId === p.sessionId ? "👑 Host" : (p.sessionId.startsWith('bot_') ? "🤖 Bot" : "Player")}
                    </div>
                  </div>
                </div>

                {/* PARTIE DROITE : Badge + Bouton Delete */}
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {p.isReady ? (
                    <div className="flex items-center gap-1.5 bg-green-500/20 text-green-400 px-2 py-1 md:px-3 md:py-1.5 rounded-lg text-[10px] md:text-xs font-bold border border-green-500/30 whitespace-nowrap">
                      <CheckCircle2 size={12} /> <span className="hidden sm:inline">READY</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 bg-slate-800/50 text-slate-500 px-2 py-1 md:px-3 md:py-1.5 rounded-lg text-[10px] md:text-xs font-bold border border-slate-700 whitespace-nowrap">
                      <Loader2 size={12} className="animate-spin" /> <span className="hidden sm:inline">WAITING</span>
                    </div>
                  )}

                  {isHost && p.sessionId.startsWith('bot_') && (
                    <button
                      onClick={() => useStore.getState().removeBot(p.sessionId)}
                      className="p-1.5 bg-red-500/10 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors border border-red-500/20"
                      title="Remove Bot"
                    >
                      <LogOut size={14} />
                    </button>
                  )}
                </div>

              </div>
            ))}

            {/* Empty Slots */}
            {Array.from({ length: Math.max(0, 6 - players.length) }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 bg-slate-800/30 p-2.5 md:p-3 rounded-xl border border-white/5 border-dashed opacity-50 min-h-[60px]">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-800/50 flex items-center justify-center text-slate-600">
                  <User size={18} />
                </div>

                <span className="text-slate-600 text-xs md:text-sm font-bold italic">Empty Slot</span>
                {isHost && (
                  <button
                    onClick={() => useStore.getState().addBot()}
                    className="ml-auto text-[10px] md:text-xs bg-slate-700 hover:bg-slate-600 text-white px-2 py-1.5 rounded transition-colors"
                  >
                    + BOT
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* FOOTER (Fixe) */}
        <div className="shrink-0 bg-slate-800/90 backdrop-blur-md pt-4 pb-6 px-4 md:p-8 border-t border-white/10 z-20">
          <div className="flex gap-3 mb-3">
            <button
              onClick={() => { toggleReady(); playSound('click'); }}
              className={`flex-1 py-3 md:py-4 rounded-xl font-black text-sm md:text-base tracking-wide transition-all transform hover:scale-[1.01] active:scale-[0.99] shadow-lg flex items-center justify-center gap-2 ${me?.isReady
                ? "bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600"
                : "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-400 hover:to-emerald-500 shadow-green-900/30"
                }`}
            >
              {me?.isReady ? "CANCEL READY" : "READY UP !"}
            </button>

            {isHost && (
              <button
                disabled={!canStart}
                onClick={() => { startGame(); playSound('play'); }}
                className="flex-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-black py-3 md:py-4 rounded-xl font-black text-sm md:text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale hover:brightness-110 transition-all shadow-lg shadow-orange-900/20"
              >
                <Play size={18} fill="currentColor" /> START
              </button>
            )}
            {!isHost && <div className="flex-1 hidden md:block"></div>}
          </div>

          <button
            onClick={() => { leaveRoom(); playSound('click'); }}
            className="w-full text-slate-400 text-xs md:text-sm py-2 hover:text-red-400 flex items-center justify-center gap-2 transition-colors font-medium"
          >
            <LogOut size={14} /> Leave Room
          </button>
        </div>

      </div>
    </div>
  );
};