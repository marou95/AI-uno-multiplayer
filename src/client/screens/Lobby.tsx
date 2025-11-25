import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { playSound } from '../utils/sounds';
import { Loader2, ArrowRight, Gamepad2 } from 'lucide-react';

export const Lobby = () => {
  const { nickname, setNickname, createRoom, joinRoom, error, isConnecting } = useStore();
  const [joinCode, setJoinCode] = useState('');

  return (
    <div className="min-h-screen w-full bg-slate-900 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
         <div className="absolute top-10 left-10 w-64 h-64 bg-red-600 rounded-full blur-3xl animate-pulse" />
         <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-600 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-yellow-400 rounded-full blur-3xl opacity-10" />
      </div>

      {/* Main Card */}
      <div className="max-w-md w-full bg-slate-800/80 backdrop-blur-lg p-8 rounded-3xl shadow-2xl border border-white/10 relative z-10">
        
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-red-600 rounded-2xl flex items-center justify-center shadow-lg mb-4 -rotate-6 hover:rotate-0 transition-transform duration-300">
                <span className="text-4xl font-black text-white italic tracking-tighter shadow-black drop-shadow-md">UNO</span>
            </div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 text-center">
                UNO Multiplayer AI
            </h1>
        </div>

        {/* Error Message */}
        {error && (
           <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-xl mb-6 text-sm text-center font-medium animate-pulse">
             ⚠️ {error}
           </div>
        )}

        {/* Inputs */}
        <div className="space-y-6">
            <div>
                <label className="block text-slate-400 text-sm font-semibold mb-2 ml-1">TON PSEUDO</label>
                <input 
                  type="text" 
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Ex: Player1"
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all font-bold text-lg"
                />
            </div>

            <div className="grid grid-cols-1 gap-4">
                {/* CREATE BUTTON */}
                <button 
                  onClick={() => { playSound('click'); createRoom(); }}
                  disabled={isConnecting || !nickname.trim()}
                  className="group relative overflow-hidden w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                   {isConnecting ? <Loader2 className="animate-spin" /> : <Gamepad2 size={24} />}
                   <span>CRÉER UNE PARTIE</span>
                </button>
                
                {/* Separator */}
                <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-slate-700"></div>
                    <span className="flex-shrink-0 mx-4 text-slate-500 text-xs font-bold uppercase">OU REJOINDRE AVEC UN CODE</span>
                    <div className="flex-grow border-t border-slate-700"></div>
                </div>

                {/* JOIN SECTION */}
                <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 5))}
                      placeholder="CODE"
                      className="w-28 bg-slate-900/80 border border-slate-700 rounded-xl px-2 py-3 text-center text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold text-lg uppercase tracking-widest"
                    />
                    <button 
                      onClick={() => { playSound('click'); joinRoom(joinCode); }}
                      disabled={isConnecting || !nickname.trim() || joinCode.length !== 5}
                      className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span>REJOINDRE</span>
                        <ArrowRight size={20} />
                    </button>
                </div>
            </div>
        </div>

        <div className="mt-8 text-center text-slate-600 text-xs font-medium">
            v1.0.0 • Powered by Colyseus & AI
        </div>

      </div>
    </div>
  );
};