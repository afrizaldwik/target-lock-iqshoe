import React from 'react';
import { AppState } from '../types';
import { getDaysInMonth, formatDate, calculateDailyStats, getStrictDailyTarget } from '../utils';

interface CalendarViewProps {
  state: AppState;
  onSelectDate: (date: string) => void;
}

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const formatMoneyCompact = (val: number) => {
  if (val === 0) return '0';
  const absVal = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  
  if (absVal >= 1000000) return sign + (absVal / 1000000).toFixed(1).replace('.0', '') + 'jt';
  if (absVal >= 1000) return sign + (absVal / 1000).toFixed(0) + 'k';
  return sign + absVal.toString();
};

const CalendarView: React.FC<CalendarViewProps> = ({ state, onSelectDate }) => {
  const daysInMonth = getDaysInMonth(state.currentYear, state.currentMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // LOGIC FIX: Cari tahu hari pertama bulan ini jatuh di hari apa (0=Minggu, 1=Senin...)
  const firstDayIndex = new Date(state.currentYear, state.currentMonth, 1).getDay();
  // Buat array kosong untuk 'padding' di awal grid
  const emptySlots = Array.from({ length: firstDayIndex });

  return (
    <div className="p-4 md:p-8 bg-industrial-900 min-h-screen w-full">
      <div className="flex justify-between items-end mb-6 border-b border-gray-700 pb-2">
        <h2 className="text-2xl font-bold uppercase tracking-widest text-white">
          {MONTH_NAMES[state.currentMonth]} {state.currentYear}
        </h2>
        <span className="text-xs text-gray-400 uppercase font-mono">Klik tanggal untuk ubah status Libur/Kerja</span>
      </div>
      
      {/* Week Header */}
      <div className="grid grid-cols-7 gap-2 mb-2 text-center">
         {['M', 'S', 'S', 'R', 'K', 'J', 'S'].map((d, i) => (
           <div key={i} className={`text-xs font-bold ${d === 'M' ? 'text-red-500' : 'text-gray-500'}`}>{d}</div>
         ))}
      </div>

      <div className="grid grid-cols-7 gap-2 md:gap-4">
        {/* Render Empty Slots first so day 1 aligns correctly */}
        {emptySlots.map((_, index) => (
          <div key={`empty-${index}`} className="aspect-square bg-transparent"></div>
        ))}

        {days.map(day => {
          const dateStr = formatDate(state.currentYear, state.currentMonth, day);
          const record = state.records[dateStr];
          const target = getStrictDailyTarget(state, dateStr); 
          
          let bgColor = 'bg-gray-800'; // Default/Future
          let textColor = 'text-gray-500';
          let statusText = '-';
          let dailyNet = 0;
          let hasRecord = false;
          
          // Determine Day of week for simple coloring (optional, just to highlight Sundays visually if needed)
          const isSun = new Date(dateStr).getDay() === 0;

          if (record) {
             hasRecord = true;
             const stats = calculateDailyStats(record, state.mealCost);
             dailyNet = stats.net;

             if (!record.isWorkDay) {
                 bgColor = 'bg-black border border-gray-700';
                 textColor = 'text-gray-600';
                 statusText = 'OFF';
             } else if (stats.net >= target) {
                 bgColor = 'bg-green-700';
                 textColor = 'text-white';
                 statusText = 'OK';
             } else {
                 bgColor = 'bg-red-700';
                 textColor = 'text-white';
                 statusText = 'MIN';
             }
          } else if (isSun) {
             // Default visual for Sunday if no record exists
             bgColor = 'bg-black border border-gray-800';
             textColor = 'text-red-900';
          }

          return (
            <button 
              key={day}
              onClick={() => onSelectDate(dateStr)}
              className={`aspect-square ${bgColor} relative flex flex-col items-center justify-center rounded p-1 hover:brightness-110 active:scale-95 transition-all overflow-hidden border border-transparent hover:border-white/20`}
            >
              <span className={`text-[10px] md:text-xs absolute top-1 left-1.5 font-bold opacity-70 ${textColor}`}>{day}</span>
              
              <div className={`text-xs md:text-lg font-mono font-bold mt-2 md:mt-0 ${textColor}`}>
                {hasRecord ? formatMoneyCompact(dailyNet) : '-'}
              </div>
              
              <span className={`text-[8px] md:text-[10px] font-bold uppercase tracking-wider mt-0.5 opacity-80 ${textColor}`}>{statusText}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-8 p-4 bg-industrial-800 rounded border border-industrial-700 max-w-lg">
         <h3 className="text-sm font-bold uppercase text-gray-400 mb-2">Legenda</h3>
         <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-green-700 rounded flex items-center justify-center text-[10px] font-bold">OK</div>
                <span className="text-xs">Surplus Target</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-red-700 rounded flex items-center justify-center text-[10px] font-bold">MIN</div>
                <span className="text-xs">Gagal Target</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-black border border-gray-600 rounded flex items-center justify-center text-[10px] font-bold text-gray-500">OFF</div>
                <span className="text-xs">Libur / Minggu</span>
            </div>
         </div>
      </div>
    </div>
  );
};

export default CalendarView;
