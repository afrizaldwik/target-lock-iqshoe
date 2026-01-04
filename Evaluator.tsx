import React, { useState, useRef } from 'react';
import { AppState, DailyRecord } from '../types.ts';
import { calculateTargetProjection, calculateDailyStats, formatDate, getDaysInMonth } from '../utils.ts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface EvaluatorProps {
  state: AppState;
  updateTarget: (newTarget: number) => void;
  onImportData: (newState: AppState) => void;
}

const MONTH_NAMES = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

const Evaluator: React.FC<EvaluatorProps> = ({ state, updateTarget, onImportData }) => {
  const [selectedMonth, setSelectedMonth] = useState(state.currentMonth);
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const projection = calculateTargetProjection(state);
  
  let totalIncome = 0;
  let totalMeal = 0;
  let totalKasbon = 0;

  // Fix: Explicitly type 'record' as DailyRecord to avoid 'unknown' inference error when iterating over object values
  Object.values(state.records).forEach((record: DailyRecord) => {
      const stats = calculateDailyStats(record, state.mealCost);
      totalIncome += stats.income;
      totalMeal += stats.mealAllowance;
      totalKasbon += stats.kasbon;
  });

  const takeHomePay = (totalIncome + totalMeal) - totalKasbon;

  const generatePDF = () => {
    setIsGenerating(true);
    const doc = new jsPDF();
    const year = state.currentYear;
    const daysInMonth = getDaysInMonth(year, selectedMonth);

    doc.setFontSize(16).setFont("helvetica", "bold");
    doc.text("LAPORAN KINERJA & KASBON TEKNISI", 14, 20);
    doc.setFontSize(10).setFont("helvetica", "normal");
    doc.text(`PERIODE: ${MONTH_NAMES[selectedMonth].toUpperCase()} ${year}`, 14, 26);

    const tableRows = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = formatDate(year, selectedMonth, d);
      const record = state.records[dateStr];
      const stats = calculateDailyStats(record, state.mealCost);
      tableRows.push([
        d, 
        record ? (record.isWorkDay ? 'MASUK' : 'LIBUR') : '-', 
        stats.totalPairs, 
        stats.income.toLocaleString('id-ID'), 
        stats.mealAllowance.toLocaleString('id-ID'), 
        stats.kasbon.toLocaleString('id-ID')
      ]);
    }

    autoTable(doc, {
      startY: 40,
      head: [['TGL', 'STATUS', 'QTY', 'OMSET', 'MAKAN', 'KASBON']],
      body: tableRows,
      foot: [['TOTAL', '', '', totalIncome.toLocaleString('id-ID'), totalMeal.toLocaleString('id-ID'), totalKasbon.toLocaleString('id-ID')]]
    });

    doc.text(`TOTAL GAJI BERSIH (TAKE HOME PAY): Rp ${takeHomePay.toLocaleString('id-ID')}`, 14, (doc as any).lastAutoTable.finalY + 15);

    doc.save(`Laporan_MandorDigital_${MONTH_NAMES[selectedMonth]}.pdf`);
    setIsGenerating(false);
  };

  return (
    <div className="p-4 md:p-8 bg-industrial-900 min-h-screen pb-20 w-full">
       <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-2">
          <h2 className="text-xl font-bold uppercase tracking-widest text-white">Evaluasi & Kasbon</h2>
          <div className="flex gap-2">
              <button onClick={() => {
                const dataStr = JSON.stringify(state, null, 2);
                const blob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url; link.download = 'backup.json'; link.click();
              }} className="text-[10px] bg-industrial-700 px-3 py-1 rounded uppercase">Backup</button>
              <button onClick={() => fileInputRef.current?.click()} className="text-[10px] bg-industrial-700 px-3 py-1 rounded uppercase">Impor</button>
              <input type="file" ref={fileInputRef} onChange={(e) => {
                  const file = e.target.files?.[0]; if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => { onImportData(JSON.parse(ev.target?.result as string)); alert("Pulih!"); };
                  reader.readAsText(file);
              }} className="hidden" accept=".json" />
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800 p-4 border-l-4 border-blue-500">
             <div className="text-[10px] uppercase text-gray-400">Total Omset (Gross)</div>
             <div className="text-2xl font-mono font-bold text-white">Rp{totalIncome.toLocaleString('id-ID')}</div>
          </div>
          <div className="bg-slate-800 p-4 border-l-4 border-green-500">
             <div className="text-[10px] uppercase text-gray-400">Total Uang Makan</div>
             <div className="text-2xl font-mono font-bold text-green-500">+Rp{totalMeal.toLocaleString('id-ID')}</div>
          </div>
          <div className="bg-slate-800 p-4 border-l-4 border-red-500">
             <div className="text-[10px] uppercase text-gray-400">Total Kasbon (HUTANG)</div>
             <div className="text-2xl font-mono font-bold text-red-500">-Rp{totalKasbon.toLocaleString('id-ID')}</div>
          </div>
          <div className="bg-black p-4 border-l-4 border-white">
             <div className="text-[10px] uppercase text-gray-400">Transfer Akhir (Net)</div>
             <div className="text-3xl font-mono font-bold text-blue-300">Rp{takeHomePay.toLocaleString('id-ID')}</div>
          </div>
       </div>

       <button onClick={generatePDF} disabled={isGenerating} className="w-full bg-white text-black py-4 font-bold uppercase hover:bg-gray-200">
          {isGenerating ? 'Memproses...' : 'Unduh Laporan PDF'}
       </button>
    </div>
  );
};

export default Evaluator;