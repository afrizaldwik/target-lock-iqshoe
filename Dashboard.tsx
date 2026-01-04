import React from 'react';
import { AppState, DailyRecord } from '../types.ts';
import { calculateDailyStats, getStrictDailyTarget, formatDate } from '../utils.ts';
import InputPanel from './InputPanel.tsx';
import WarningSystem from './WarningSystem.tsx';

interface DashboardProps {
  state: AppState;
  todayStr: string;
  updateRecord: (record: DailyRecord) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ state, todayStr, updateRecord }) => {
  const currentRecord: DailyRecord = state.records[todayStr] || {
    date: todayStr,
    isWorkDay: true,
    items: {},
    kasbon: 0,
    manualDeductions: { meal: true },
  };

  const dailyTarget = getStrictDailyTarget(state, todayStr);
  const stats = calculateDailyStats(currentRecord, state.mealCost);
  const surplus = stats.net - dailyTarget;
  const takeHome = (stats.income + stats.mealAllowance) - (currentRecord.kasbon || 0);

  const handleUpdateItem = (itemId: string, delta: number) => {
    const newItems = { ...currentRecord.items };
    newItems[itemId] = (newItems[itemId] || 0) + delta;
    if (newItems[itemId] < 0) newItems[itemId] = 0;
    updateRecord({ ...currentRecord, items: newItems });
  };

  const handleKasbonChange = (val: string) => {
    updateRecord({ ...currentRecord, kasbon: Number(val) || 0 });
  };

  const formatCurrency = (val: number) => {
    const absVal = Math.abs(val);
    const str = 'Rp' + absVal.toLocaleString('id-ID');
    return val < 0 ? `-${str}` : str;
  };

  return (
    <div className="flex flex-col h-full bg-industrial-900 text-gray-100">
      <div className={`p-6 border-b-4 shadow-xl ${surplus >= 0 ? 'border-industrial-green bg-green-900/20' : 'border-industrial-alert bg-red-900/20'} sticky top-0 z-50 backdrop-blur-md`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end mb-4">
          <div>
            <div className="text-[10px] font-mono text-gray-400 uppercase">Target Jasa</div>
            <div className="text-xl md:text-2xl font-mono font-bold">{formatCurrency(dailyTarget)}</div>
          </div>
          <div className="text-right md:text-left">
             <div className="text-[10px] font-mono text-gray-400 uppercase">Omset Riil</div>
             <div className={`text-2xl md:text-3xl font-mono font-bold ${surplus >= 0 ? 'text-green-400' : 'text-red-500'}`}>
               {formatCurrency(stats.net)}
             </div>
          </div>
          <div className="col-span-2 md:col-span-2 flex flex-col justify-end">
            <div className="flex justify-between items-center bg-black/40 p-2 rounded">
              <span className={`font-bold text-xs uppercase ${surplus >= 0 ? 'text-green-400' : 'text-red-500'}`}>{surplus >= 0 ? 'SURPLUS' : 'DEFISIT'}</span>
              <span className="font-mono text-lg font-bold">{surplus >= 0 ? '+' : ''}{formatCurrency(surplus)}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 bg-black/60 p-2 rounded border border-white/10">
           <div className="text-center border-r border-gray-700">
             <div className="text-[8px] text-gray-400 uppercase">Makan (+)</div>
             <div className="font-mono font-bold text-green-400 text-xs">{formatCurrency(stats.mealAllowance)}</div>
           </div>
           <div className="text-center border-r border-gray-700">
             <div className="text-[8px] text-gray-400 uppercase">Kasbon (-)</div>
             <div className="font-mono font-bold text-red-500 text-xs">{formatCurrency(currentRecord.kasbon || 0)}</div>
           </div>
           <div className="text-center">
             <div className="text-[8px] text-gray-400 uppercase">Estimasi Cair</div>
             <div className="font-mono font-bold text-blue-300 text-xs">{formatCurrency(takeHome)}</div>
           </div>
        </div>
      </div>

      <WarningSystem 
        totalNet={stats.net} 
        target={dailyTarget} 
        isWorkDay={currentRecord.isWorkDay}
        totalPairs={stats.totalPairs}
        premiumCount={stats.premiumCount}
        consecutiveLoss={false}
      />

      <div className="p-4 space-y-4">
        <div className="bg-industrial-800 p-4 rounded border border-industrial-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
             <span className="font-bold uppercase text-xs">Absensi:</span>
             <button onClick={() => updateRecord({ ...currentRecord, isWorkDay: !currentRecord.isWorkDay })} className={`px-4 py-2 font-bold text-xs rounded ${currentRecord.isWorkDay ? 'bg-green-600' : 'bg-gray-600'}`}>
                {currentRecord.isWorkDay ? 'MASUK' : 'LIBUR'}
             </button>
          </div>
          
          <div className="flex items-center gap-2 bg-black/40 p-2 rounded border border-red-900/30">
             <span className="font-bold uppercase text-[10px] text-red-500">Input Kasbon Hari Ini:</span>
             <input 
                type="number" 
                value={currentRecord.kasbon || ''} 
                onChange={(e) => handleKasbonChange(e.target.value)}
                placeholder="0"
                className="bg-industrial-900 border border-gray-700 text-white font-mono text-sm px-2 py-1 w-24 focus:outline-none focus:border-red-500"
             />
          </div>
        </div>

        {currentRecord.isWorkDay ? (
          <InputPanel items={currentRecord.items} onUpdate={handleUpdateItem} />
        ) : (
          <div className="p-10 text-center border-2 border-dashed border-gray-700 rounded bg-black/20">
            <h2 className="text-xl font-bold text-gray-500">MODE LIBUR</h2>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;