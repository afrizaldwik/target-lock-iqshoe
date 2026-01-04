import React, { useState, useRef } from 'react';
import { AppState, DailyRecord } from '../types';
import { calculateTargetProjection, calculateDailyStats, formatDate, getDaysInMonth } from '../utils';
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

  // Projection logic
  const projection = calculateTargetProjection(state);
  
  let totalDeductions = 0;
  let totalMealAllowance = 0;
  let totalKasbon = 0;

  Object.values(state.records).forEach((record: DailyRecord) => {
      const stats = calculateDailyStats(record, state.mealCost);
      totalDeductions += stats.deductions;
      totalMealAllowance += stats.mealAllowance;
      totalKasbon += stats.kasbon;
  });

  const percentAchieved = (projection.totalNetIncome / state.monthlyTarget) * 100;
  const projectedPercent = (projection.projectedTotal / state.monthlyTarget) * 100;
  // TAKE HOME = INCOME - DEDUCTIONS - KASBON + MEAL
  const takeHomePay = (projection.totalNetIncome - totalDeductions - totalKasbon) + totalMealAllowance;

  // --- DATA MANAGEMENT ---
  
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
    doc.setFont("helvetica", "normal");
    doc.text(`PERIODE: ${MONTH_NAMES[selectedMonth].toUpperCase()} ${year}`, 14, 26);
    doc.text(`DICETAK: ${new Date().toLocaleDateString('id-ID')}`, 14, 31);

    let monthIncome = 0;
    let monthMeal = 0;
    let monthDeductions = 0;
    let monthKasbon = 0;
    let monthPairs = 0;
    
    const tableRows = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = formatDate(year, selectedMonth, d);
      const record = state.records[dateStr];
      const dayName = new Date(dateStr).toLocaleDateString('id-ID', { weekday: 'short' });
      
      // COLUMNS: TGL, HARI, STATUS, QTY, OMSET, MAKAN, KASBON
      let rowData = [`${d}`, dayName, '-', '0', '0', '0', '0'];

      if (record) {
        const stats = calculateDailyStats(record, state.mealCost);
        monthIncome += stats.income;
        monthMeal += stats.mealAllowance;
        monthDeductions += stats.deductions;
        monthKasbon += stats.kasbon;
        monthPairs += stats.totalPairs;
        const status = record.isWorkDay ? 'KERJA' : 'LIBUR';
        rowData = [
          `${d}`, 
          dayName, 
          status, 
          stats.totalPairs.toString(), 
          stats.income.toLocaleString('id-ID'), 
          stats.mealAllowance.toLocaleString('id-ID'),
          stats.kasbon > 0 ? `(${stats.kasbon.toLocaleString('id-ID')})` : '-'
        ];
      } else {
        const isSun = new Date(dateStr).getDay() === 0;
        rowData[2] = isSun ? 'MINGGU' : '-';
      }
      tableRows.push(rowData);
    }

    const monthTakeHome = (monthIncome - monthDeductions - monthKasbon) + monthMeal;

    doc.setDrawColor(0);
    doc.setFillColor(240, 240, 240);
    doc.rect(14, 40, 180, 25, 'F');
    
    doc.setFontSize(9);
    doc.text("TARGET BULANAN", 20, 48);
    doc.text(`Rp ${state.monthlyTarget.toLocaleString('id-ID')}`, 20, 54);
    
    doc.text("OMSET JASA", 60, 48);
    doc.text(`Rp ${monthIncome.toLocaleString('id-ID')}`, 60, 54);
    
    doc.text("TOTAL KASBON", 100, 48);
    doc.setTextColor(200, 0, 0);
    doc.text(`- Rp ${monthKasbon.toLocaleString('id-ID')}`, 100, 54);
    doc.setTextColor(0, 0, 0);

    doc.text("TOTAL GAJI (CAIR)", 145, 48);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Rp ${monthTakeHome.toLocaleString('id-ID')}`, 145, 56);

    autoTable(doc, {
      startY: 70,
      head: [['TGL', 'HARI', 'STATUS', 'QTY', 'OMSET (RP)', 'MAKAN', 'KASBON']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255] },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 10 }, 
        1: { cellWidth: 15 }, 
        2: { cellWidth: 20 },
        3: { cellWidth: 15, halign: 'center' }, 
        4: { cellWidth: 35, halign: 'right' },
        5: { cellWidth: 35, halign: 'right' },
        6: { cellWidth: 35, halign: 'right', textColor: [200, 0, 0] }
      },
      foot: [['TOTAL', '', '', monthPairs.toString(), `Rp ${monthIncome.toLocaleString('id-ID')}`, `Rp ${monthMeal.toLocaleString('id-ID')}`, `Rp ${monthKasbon.toLocaleString('id-ID')}`]],
      footStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    doc.save(`Laporan_IQSHOE_${MONTH_NAMES[selectedMonth]}_${year}.pdf`);
    setIsGenerating(false);
  };

  const getBrutalMessage = () => {
    if (projectedPercent < 80) return "PERFORMA MENYEDIHKAN. TARGET GAJI SANGAT JAUH.";
    if (projectedPercent < 100) return "KERJA LEBIH KERAS. BONUS AKHIR BULAN TERANCAM.";
    return "PERTAHANKAN KECEPATAN INI. FOKUS KUALITAS.";
  };

  return (
    <div className="p-4 md:p-8 bg-industrial-900 min-h-screen pb-20 w-full">
       <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-2">
          <h2 className="text-2xl font-bold uppercase tracking-widest">Evaluasi Keras</h2>
          <div className="flex gap-2">
              <button 
                onClick={handleExportData}
                className="text-[10px] font-bold bg-industrial-700 hover:bg-industrial-600 px-3 py-1 rounded uppercase"
              >
                Backup Data
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="text-[10px] font-bold bg-industrial-700 hover:bg-industrial-600 px-3 py-1 rounded uppercase"
              >
                Impor Data
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImportData} 
                className="hidden" 
                accept=".json"
              />
          </div>
       </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-black border border-gray-700 p-6 relative flex flex-col justify-center">
            <div className="flex justify-between items-start mb-2">
            <div className="text-gray-500 text-xs uppercase">Target Jasa Bulanan</div>
            {!isEditingTarget && (
                <button 
                onClick={() => setIsEditingTarget(true)}
                className="text-xs text-blue-400 underline uppercase hover:text-blue-300"
                >
                Ubah Target
                </button>
            )}
            </div>

            {isEditingTarget ? (
            <div className="flex gap-2">
                <input 
                type="number" 
                value={tempTarget}
                onChange={(e) => setTempTarget(Number(e.target.value))}
                className="bg-industrial-800 text-white font-mono text-2xl w-full p-2 border border-blue-500 focus:outline-none"
                />
                <button onClick={handleSaveTarget} className="bg-blue-600 text-white px-4 py-2 font-bold text-sm uppercase hover:bg-blue-500">Simpan</button>
            </div>
            ) : (
            <>
                <div className={`text-4xl md:text-5xl font-mono font-bold ${projection.projectedTotal < state.monthlyTarget ? 'text-red-600' : 'text-green-500'}`}>
                Rp{state.monthlyTarget.toLocaleString('id-ID')}
                </div>
                <div className="mt-2 text-sm text-gray-400">
                Proyeksi saat ini: <span className="text-white font-bold">Rp{Math.floor(projection.projectedTotal).toLocaleString('id-ID')}</span>
                </div>
            </>
            )}
        </div>

        <div className="bg-industrial-800 border border-industrial-700 p-6 rounded flex flex-col justify-center">
            <h3 className="text-sm font-bold text-white uppercase mb-4">Ekspor Laporan PDF</h3>
            <div className="flex flex-col sm:flex-row gap-3">
            <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-black text-white text-base p-3 border border-gray-600 flex-1 font-mono uppercase rounded focus:border-blue-500 outline-none"
            >
                {MONTH_NAMES.map((m, idx) => (
                <option key={idx} value={idx}>{m}</option>
                ))}
            </select>
            <button 
                onClick={generatePDF}
                disabled={isGenerating}
                className="bg-white text-black px-6 py-3 text-sm font-bold uppercase hover:bg-gray-200 disabled:opacity-50 rounded transition-colors"
            >
                {isGenerating ? 'Memproses...' : 'Unduh Laporan'}
            </button>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-industrial-800 p-6 rounded border-l-8 border-blue-500">
           <div className="flex flex-col justify-between h-full">
               <div className="mb-4">
                   <div className="text-sm font-bold text-gray-400 uppercase">Total Omset Jasa</div>
                   <div className="text-3xl font-mono text-white mt-1">Rp{projection.totalNetIncome.toLocaleString('id-ID')}</div>
                   <div className="text-xs text-gray-500 mt-2">Pencapaian Target: <span className="text-white font-bold">{percentAchieved.toFixed(1)}%</span></div>
               </div>
               <div className="pt-4 border-t border-gray-700">
                   <div className="text-xs font-bold text-green-400 uppercase">Tunjangan Makan (+)</div>
                   <div className="text-xl font-mono text-green-400">+Rp{totalMealAllowance.toLocaleString('id-ID')}</div>
               </div>
           </div>
        </div>

        <div className="bg-slate-800 p-6 rounded border border-slate-600 flex flex-col justify-center">
           <div className="text-sm font-bold text-blue-300 uppercase mb-2">Estimasi Total Transfer Gaji</div>
           <div className="text-4xl font-mono font-bold text-white">Rp{takeHomePay.toLocaleString('id-ID')}</div>
           <div className="text-xs text-slate-400 mt-2 italic">(Omset Jasa + Uang Makan - Kasbon)</div>
        </div>

        <div className="bg-industrial-800 p-6 rounded border-l-8 border-red-500 flex flex-col justify-center">
           <div className="text-sm font-bold text-gray-400 uppercase mb-2">Total Kasbon / Utang</div>
           <div className="text-3xl font-mono text-red-500">
              - Rp{totalKasbon.toLocaleString('id-ID')}
           </div>
           <div className="text-xs text-red-400 mt-2 italic">Mengurangi Gaji Cair</div>
        </div>
      </div>
        
      <div className="mt-8 p-6 bg-red-900/30 border-2 border-red-600 text-center rounded">
            <h3 className="text-red-500 font-bold uppercase text-2xl mb-4 tracking-widest">VONIS SISTEM</h3>
            <p className="text-white font-mono text-lg leading-relaxed">"{getBrutalMessage()}"</p>
      </div>
    </div>
  );
};

export default Evaluator;