import React from 'react';
import { AppState, DailyRecord } from '../types';
import { calculateDailyStats, getStrictDailyTarget, formatDate } from '../utils';
import InputPanel from './InputPanel';
import WarningSystem from './WarningSystem';

interface DashboardProps {
  state: AppState;
  todayStr: string;
  updateRecord: (record: DailyRecord) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ state, todayStr, updateRecord }) => {
  const currentRecord = state.records[todayStr] || {
    date: todayStr,
    isWorkDay: true, // Default assumed
    items: {},
    kasbon: 0,
    manualDeductions: { meal: true }, // Legacy flag
  };

  const dailyTarget = getStrictDailyTarget(state, todayStr);
  const stats = calculateDailyStats(currentRecord, state.mealCost);
  
  // Surplus dihitung dari NET (Omset Jasa). Uang makan TIDAK MASUK perhitungan target kerja.
  const surplus = stats.net - dailyTarget;
  
  // Gaji Cair = (Omset Jasa - Potongan Lain - KASBON) + Uang Makan
  const takeHome = (stats.income - stats.deductions - stats.kasbon) + stats.mealAllowance;
  
  // Check strict consecutive loss logic
  const [y, m, d] = todayStr.split('-').map(Number);
  const currentDt = new Date(y, m - 1, d);
  const yesterdayDate = new Date(currentDt);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = formatDate(yesterdayDate.getFullYear(), yesterdayDate.getMonth(), yesterdayDate.getDate());
  
  const yesterdayRecord = state.records[yesterdayStr];
  const yesterdayTarget = getStrictDailyTarget(state, yesterdayStr);
  const yesterdayStats = calculateDailyStats(yesterdayRecord, state.mealCost);
  const consecutiveLoss = (yesterdayStats.net < yesterdayTarget) && (stats.net < dailyTarget);

  const handleUpdateItem = (itemId: string, delta: number) => {
    const newItems = { ...currentRecord.items };
    newItems[itemId] = (newItems[itemId] || 0) + delta;
    if (newItems[itemId] < 0) newItems[itemId] = 0;

    updateRecord({
      ...currentRecord,
      items: newItems
    });
  };

  const handleKasbonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 0;
    updateRecord({
      ...currentRecord,
      kasbon: val
    });
  };

  const toggleWorkDay = () => {
    updateRecord({
      ...currentRecord,
      isWorkDay: !currentRecord.isWorkDay,
      // Reset meal logic automatically handled by isWorkDay in utils
    });
  };

  const nextDayDate = new Date(currentDt);
  nextDayDate.setDate(nextDayDate.getDate() + 1);
  const nextDayStr = formatDate(nextDayDate.getFullYear(), nextDayDate.getMonth(), nextDayDate.getDate());
  
  const deficitVal = Math.max(0, -surplus);
  const projectedTomorrowTarget = getStrictDailyTarget({
      ...state, 
      records: { ...state.records, [todayStr]: currentRecord } 
  }, nextDayStr);

  const formatCurrency = (val: number) => {
    const absVal = Math.abs(val);
    const str = 'Rp' + absVal.toLocaleString('id-ID');
    return val < 0 ? `-${str}` : str;
  };

  return (
    <div className="flex flex-col h-full bg-industrial-900 text-gray-100">
      {/* HEADER: REAL TIME STATUS */}
      <div className={`p-6 border-b-4 shadow-xl ${surplus >= 0 ? 'border-industrial-green bg-green-900/20' : 'border-industrial-alert bg-red-900/20'} sticky top-0 z-50 backdrop-blur-md transition-colors duration-500`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end mb-4">
          <div className="col-span-1">
            <div className="text-xs md:text-sm font-mono text-gray-400 uppercase tracking-widest">Target Jasa Hari Ini</div>
            <div className="text-2xl md:text-3xl font-mono font-bold text-white">{formatCurrency(dailyTarget)}</div>
          </div>
          <div className="col-span-1 text-right md:text-left">
             <div className="text-xs md:text-sm font-mono text-gray-400 uppercase tracking-widest">Omset Jasa (Kerja)</div>
             <div className={`text-3xl md:text-4xl font-mono font-bold ${surplus >= 0 ? 'text-green-400' : 'text-red-500'}`}>
               {formatCurrency(stats.net)}
             </div>
          </div>
          
          {/* Divider on Mobile hidden, shown on Desktop */}
          <div className="hidden md:block w-px bg-gray-700 h-10"></div>

          <div className="col-span-2 md:col-span-1 flex flex-col justify-end">
            <div className="flex justify-between items-center bg-black/40 p-2 rounded">
              <span className={`font-bold text-sm uppercase ${surplus >= 0 ? 'text-green-400' : 'text-red-500'}`}>
                {surplus >= 0 ? 'SURPLUS' : 'DEFISIT'}
              </span>
              <span className="font-mono text-xl font-bold">
                {surplus >= 0 ? '+' : ''}{formatCurrency(surplus)}
              </span>
            </div>
            {surplus < 0 && (
              <div className="mt-1 text-[10px] font-mono text-red-300">
                Target besok naik menjadi {formatCurrency(projectedTomorrowTarget)}
              </div>
            )}
          </div>
        </div>

        {/* FINANCIAL SPLIT */}
        <div className="grid grid-cols-2 gap-4 bg-black/60 p-3 rounded border border-white/10">
           <div className="flex flex-col md:flex-row md:items-center justify-between border-r border-gray-700 pr-4">
             <div className="text-xs text-gray-400 uppercase">Tunjangan Makan (+)</div>
             <div className="font-mono font-bold text-green-400 text-lg md:text-xl">
                 +{formatCurrency(stats.mealAllowance)} 
             </div>
           </div>
           <div className="flex flex-col md:flex-row md:items-center justify-between pl-2">
             <div className="text-xs text-gray-400 uppercase">Total Gaji (Cair)</div>
             <div className="font-mono font-bold text-blue-300 text-lg md:text-xl">{formatCurrency(takeHome)}</div>
           </div>
           {stats.kasbon > 0 && (
             <div className="col-span-2 border-t border-gray-700 pt-2 mt-1 flex justify-between items-center bg-red-900/30 px-2 rounded">
                <span className="text-xs text-red-400 uppercase font-bold">POTONGAN KASBON HARI INI</span>
                <span className="font-mono font-bold text-red-400">-{formatCurrency(stats.kasbon)}</span>
             </div>
           )}
        </div>
      </div>

      {/* WARNING SYSTEM */}
      <WarningSystem 
        totalNet={stats.net} 
        totalPairs={stats.totalPairs} 
        premiumCount={stats.premiumCount}
        consecutiveLoss={consecutiveLoss}
        isWorkDay={currentRecord.isWorkDay}
        target={dailyTarget}
      />

      {/* CONTROL PANEL */}
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between bg-industrial-800 p-4 rounded border border-industrial-700 max-w-xl mx-auto md:mx-0">
          <span className="font-bold uppercase text-sm md:text-base">Masuk Kerja Hari Ini?</span>
          <button 
            onClick={toggleWorkDay}
            className={`px-6 py-3 font-bold text-sm md:text-base rounded transition-colors ${currentRecord.isWorkDay ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-gray-600 hover:bg-gray-500 text-gray-300'}`}
          >
            {currentRecord.isWorkDay ? 'YA (ON)' : 'TIDAK (LIBUR)'}
          </button>
        </div>

        {currentRecord.isWorkDay ? (
          <>
            <div className="bg-green-900/20 p-4 rounded border border-green-800 flex justify-between items-center max-w-xl mx-auto md:mx-0">
               <div>
                  <span className="font-bold uppercase text-sm text-green-400 block">Status: Dapat Uang Makan</span>
                  <span className="text-xs text-gray-500 uppercase">Ditambah ke Gaji Bulanan</span>
               </div>
               <div className="font-mono font-bold text-green-400 text-xl">
                 +{formatCurrency(state.mealCost)}
               </div>
            </div>

            {/* KASBON INPUT */}
            <div className="bg-red-900/10 p-4 rounded border border-red-900 max-w-xl mx-auto md:mx-0">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-2">
                 <div>
                    <span className="font-bold uppercase text-sm text-red-400 block">TARIK KASBON / PINJAMAN</span>
                    <span className="text-xs text-red-500/70 uppercase font-mono">AWAS: MEMOTONG GAJI CAIR</span>
                 </div>
               </div>
               <div className="flex items-center gap-2">
                 <span className="text-gray-400 font-bold">Rp</span>
                 <input 
                    type="number" 
                    value={currentRecord.kasbon === 0 ? '' : currentRecord.kasbon} 
                    onChange={handleKasbonChange}
                    placeholder="0"
                    className="flex-1 bg-black/50 border border-red-900/50 rounded p-2 text-white font-mono font-bold focus:outline-none focus:border-red-500"
                 />
               </div>
            </div>
            
            {/* UTANG TARGET PANEL / ADVICE */}
            {deficitVal > 0 && (
                <div className="bg-slate-800 p-4 border-l-4 border-slate-500 max-w-3xl">
                    <h4 className="text-xs uppercase text-slate-400 mb-2">Instruksi Kejar Target:</h4>
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="bg-black/30 p-2 rounded flex-1">
                        <p className="text-lg font-bold text-white">
                            +{Math.ceil(deficitVal / 10000)} pasang Basic
                        </p>
                      </div>
                      <div className="flex items-center justify-center text-slate-500 text-xs uppercase">Atau</div>
                      <div className="bg-black/30 p-2 rounded flex-1">
                        <p className="text-lg font-bold text-white">
                            +{Math.ceil(deficitVal / 25000)} Wearpack/Stroller
                        </p>
                      </div>
                    </div>
                </div>
            )}

            <div className="mt-8">
              <h3 className="text-sm font-bold uppercase text-gray-500 mb-4 px-2 border-b border-gray-800 pb-2">Input Menu Pekerjaan</h3>
              <InputPanel items={currentRecord.items} onUpdate={handleUpdateItem} />
            </div>
          </>
        ) : (
          <div className="p-12 text-center border-4 border-dashed border-gray-700 rounded bg-black/20">
            <h2 className="text-3xl font-bold text-gray-500">MODE LIBUR</h2>
            <p className="text-lg text-red-400 mt-4 font-mono">
              "Target harian dinaikkan, dan uang makan hangus."
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;