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

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const Evaluator: React.FC<EvaluatorProps> = ({ state, updateTarget, onImportData }) => {
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [tempTarget, setTempTarget] = useState(state.monthlyTarget);
  const [selectedMonth, setSelectedMonth] = useState(state.currentMonth);
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const projection = calculateTargetProjection(state);
  
  let totalDeductions = 0;
  let totalMealAllowance = 0;
  Object.values(state.records).forEach((record: DailyRecord) => {
      const stats = calculateDailyStats(record, state.mealCost);
      totalDeductions += stats.deductions;
      totalMealAllowance += stats.mealAllowance;
  });

  const percentAchieved = (projection.totalNetIncome / state.monthlyTarget) * 100;
  const projectedPercent = (projection.projectedTotal / state.monthlyTarget) * 100;
  const takeHomePay = (projection.totalNetIncome - totalDeductions) + totalMealAllowance;

  const handleExportData = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_targetlock_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (json.monthlyTarget && json.records) {
          if (confirm("HATI-HATI: Mengimpor data akan menimpa semua catatan di HP ini. Lanjutkan?")) {
            onImportData(json);
            alert("Data berhasil dipulihkan!");
          }
        } else {
          alert("Format file backup tidak valid.");
        }
      } catch (err) {
        alert("Gagal membaca file backup.");
      }
    };
    reader.readAsText(file);
  };

  const handleSaveTarget = () => {
    updateTarget(tempTarget);
    setIsEditingTarget(false);
  };

  const generatePDF = () => {
    setIsGenerating(true);
    const doc = new jsPDF();
    const year = state.currentYear;
    const daysInMonth = getDaysInMonth(year, selectedMonth);

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("LAPORAN KINERJA TEKNISI", 14, 20);
    doc.setFontSize(10);
    doc.text(`PERIODE: ${MONTH_NAMES[selectedMonth].toUpperCase()} ${year}`, 14, 26);

    let monthIncome = 0;
    let monthMeal = 0;
    let monthDeductions = 0;
    let monthPairs = 0;
    const tableRows = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = formatDate(year, selectedMonth, d);
      const record = state.records[dateStr];
      const dayName = new Date(dateStr).toLocaleDateString('id-ID', { weekday: 'short' });
      let rowData = [`${d}`, dayName, '-', '0', '0', '0'];
      if (record) {
        const stats = calculateDailyStats(record, state.mealCost);
        monthIncome += stats.income;
        monthMeal += stats.mealAllowance;
        monthDeductions += stats.deductions;
        monthPairs += stats.totalPairs;
        rowData = [`${d}`, dayName, record.isWorkDay ? 'KERJA' : 'LIBUR', stats.totalPairs.toString(), stats.income.toLocaleString('id-ID'), stats.mealAllowance.toLocaleString('id-ID')];
      }
      tableRows.push(rowData);
    }

    autoTable(doc, {
      startY: 70,
      head: [['TGL', 'HARI', 'STATUS', 'QTY', 'OMSET', 'MAKAN']],
      body: tableRows,
    });

    doc.save(`Laporan_IQSHOE_${MONTH_NAMES[selectedMonth]}.pdf`);
    setIsGenerating(false);
  };

  return (
    <div className="p-4 md:p-8 bg-industrial-900 min-h-screen pb-20 w-full">
       <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-2">
          <h2 className="text-2xl font-bold uppercase tracking-widest text-white">Evaluasi Keras</h2>
          <div className="flex gap-2">
              <button onClick={handleExportData} className="text-[10px] font-bold bg-industrial-700 px-3 py-1 rounded uppercase">Backup</button>
              <button onClick={() => fileInputRef.current?.click()} className="text-[10px] font-bold bg-industrial-700 px-3 py-1 rounded uppercase">Impor</button>
              <input type="file" ref={fileInputRef} onChange={handleImportData} className="hidden" accept=".json" />
          </div>
       </div>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-black border border-gray-700 p-6 flex flex-col justify-center">
             <div className="text-gray-500 text-xs uppercase">Target Jasa Bulanan</div>
             <div className="text-4xl font-mono font-bold text-green-500">Rp{state.monthlyTarget.toLocaleString('id-ID')}</div>
          </div>
          <div className="bg-industrial-800 border border-industrial-700 p-6 rounded flex flex-col justify-center">
             <button onClick={generatePDF} disabled={isGenerating} className="bg-white text-black px-6 py-3 text-sm font-bold uppercase hover:bg-gray-200">UNDUH PDF</button>
          </div>
       </div>
    </div>
  );
};

export default Evaluator;