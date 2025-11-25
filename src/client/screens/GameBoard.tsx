import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Card } from '../components/Card';
import { AnimatePresence, motion } from 'framer-motion';
import { CardColor } from '../../shared/types';
import { playSound } from '../utils/sounds';
import confetti from 'canvas-confetti';
import { Player } from '../../server/schema/UNOState';
import clsx from 'clsx';
import { Siren } from 'lucide-react';

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

  // --- ENGLISH WINNER SCREEN ---
  if (gameState.winner) {
    const isWinner = gameState.winner === me?.name;

    return (
      <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center text-white p-4">
        <div className="mb-8 flex flex-col items-center animate-in fade-in zoom-in duration-500">
            {isWinner ? (
                <>
                    <div className="text-8xl mb-6 animate-bounce">👑</div>
                    <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 to-yellow-600 mb-4">
                        VICTORY !
                    </h1>
                    <p className="text-2xl text-yellow-100 font-medium">You are the UNO King!</p>
                </>
            ) : (
                <>
                    <div className="text-8xl mb-6 grayscale opacity-80">💀</div>
                    <h1 className="text-6xl md:text-8xl font-black text-gray-500 mb-4">
                        DEFEAT
                    </h1>
                    <p className="text-2xl text-gray-400">
                        <span className="text-yellow-500 font-bold">{gameState.winner}</span> won the game.
                    </p>
                </>
            )}
        </div>

        <div className="flex flex-col md:flex-row gap-6 mt-8 w-full max-w-md md:max-w-xl px-4">
            <button 
                onClick={requestRestart} 
                className="flex-1 py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl text-xl transition-all hover:scale-105 shadow-lg shadow-green-900/50 flex items-center justify-center gap-2"
            >
                🔄 Play Again
            </button>
            
            <button 
                onClick={leaveRoom} 
                className="flex-1 py-4 bg-slate-700 hover:bg-red-600 text-white font-bold rounded-xl text-xl transition-all hover:scale-105 shadow-lg flex items-center justify-center gap-2"
            >
                🚪 Leave
            </button>
        </div>
      </div>
    );
  }

  // --- GAME BOARD ---
  return (
    <div className="w-full h-screen bg-green-800 overflow-hidden relative flex flex-col">
      {/* Background */}
      <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
         <motion.div animate={{ rotate: gameState.direction === 1 ? 0 : 180 }} transition={{ duration: 0.5 }}>
            <div className="w-96 h-96 border-[20px] border-white rounded-full border-dashed animate-spin-slow" style={{ animationDuration: '20s' }} />
         </motion.div>
      </div>

      {/* CATCH BUTTON */}
      <AnimatePresence>
        {showCatchButton && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => { catchUno(); playSound('uno'); }}
            className="absolute top-24 left-1/2 -translate-x-1/2 z-40 bg-red-600 text-white font-black text-2xl px-8 py-4 rounded-full border-4 border-white shadow-2xl animate-pulse flex items-center gap-3 hover:scale-110 transition active:bg-red-700"
          >
            <Siren size={32} className="animate-spin" />
            CATCH UNO! ({culpritName})
          </motion.button>
        )}
      </AnimatePresence>

      {/* CENTER TABLE */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-8 z-10">
        
        {/* Draw Pile */}
        <div 
           className="relative cursor-pointer group" 
           onClick={() => { if(isMyTurn) { drawCard(); playSound('draw'); } }}
           onMouseEnter={() => playSound('hover')} 
        >
          <div className="w-24 h-36 md:w-32 md:h-48 bg-slate-900 rounded-xl border-4 border-white shadow-xl flex items-center justify-center group-hover:scale-105 transition-transform">
            <span className="text-red-500 font-bold text-3xl italic">UNO</span>
          </div>
          {gameState.drawStack > 0 && (
            <div className="absolute -top-4 -right-4 bg-red-600 text-white font-bold w-10 h-10 rounded-full flex items-center justify-center border-2 border-white animate-bounce">
              +{gameState.drawStack}
            </div>
          )}
        </div>

        {/* Discard Pile */}
        <div className="relative w-24 h-36 md:w-32 md:h-48">
          {topCard && (
             <motion.div
               key={topCard.id}
               initial={{ scale: 1.5, opacity: 0, rotate: Math.random() * 20 - 10 }}
               animate={{ scale: 1, opacity: 1, rotate: 0 }}
               className="absolute inset-0"
             >
               <Card card={topCard} playable={false} />
             </motion.div>
          )}
          <div className={clsx("absolute -bottom-6 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full border-2 border-white shadow-md transition-colors duration-300", bgColors[gameState.currentColor] || 'bg-slate-800')} />
        </div>
      </div>

      {/* COLOR PICKER */}
      <AnimatePresence>
        {showColorPicker && (
          <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="bg-white p-6 rounded-2xl shadow-2xl grid grid-cols-2 gap-4">
              {['red', 'blue', 'green', 'yellow'].map((c: string) => (
                <button 
                  key={c}
                  onClick={() => handleColorSelect(c as CardColor)}
                  className={clsx("w-24 h-24 rounded-xl hover:scale-110 transition shadow-lg border-4 border-transparent hover:border-black/10", bgColors[c])}
                />
              ))}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* OPPONENTS */}
      {rotatedPlayers.map((player, index) => {
        if (index === 0) return null; 

        return (
          <div key={player.sessionId} className="absolute flex flex-col items-center gap-2 transition-all duration-500" 
            style={getOpponentStyle(index, rotatedPlayers.length)}
          >
            <div className={`relative w-16 h-16 rounded-full border-4 ${gameState.currentTurnPlayerId === player.sessionId ? 'border-yellow-400 animate-pulse' : 'border-slate-700'} bg-slate-800 flex items-center justify-center overflow-visible`}>
              <span className="text-white font-bold text-xl">{player.name[0]}</span>
              <div className="absolute -bottom-2 bg-slate-700 text-xs px-2 py-0.5 rounded-full text-white border border-slate-500 whitespace-nowrap z-20">
                {player.cardsRemaining} cards
              </div>
              {player.hasSaidUno && (
                 <div className="absolute -top-4 bg-red-600 text-white font-black text-xs px-2 py-1 rounded-full animate-bounce z-20 shadow-sm border border-white">UNO!</div>
              )}
            </div>
            
            <div className="flex -space-x-3 mt-1">
              {Array.from({ length: Math.min(player.cardsRemaining, 5) }).map((_, i) => (
                 <div key={i} className="w-6 h-9 bg-slate-800 rounded border border-white/20 shadow-sm" />
              ))}
              {player.cardsRemaining > 5 && <div className="text-white text-xs self-center pl-1">...</div>}
            </div>
          </div>
        );
      })}

      {/* MY HAND */}
      <div className="mt-auto w-full pb-6 px-4">
        <div className="relative max-w-5xl mx-auto h-40 md:h-56 flex items-end justify-center perspective-1000">
          
          {/* UNO BUTTON */}
          {me && me.hand.length === 1 && !me.hasSaidUno && (
             <button onClick={() => { sayUno(); playSound('uno'); }} className="absolute -top-20 right-10 md:right-32 bg-yellow-500 text-red-600 font-black text-2xl w-20 h-20 rounded-full border-4 border-red-600 shadow-xl animate-bounce z-40 hover:scale-110 active:scale-95">
               UNO
             </button>
          )}
          
          {/* PENALTY WARNING */}
          {pendingUnoPlayerId === playerId && (
             <div className="absolute -top-32 left-1/2 -translate-x-1/2 bg-red-600 text-white font-bold px-4 py-2 rounded-lg animate-pulse z-50 shadow-lg border-2 border-white">
               HURRY! CLICK UNO! (3s)
             </div>
          )}

          {/* CARDS */}
          <div className="flex items-end justify-center -space-x-8 md:-space-x-12 hover:space-x-0 transition-all duration-300 w-full overflow-x-auto p-4 scrollbar-hide h-full">
            {me?.hand.map((card, i) => (
              <div key={card.id} className="relative transition-transform duration-200 hover:z-50 hover:-translate-y-6 origin-bottom" style={{ zIndex: i }}>
                <Card 
                  card={card} 
                  playable={isMyTurn && (
                      card.color === 'black' || 
                      card.color === gameState.currentColor || 
                      card.type === gameState.currentType || 
                      (card.type === 'number' && card.value === gameState.currentValue)
                  )}
                  onClick={() => onCardClick(card)}
                />
              </div>
            ))}
          </div>
        </div>
        
        <div className="text-center text-white/50 text-sm font-semibold h-6 mt-2">
           {isMyTurn 
             ? <span className="text-yellow-400 animate-pulse font-bold text-lg">YOUR TURN !</span> 
             : `Waiting for ${players.find(p => p.sessionId === gameState.currentTurnPlayerId)?.name}...`}
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