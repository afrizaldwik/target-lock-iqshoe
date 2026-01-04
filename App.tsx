import React, { useState, useEffect } from 'react';
import { AppState, DailyRecord } from './types';
import { DEFAULT_TARGET, DEFAULT_MEAL_COST } from './constants';
import { formatDate } from './utils';
import Dashboard from './components/Dashboard';
import CalendarView from './components/CalendarView';
import Evaluator from './components/Evaluator';

const CURRENT_REAL_YEAR = new Date().getFullYear();

const getInitialState = (): AppState => {
  const today = new Date();
  const saved = localStorage.getItem('TARGET_LOCK_STATE');
  if (saved) {
    const parsed = JSON.parse(saved);
    return {
      ...parsed,
      currentYear: parsed.currentYear || CURRENT_REAL_YEAR
    };
  }
  return {
    monthlyTarget: DEFAULT_TARGET,
    mealCost: DEFAULT_MEAL_COST,
    currentYear: CURRENT_REAL_YEAR,
    currentMonth: today.getMonth(),
    records: {}
  };
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(getInitialState);
  const [view, setView] = useState<'DASHBOARD' | 'CALENDAR' | 'EVAL'>('DASHBOARD');
  const [overrideDate, setOverrideDate] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'SAVED' | 'SAVING'>('SAVED');

  useEffect(() => {
    setSaveStatus('SAVING');
    localStorage.setItem('TARGET_LOCK_STATE', JSON.stringify(state));
    const timer = setTimeout(() => setSaveStatus('SAVED'), 500);
    return () => clearTimeout(timer);
  }, [state]);

  const today = new Date();
  const todayStr = formatDate(today.getFullYear(), today.getMonth(), today.getDate());
  const activeDate = overrideDate || todayStr;

  const updateRecord = (record: DailyRecord) => {
    setState(prev => ({
      ...prev,
      records: {
        ...prev.records,
        [record.date]: record
      }
    }));
  };

  const updateTarget = (newTarget: number) => {
    setState(prev => ({ ...prev, monthlyTarget: newTarget }));
  };

  const handleImportData = (newState: AppState) => {
    setState(newState);
  };

  const handleDateSelect = (date: string) => {
    setOverrideDate(date);
    setView('DASHBOARD');
  };

  return (
    <div className="bg-black min-h-screen text-slate-200 font-sans w-full max-w-6xl mx-auto border-x border-slate-800 shadow-2xl relative">
      <div className="flex border-b border-slate-800 bg-industrial-900 sticky top-0 z-[60]">
        <button onClick={() => { setOverrideDate(null); setView('DASHBOARD'); }} className={`flex-1 py-4 text-sm md:text-base font-bold tracking-widest uppercase transition-colors ${view === 'DASHBOARD' ? 'bg-slate-800 text-white border-b-4 border-red-500' : 'text-slate-500 hover:bg-slate-800/50'}`}>Harian</button>
        <button onClick={() => setView('CALENDAR')} className={`flex-1 py-4 text-sm md:text-base font-bold tracking-widest uppercase transition-colors ${view === 'CALENDAR' ? 'bg-slate-800 text-white border-b-4 border-red-500' : 'text-slate-500 hover:bg-slate-800/50'}`}>Kalender</button>
        <button onClick={() => setView('EVAL')} className={`flex-1 py-4 text-sm md:text-base font-bold tracking-widest uppercase transition-colors ${view === 'EVAL' ? 'bg-slate-800 text-white border-b-4 border-red-500' : 'text-slate-500 hover:bg-slate-800/50'}`}>Evaluasi</button>
      </div>
      
      <div className="absolute top-1 right-2 z-[70] pointer-events-none">
         <span className={`text-[10px] uppercase tracking-widest font-bold ${saveStatus === 'SAVED' ? 'text-green-800' : 'text-yellow-500'}`}>
           {saveStatus === 'SAVED' ? '● Data Tersimpan' : '● Menyimpan...'}
         </span>
      </div>

      <div className="min-h-[calc(100vh-60px)] bg-industrial-900">
        {view === 'DASHBOARD' && (
          <div className="pb-20">
             {overrideDate && overrideDate !== todayStr && (
               <div className="bg-yellow-900/50 text-yellow-200 text-center text-sm py-3 font-bold uppercase border-b border-yellow-700 tracking-wider flex justify-between px-4 items-center">
                 <span>⚠️ Mengedit: {overrideDate}</span>
                 <button onClick={() => { setOverrideDate(null); }} className="bg-black/40 px-2 py-1 rounded text-[10px] hover:bg-black">KEMBALI KE HARI INI</button>
               </div>
             )}
             <Dashboard state={state} todayStr={activeDate} updateRecord={updateRecord} />
          </div>
        )}

        {view === 'CALENDAR' && (
          <CalendarView state={state} onSelectDate={handleDateSelect} />
        )}

        {view === 'EVAL' && (
          <Evaluator state={state} updateTarget={updateTarget} onImportData={handleImportData} />
        )}
      </div>
    </div>
  );
};

export default App;