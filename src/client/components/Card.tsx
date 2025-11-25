import React from 'react';
import { Card as CardSchema } from '../../server/schema/UNOState';
import clsx from 'clsx';
import { Ban, RefreshCcw, Layers } from 'lucide-react';
import { playSound } from '../utils/sounds';

interface CardProps {
  card: CardSchema;
  playable?: boolean;
  small?: boolean;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

const cardColors: Record<string, string> = {
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  yellow: 'bg-yellow-400',
  black: 'bg-slate-800'
};

const textColors: Record<string, string> = {
  red: 'text-red-500',
  blue: 'text-blue-500',
  green: 'text-green-500',
  yellow: 'text-yellow-400',
  black: 'text-white'
};

export const Card: React.FC<CardProps> = ({ card, playable, small, onClick, className, style }) => {
  const isNumber = card.type === 'number';
  const colorClass = cardColors[card.color] || 'bg-slate-700';

  // Ajustement de la taille des éléments internes selon le mode "small"
  const iconSize = small ? 24 : 48;
  const smallIconSize = small ? 12 : 24;
  const textSize = small ? "text-4xl" : "text-6xl";
  const labelSize = small ? "text-xl" : "text-4xl";
  const cornerSize = small ? "text-xs" : "text-lg";

  // Icône centrale
  const renderContent = () => {
    if (isNumber) return <span className={clsx(textSize, "font-black italic shadow-black drop-shadow-md")}>{card.value}</span>;
    if (card.type === 'skip') return <Ban size={iconSize} className="drop-shadow-md" />;
    if (card.type === 'reverse') return <RefreshCcw size={iconSize} className="drop-shadow-md" />;
    if (card.type === 'draw2') return <div className={clsx("flex flex-col items-center font-black italic drop-shadow-md", labelSize)}><span>+2</span><Layers size={smallIconSize}/></div>;
    if (card.type === 'wild') return <div className={clsx("font-black italic bg-gradient-to-br from-red-500 via-yellow-400 to-blue-500 text-transparent bg-clip-text", labelSize)}>WILD</div>;
    if (card.type === 'wild4') return <div className={clsx("flex flex-col items-center font-black italic bg-gradient-to-br from-red-500 via-yellow-400 to-blue-500 text-transparent bg-clip-text", labelSize)}><span>+4</span><span className="text-[8px] text-white">WILD</span></div>;
    return null;
  };

  // Coins
  const renderCorner = () => {
     if (isNumber) return card.value;
     if (card.type === 'skip') return <Ban size={small ? 10 : 16} />;
     if (card.type === 'reverse') return <RefreshCcw size={small ? 10 : 16} />;
     if (card.type === 'draw2') return '+2';
     if (card.type === 'wild') return 'W';
     if (card.type === 'wild4') return '+4';
     return '';
  };

  return (
    <div 
      onClick={playable ? onClick : undefined}
      onMouseEnter={() => playable && playSound('hover')}
      className={clsx(
        // Si small est true, on utilise w-full h-full pour s'adapter au conteneur parent (géré dans GameBoard)
        small ? "w-full h-full" : "w-24 h-36 md:w-32 md:h-48", 
        "rounded-xl relative select-none transition-all duration-200 shadow-xl border-4",
        colorClass,
        playable ? "cursor-pointer hover:scale-105 hover:-translate-y-4 ring-4 ring-white/50 hover:ring-white hover:shadow-2xl z-10" : "opacity-100 border-white/10",
        "border-white",
        className
      )}
      style={style}
    >
      {/* Design Intérieur */}
      <div className="absolute inset-2 border-2 border-white/20 rounded-lg flex items-center justify-center overflow-hidden">
         <div className="absolute inset-0 bg-gradient-to-br from-black/0 to-black/20" />
         
         {/* Ovale */}
         <div className="w-full h-[80%] bg-white transform -skew-x-12 flex items-center justify-center text-slate-900 shadow-inner relative z-0">
             <div className={clsx("transform skew-x-12", isNumber ? textColors[card.color] : "text-slate-900")}>
                {renderContent()}
             </div>
         </div>

         {/* Coins */}
         <div className={clsx("absolute top-1 left-1 text-white font-bold drop-shadow-md leading-none", cornerSize)}>
            {renderCorner()}
         </div>
         <div className={clsx("absolute bottom-1 right-1 text-white font-bold drop-shadow-md leading-none rotate-180", cornerSize)}>
            {renderCorner()}
         </div>
      </div>

      {/* Overlay Non jouable */}
      {!playable && onClick && (
        <div className="absolute inset-0 bg-black/10 rounded-xl" />
      )}
    </div>
  );
};