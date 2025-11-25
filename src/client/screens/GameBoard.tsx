import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Card } from '../components/Card';
import { AnimatePresence, motion } from 'framer-motion';
import { CardColor } from '../../shared/types';
import { playSound } from '../utils/sounds';
import confetti from 'canvas-confetti';
import { Player } from '../../server/schema/UNOState';
import clsx from 'clsx';
import { Siren, RotateCcw, LogOut } from 'lucide-react';

const bgColors: Record<string, string> = {
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  yellow: 'bg-yellow-400',
  black: 'bg-slate-800'
};

export const GameBoard = () => {
  const { gameState, playerId, playCard, drawCard, sayUno, catchUno, leaveRoom, requestRestart } = useStore();
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);

  if (!gameState || !playerId) return null;

  const me = gameState.players.get(playerId);
  const players = Array.from(gameState.players.values()) as Player[];
  const myIndex = players.findIndex(p => p.sessionId === playerId);
  
  const rotatedPlayers = [...players.slice(myIndex), ...players.slice(0, myIndex)];

  const isMyTurn = gameState.currentTurnPlayerId === playerId;
  const topCard = gameState.discardPile[gameState.discardPile.length - 1];

  const pendingUnoPlayerId = gameState.pendingUnoPenaltyPlayerId;
  const showCatchButton = pendingUnoPlayerId && pendingUnoPlayerId !== playerId;
  const culpritName = pendingUnoPlayerId ? gameState.players.get(pendingUnoPlayerId)?.name : '';

  useEffect(() => {
    if (gameState.winner) {
      playSound('win');
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    }
  }, [gameState.winner]);

  const onCardClick = (card: any) => {
    if (!isMyTurn) return;
    
    const matchesColor = card.color === gameState.currentColor || card.color === 'black';
    const matchesType = card.type === gameState.currentType;
    const matchesValue = card.type === 'number' && card.value === gameState.currentValue;
    const isWild = card.color === 'black';

    if (matchesColor || matchesType || matchesValue || isWild) {
      if (isWild) {
        setShowColorPicker(card.id);
      } else {
        playCard(card.id);
        playSound('play');
      }
    } else {
      playSound('error');
    }
  };

  const handleColorSelect = (color: CardColor) => {
    if (showColorPicker) {
      playCard(showColorPicker, color);
      setShowColorPicker(null);
      playSound('play');
    }
  };

  if (gameState.winner) {
    const isWinner = gameState.winner === me?.name;
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center text-white p-4">
        <div className="max-w-md w-full bg-slate-800 p-8 rounded-3xl border border-white/10 shadow-2xl flex flex-col items-center animate-in fade-in zoom-in duration-300">
            {isWinner ? (
                <>
                    <div className="text-8xl mb-6 animate-bounce">👑</div>
                    <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600 mb-2">
                        VICTORY!
                    </h1>
                    <p className="text-xl text-yellow-100/80 font-medium mb-8">You are the UNO Champion!</p>
                </>
            ) : (
                <>
                    <div className="text-8xl mb-6 grayscale opacity-50">💀</div>
                    <h1 className="text-5xl font-black text-slate-400 mb-2">
                        DEFEAT
                    </h1>
                    <p className="text-xl text-slate-400/80 mb-8">
                        <span className="text-yellow-400 font-bold">{gameState.winner}</span> won the game.
                    </p>
                </>
            )}
            <div className="grid grid-cols-2 gap-4 w-full">
                <button onClick={() => { requestRestart(); playSound('click'); }} className="bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl shadow-lg transition-transform hover:scale-[1.02] flex flex-col items-center justify-center gap-1">
                    <RotateCcw size={24} /> <span>PLAY AGAIN</span>
                </button>
                <button onClick={() => { leaveRoom(); playSound('click'); }} className="bg-slate-700 hover:bg-red-500/80 text-white font-bold py-4 rounded-xl shadow-lg transition-transform hover:scale-[1.02] flex flex-col items-center justify-center gap-1">
                    <LogOut size={24} /> <span>LEAVE</span>
                </button>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-green-800 overflow-hidden relative flex flex-col">
      <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
         <motion.div animate={{ rotate: gameState.direction === 1 ? 0 : 180 }} transition={{ duration: 0.5 }}>
            <div className="w-96 h-96 border-[20px] border-white rounded-full border-dashed animate-spin-slow" style={{ animationDuration: '20s' }} />
         </motion.div>
      </div>

      <AnimatePresence>
        {showCatchButton && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => { catchUno(); playSound('uno'); }}
            className="absolute top-24 left-1/2 -translate-x-1/2 z-40 bg-gradient-to-r from-red-600 to-red-500 text-white font-black text-xl md:text-2xl px-8 py-4 rounded-full border-4 border-white shadow-[0_0_30px_rgba(220,38,38,0.6)] animate-pulse flex items-center gap-3 hover:scale-110 transition active:scale-95"
          >
            <Siren size={32} className="animate-spin" />
            CATCH UNO! ({culpritName})
          </motion.button>
        )}
      </AnimatePresence>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-6 md:gap-12 z-10">
        <div className="relative cursor-pointer group" onClick={() => { if(isMyTurn) { drawCard(); playSound('draw'); } }} onMouseEnter={() => playSound('hover')}>
          <div className="w-24 h-36 md:w-32 md:h-48 bg-slate-900 rounded-xl border-4 border-white shadow-xl flex items-center justify-center group-hover:scale-105 transition-transform">
            <span className="text-red-500 font-bold text-3xl italic">UNO</span>
          </div>
          {gameState.drawStack > 0 && (
            <div className="absolute -top-4 -right-4 bg-red-600 text-white font-bold w-12 h-12 rounded-full flex items-center justify-center border-4 border-white animate-bounce shadow-lg z-20">+{gameState.drawStack}</div>
          )}
        </div>
        <div className="relative w-24 h-36 md:w-32 md:h-48">
          {topCard && (
             <motion.div key={topCard.id} initial={{ scale: 1.5, opacity: 0, rotate: Math.random() * 20 - 10 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} className="absolute inset-0">
               <Card card={topCard} playable={false} />
             </motion.div>
          )}
          <div className={clsx("absolute -bottom-8 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full border-4 border-white shadow-lg transition-colors duration-300", bgColors[gameState.currentColor] || 'bg-slate-800')} />
        </div>
      </div>

      <AnimatePresence>
        {showColorPicker && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="bg-slate-800 p-8 rounded-3xl shadow-2xl border border-white/10 flex flex-col items-center">
              <h2 className="text-white font-bold text-2xl mb-6">CHOOSE COLOR</h2>
              <div className="grid grid-cols-2 gap-4">
                {['red', 'blue', 'green', 'yellow'].map((c: string) => (
                  <button key={c} onClick={() => handleColorSelect(c as CardColor)} className={clsx("w-24 h-24 rounded-2xl hover:scale-105 active:scale-95 transition shadow-lg border-4 border-transparent hover:border-white ring-2 ring-black/20", bgColors[c])} />
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {rotatedPlayers.map((player, index) => {
        if (index === 0) return null; 
        return (
          <div key={player.sessionId} className="absolute flex flex-col items-center gap-2 transition-all duration-500" style={getOpponentStyle(index, rotatedPlayers.length)}>
            <div className={`relative w-16 h-16 rounded-full border-4 ${gameState.currentTurnPlayerId === player.sessionId ? 'border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.5)] scale-110' : 'border-slate-700'} bg-slate-800 flex items-center justify-center transition-all duration-300`}>
              <span className="text-white font-bold text-xl">{player.name[0].toUpperCase()}</span>
              <div className="absolute -bottom-3 bg-slate-800 text-xs px-2 py-0.5 rounded-full text-white border border-slate-600 whitespace-nowrap z-20 shadow-md">{player.cardsRemaining} cards</div>
              {player.hasSaidUno && <div className="absolute -top-5 bg-red-600 text-white font-black text-[10px] px-2 py-1 rounded-full animate-bounce z-20 shadow-sm border border-white">UNO!</div>}
            </div>
            <div className="flex -space-x-3 mt-2">
              {Array.from({ length: Math.min(player.cardsRemaining, 5) }).map((_, i) => <div key={i} className="w-6 h-9 bg-slate-800 rounded border border-white/20 shadow-sm" />)}
              {player.cardsRemaining > 5 && <div className="text-white text-xs self-center pl-1 font-bold">+</div>}
            </div>
          </div>
        );
      })}

      <div className="mt-auto w-full pb-6 px-4">
        <div className="relative max-w-5xl mx-auto h-40 md:h-56 flex items-end justify-center perspective-1000">
          {me && me.hand.length <= 2 && !me.hasSaidUno && (
             <button onClick={() => { sayUno(); playSound('uno'); }} className="absolute -top-24 right-4 md:right-20 bg-gradient-to-br from-yellow-400 to-yellow-600 text-red-900 font-black text-2xl w-24 h-24 rounded-full border-4 border-white shadow-[0_0_30px_rgba(250,204,21,0.6)] animate-bounce z-40 hover:scale-110 active:scale-95 flex items-center justify-center transform hover:rotate-12 transition-transform">UNO!</button>
          )}
          <div className="flex items-end justify-center -space-x-8 md:-space-x-12 hover:space-x-0 transition-all duration-300 w-full overflow-x-auto p-4 pt-10 scrollbar-hide h-full">
            {me?.hand.map((card, i) => (
              <div key={card.id} className="relative transition-transform duration-200 hover:z-50 hover:-translate-y-8 origin-bottom pb-2" style={{ zIndex: i }}>
                <Card card={card} playable={isMyTurn && (card.color === 'black' || card.color === gameState.currentColor || card.type === gameState.currentType || (card.type === 'number' && card.value === gameState.currentValue))} onClick={() => onCardClick(card)} />
              </div>
            ))}
          </div>
        </div>
        <div className="text-center h-8 mt-2">
           {isMyTurn ? <span className="text-yellow-300 font-black text-xl animate-pulse tracking-wider drop-shadow-md">✨ YOUR TURN ✨</span> : <span className="text-white/60 font-medium tracking-wide">Waiting for {players.find(p => p.sessionId === gameState.currentTurnPlayerId)?.name}...</span>}
        </div>
      </div>
    </div>
  );
};

const getOpponentStyle = (index: number, total: number) => {
    const styles: Record<string, React.CSSProperties> = {};
    if (total === 2) {
        styles[1] = { top: '10%', left: '50%', transform: 'translateX(-50%)' };
    } else if (total === 3) {
        styles[1] = { top: '30%', left: '10%' };
        styles[2] = { top: '30%', right: '10%' };
    } else if (total === 4) {
        styles[1] = { top: '40%', left: '5%' };
        styles[2] = { top: '10%', left: '50%', transform: 'translateX(-50%)' };
        styles[3] = { top: '40%', right: '5%' };
    } else {
        styles[1] = { top: '50%', left: '5%' };
        styles[2] = { top: '15%', left: '15%' };
        styles[3] = { top: '5%', left: '50%', transform: 'translateX(-50%)' };
        styles[4] = { top: '15%', right: '15%' };
        styles[5] = { top: '50%', right: '5%' };
    }
    return styles[index] || { display: 'none' };
}