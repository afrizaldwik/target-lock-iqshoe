import React from 'react';
import { MENU_ITEMS, COLOR_MAP } from '../constants';
import { ItemCategory } from '../types';

interface InputPanelProps {
  items: Record<string, number>;
  onUpdate: (id: string, delta: number) => void;
}

const InputPanel: React.FC<InputPanelProps> = ({ items, onUpdate }) => {
  // Group by price/category for layout
  const categories: ItemCategory[] = ['YELLOW', 'RED', 'ORANGE', 'BLUE', 'PURPLE', 'WHITE', 'OPERATIONAL'];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 p-2 pb-24">
      {categories.map(cat => (
        <React.Fragment key={cat}>
           {MENU_ITEMS.filter(i => i.category === cat).map(item => (
             <div key={item.id} className={`p-3 border-l-4 ${COLOR_MAP[cat]} flex flex-col justify-between relative min-h-[110px] shadow-lg transition-transform hover:scale-[1.02]`}>
               <div>
                 <div className="font-bold text-sm md:text-base uppercase leading-tight tracking-tight text-white/90 drop-shadow-md">
                   {item.label}
                 </div>
                 <div className="font-mono text-base md:text-lg font-bold mt-1 text-white/80">
                   Rp{item.price.toLocaleString('id-ID')}
                 </div>
               </div>
               
               <div className="flex items-center justify-between mt-3 bg-black/40 p-1.5 rounded backdrop-blur-sm">
                 <button 
                    onClick={() => onUpdate(item.id, -1)}
                    className="w-10 h-10 md:w-8 md:h-8 flex items-center justify-center bg-black text-white text-xl font-bold hover:bg-red-900 active:scale-95 rounded"
                 >−</button>
                 <span className="font-mono text-2xl md:text-xl font-bold text-white w-10 text-center drop-shadow-lg">
                   {items[item.id] || 0}
                 </span>
                 <button 
                    onClick={() => onUpdate(item.id, 1)}
                    className="w-10 h-10 md:w-8 md:h-8 flex items-center justify-center bg-white text-black text-xl font-bold hover:bg-gray-200 active:scale-95 rounded"
                 >+</button>
               </div>
             </div>
           ))}
        </React.Fragment>
      ))}
    </div>
  );
};

export default InputPanel;