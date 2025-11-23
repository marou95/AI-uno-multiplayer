import React from 'react';
import { motion } from 'framer-motion';
import { ICard, CardColor, CardType } from '../../shared/types';
import clsx from 'clsx';
import { Ban, RefreshCcw, CopyPlus, Diamond } from 'lucide-react';

interface CardProps {
  card: ICard;
  onClick?: () => void;
  playable?: boolean;
  hidden?: boolean; // For opponents' cards
  small?: boolean;
}

const colorMap: Record<string, string> = {
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  yellow: 'bg-yellow-400',
  black: 'bg-slate-900',
};

export const Card: React.FC<CardProps> = ({ card, onClick, playable, hidden, small }) => {
  if (hidden) {
    return (
      <motion.div
        layout
        className={clsx(
          "rounded-lg border-2 border-white shadow-md bg-slate-800 flex items-center justify-center relative",
          small ? "w-8 h-12" : "w-16 h-24 md:w-24 md:h-36"
        )}
      >
        <div className="w-full h-full bg-red-600 rounded-md m-1 flex items-center justify-center">
             <span className="font-bold text-white text-xs italic opacity-50">UNO</span>
        </div>
      </motion.div>
    );
  }

  const baseClasses = clsx(
    "rounded-xl shadow-lg relative select-none flex flex-col items-center justify-center border-4 border-white",
    colorMap[card.color] || 'bg-gray-500',
    small ? "w-10 h-14 text-sm" : "w-20 h-32 md:w-28 md:h-44",
    playable ? "cursor-pointer hover:-translate-y-4 hover:shadow-2xl ring-4 ring-green-400" : "opacity-90",
    !playable && onClick && "cursor-not-allowed opacity-50 grayscale-[0.5]"
  );

  const renderContent = () => {
     switch(card.type) {
         case 'skip': return <Ban size={small ? 16 : 32} strokeWidth={3} />;
         case 'reverse': return <RefreshCcw size={small ? 16 : 32} strokeWidth={3} />;
         case 'draw2': return <div className="flex"><CopyPlus size={small ? 16 : 32} /> <span className="font-black text-xl">+2</span></div>;
         case 'wild': return <Diamond size={small ? 24 : 48} className="text-white fill-current" />;
         case 'wild4': return <div className="flex flex-col items-center"><Diamond size={small ? 20 : 36} /><span className="font-black text-lg">+4</span></div>;
         default: return <span className={clsx("font-black text-white italic drop-shadow-md", small ? "text-2xl" : "text-6xl")}>{card.value}</span>;
     }
  };

  return (
    <motion.div
      layoutId={card.id}
      whileTap={playable ? { scale: 0.95 } : {}}
      className={baseClasses}
      onClick={playable ? onClick : undefined}
    >
      {/* Top Left Icon */}
      <div className="absolute top-1 left-2 text-white text-opacity-80 font-bold text-xs md:text-sm">
        {card.type === 'number' ? card.value : card.type.substr(0,1).toUpperCase()}
      </div>
      
      {/* Center Content */}
      <div className="text-white drop-shadow-md">
        {renderContent()}
      </div>

      {/* Bottom Right Inverted */}
      <div className="absolute bottom-1 right-2 text-white text-opacity-80 font-bold text-xs md:text-sm rotate-180">
        {card.type === 'number' ? card.value : card.type.substr(0,1).toUpperCase()}
      </div>
      
      {/* Center Ellipse Overlay for UNO style */}
      <div className="absolute w-full h-full opacity-10 bg-white rounded-full scale-x-[0.6] rotate-45 pointer-events-none" />
    </motion.div>
  );
};
