import React, { useState, useRef } from 'react';
import { AppState, DailyRecord } from '../types';
import { calculateTargetProjection, calculateDailyStats, formatDate, getDaysInMonth } from '../utils';
import { MENU_ITEMS, COLOR_MAP } from '../constants';
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
  
  // --- AGGREGATION LOGIC ---
  const daysInMonth = getDaysInMonth(state.currentYear, selectedMonth);
  let totalDeductions = 0;
  let totalMealAllowance = 0;
  let totalKasbon = 0;
  let monthlyNet = 0;
  
  // Item Aggregation map: itemId -> count
  const itemCounts: Record<string, number> = {};
  
  // Daily Logs Data Structure for UI & PDF
  const dailyLogs = [];

  // Loop specific to SELECTED MONTH for reporting (Visual & PDF)
  for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = formatDate(state.currentYear, selectedMonth, d);
      const record = state.records[dateStr];
      const dateObj = new Date(dateStr);
      
      let dailyInfo = {
          d: d,
          dateStr: dateStr,
          dayName: dateObj.toLocaleDateString('id-ID', { weekday: 'short' }),
          isSunday: dateObj.getDay() === 0,
          record: record,
          stats: { net: 0, mealAllowance: 0, kasbon: 0, income: 0, totalPairs: 0, deductions: 0 },
          itemsDetail: '-'
      };
      
      if (record) {
          const stats = calculateDailyStats(record, state.mealCost);
          totalDeductions += stats.deductions;
          totalMealAllowance += stats.mealAllowance;
          totalKasbon += stats.kasbon;
          monthlyNet += stats.net;
          
          dailyInfo.stats = stats;

          // Count items & Build String
          const detailParts: string[] = [];
          Object.entries(record.items).forEach(([itemId, qty]) => {
              const q = qty as number;
              if (q > 0) {
                  itemCounts[itemId] = (itemCounts[itemId] || 0) + q;
                  const item = MENU_ITEMS.find(i => i.id === itemId);
                  if (item) detailParts.push(`${q} ${item.label}`);
              }
          });
          if (detailParts.length > 0) {
              dailyInfo.itemsDetail = detailParts.join(', ');
          }
      }
      dailyLogs.push(dailyInfo);
  }

  // Calculate global projection (using current month state, might be different from selectedMonth if viewing history)
  const currentMonthProjectedPercent = (projection.projectedTotal / state.monthlyTarget) * 100;
  
  // Calculate Take Home based on SELECTED MONTH (for consistency with the table below)
  const monthlyTakeHome = (monthlyNet - totalDeductions - totalKasbon) + totalMealAllowance;

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
    
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("LAPORAN KINERJA TEKNISI", 14, 20);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`PERIODE: ${MONTH_NAMES[selectedMonth].toUpperCase()} ${year}`, 14, 26);
    doc.text(`DICETAK: ${new Date().toLocaleDateString('id-ID')}`, 14, 31);

    let pdfMonthIncome = 0;
    let pdfMonthMeal = 0;
    let pdfMonthDeductions = 0;
    let pdfMonthKasbon = 0;
    let pdfMonthPairs = 0;
    
    // Generate Rows from dailyLogs
    const dailyRows = dailyLogs.map(log => {
        const { d, dayName, record, stats, itemsDetail, isSunday } = log;
        
        if (record) {
            pdfMonthIncome += stats.income;
            pdfMonthMeal += stats.mealAllowance;
            pdfMonthDeductions += stats.deductions;
            pdfMonthKasbon += stats.kasbon;
            pdfMonthPairs += stats.totalPairs;
            
            const status = record.isWorkDay ? 'KERJA' : 'LIBUR';
            return [
                `${d}`, 
                dayName, 
                status,
                itemsDetail, // NEW COLUMN
                stats.totalPairs.toString(), 
                stats.income.toLocaleString('id-ID'), 
                stats.mealAllowance.toLocaleString('id-ID'),
                stats.kasbon > 0 ? `(${stats.kasbon.toLocaleString('id-ID')})` : '-'
            ];
        } else {
            return [
                `${d}`, 
                dayName, 
                isSunday ? 'MINGGU' : '-',
                '-',
                '0', 
                '0', 
                '0', 
                '0'
            ];
        }
    });

    const pdfTakeHome = (pdfMonthIncome - pdfMonthDeductions - pdfMonthKasbon) + pdfMonthMeal;

    // Header Summary
    doc.setDrawColor(0);
    doc.setFillColor(240, 240, 240);
    doc.rect(14, 40, 180, 25, 'F');
    
    doc.setFontSize(9);
    doc.text("TARGET BULANAN", 20, 48);
    doc.text(`Rp ${state.monthlyTarget.toLocaleString('id-ID')}`, 20, 54);
    
    doc.text("OMSET JASA", 60, 48);
    doc.text(`Rp ${pdfMonthIncome.toLocaleString('id-ID')}`, 60, 54);
    
    doc.text("TOTAL KASBON", 100, 48);
    doc.setTextColor(200, 0, 0);
    doc.text(`- Rp ${pdfMonthKasbon.toLocaleString('id-ID')}`, 100, 54);
    doc.setTextColor(0, 0, 0);

    doc.text("TOTAL GAJI (CAIR)", 145, 48);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Rp ${pdfTakeHome.toLocaleString('id-ID')}`, 145, 56);

    // Table 1 Generation
    autoTable(doc, {
      startY: 70,
      head: [['TGL', 'HARI', 'STATUS', 'RINCIAN', 'QTY', 'OMSET (RP)', 'MAKAN', 'KASBON']],
      body: dailyRows,
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255] },
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 8 }, 
        1: { cellWidth: 12 }, 
        2: { cellWidth: 15 },
        3: { cellWidth: 'auto' }, // Rincian takes remaining space
        4: { cellWidth: 10, halign: 'center' }, 
        5: { cellWidth: 25, halign: 'right' },
        6: { cellWidth: 20, halign: 'right' },
        7: { cellWidth: 20, halign: 'right', textColor: [200, 0, 0] }
      },
      foot: [['TOTAL', '', '', '', pdfMonthPairs.toString(), `Rp ${pdfMonthIncome.toLocaleString('id-ID')}`, `Rp ${pdfMonthMeal.toLocaleString('id-ID')}`, `Rp ${pdfMonthKasbon.toLocaleString('id-ID')}`]],
      footStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    // Table 2: Item Breakdown
    const itemRows: any[] = [];
    let totalItemsCount = 0;
    
    // Sort items by count descending
    const sortedItems = MENU_ITEMS
        .map(item => ({ ...item, count: itemCounts[item.id] || 0 }))
        .filter(item => item.count > 0)
        .sort((a, b) => b.count - a.count);

    sortedItems.forEach(item => {
        const totalVal = item.count * item.price;
        totalItemsCount += item.count;
        itemRows.push([
            item.label,
            item.count.toString(),
            `Rp ${item.price.toLocaleString('id-ID')}`,
            `Rp ${totalVal.toLocaleString('id-ID')}`
        ]);
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("RINCIAN ITEM / PRODUCT MIX", 14, finalY);

    autoTable(doc, {
        startY: finalY + 5,
        head: [['NAMA ITEM', 'QTY', 'HARGA', 'TOTAL OMSET']],
        body: itemRows,
        theme: 'striped',
        headStyles: { fillColor: [70, 70, 70] },
        styles: { fontSize: 8 },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 30, halign: 'right' },
            3: { cellWidth: 35, halign: 'right' }
        },
        foot: [['TOTAL PRODUKSI', totalItemsCount.toString(), '', '']],
        footStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    doc.save(`Laporan_IQSHOE_${MONTH_NAMES[selectedMonth]}_${year}.pdf`);
    setIsGenerating(false);
  };

  const getBrutalMessage = () => {
    if (currentMonthProjectedPercent < 80) return "PERFORMA MENYEDIHKAN. TARGET GAJI SANGAT JAUH.";
    if (currentMonthProjectedPercent < 100) return "KERJA LEBIH KERAS. BONUS AKHIR BULAN TERANCAM.";
    return "PERTAHANKAN KECEPATAN INI. FOKUS KUALITAS.";
  };

  // Prepare Breakdown List for UI
  const breakdownList = MENU_ITEMS
    .map(item => ({ ...item, count: itemCounts[item.id] || 0 }))
    .filter(item => item.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <div className="p-4 md:p-8 bg-industrial-900 min-h-screen pb-20 w-full">
       <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-2">
          <h2 className="text-2xl font-bold uppercase tracking-widest">Evaluasi Keras</h2>
          <div className="flex gap-2">
              <button 
                onClick={handleExportData}
                className="text-[10px] font-bold bg-industrial-700 hover:bg-industrial-600 px-3 py-1 rounded uppercase"
              >
                Backup
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="text-[10px] font-bold bg-industrial-700 hover:bg-industrial-600 px-3 py-1 rounded uppercase"
              >
                Impor
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
                {isGenerating ? 'Memproses...' : 'Unduh'}
            </button>
            </div>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-industrial-800 p-6 rounded border-l-8 border-blue-500">
           <div className="flex flex-col justify-between h-full">
               <div className="mb-4">
                   <div className="text-sm font-bold text-gray-400 uppercase">Total Omset Bulan {MONTH_NAMES[selectedMonth]}</div>
                   <div className="text-3xl font-mono text-white mt-1">Rp{monthlyNet.toLocaleString('id-ID')}</div>
               </div>
               <div className="pt-4 border-t border-gray-700">
                   <div className="text-xs font-bold text-green-400 uppercase">Tunjangan Makan (+)</div>
                   <div className="text-xl font-mono text-green-400">+Rp{totalMealAllowance.toLocaleString('id-ID')}</div>
               </div>
           </div>
        </div>

        <div className="bg-slate-800 p-6 rounded border border-slate-600 flex flex-col justify-center">
           <div className="text-sm font-bold text-blue-300 uppercase mb-2">Gaji Cair (Bulan {MONTH_NAMES[selectedMonth]})</div>
           <div className="text-4xl font-mono font-bold text-white">Rp{monthlyTakeHome.toLocaleString('id-ID')}</div>
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

      {/* ITEM BREAKDOWN SECTION */}
      <div className="mb-8">
          <h3 className="text-lg font-bold text-white uppercase border-b border-gray-700 pb-2 mb-4">
              Breakdown Produksi ({MONTH_NAMES[selectedMonth]})
          </h3>
          
          {breakdownList.length === 0 ? (
              <div className="text-gray-500 italic p-4 bg-black/20 rounded">Belum ada data pekerjaan bulan ini.</div>
          ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {breakdownList.map(item => (
                      <div key={item.id} className={`p-3 rounded border-l-4 ${COLOR_MAP[item.category]} bg-gray-900 shadow-lg relative overflow-hidden`}>
                           <div className="flex justify-between items-start z-10 relative">
                               <div>
                                   <div className="text-xs font-bold text-gray-400 uppercase mb-1">{item.category}</div>
                                   <div className="text-sm font-bold text-white uppercase leading-tight">{item.label}</div>
                               </div>
                               <div className="text-2xl font-mono font-bold text-white">{item.count}</div>
                           </div>
                           <div className="mt-3 pt-2 border-t border-gray-800 flex justify-between items-center z-10 relative">
                               <span className="text-[10px] text-gray-500">Total Omset</span>
                               <span className="text-sm font-mono font-bold text-gray-300">
                                   Rp{(item.count * item.price).toLocaleString('id-ID')}
                               </span>
                           </div>
                      </div>
                  ))}
              </div>
          )}
      </div>

      {/* DAILY LOG TABLE (UI) */}
      <div className="mb-8">
          <h3 className="text-lg font-bold text-white uppercase border-b border-gray-700 pb-2 mb-4">
              Log Harian Detail
          </h3>
          <div className="overflow-x-auto bg-black border border-gray-800 rounded">
              <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-industrial-800 text-gray-400 font-bold uppercase text-xs">
                      <tr>
                          <th className="p-3">Tgl</th>
                          <th className="p-3">Hari</th>
                          <th className="p-3">Rincian Item</th>
                          <th className="p-3 text-right">Omset</th>
                          <th className="p-3 text-right text-red-500">Kasbon</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                      {dailyLogs.map((log) => {
                          if (!log.record && !log.isSunday) return null; // Hide empty future days if needed, but showing history is better
                          
                          // Only show rows that exist or are Sundays in the past
                          const isFuture = new Date(log.dateStr) > new Date();
                          if (!log.record && isFuture) return null;

                          return (
                              <tr key={log.d} className={`hover:bg-white/5 ${!log.record ? 'opacity-50' : ''}`}>
                                  <td className="p-3 font-mono">{log.d}</td>
                                  <td className="p-3 text-gray-400 text-xs uppercase">{log.dayName}</td>
                                  <td className="p-3 text-white font-medium">
                                      {log.record?.isWorkDay 
                                        ? (log.itemsDetail === '-' ? <span className="text-gray-600 italic">Tidak ada item</span> : log.itemsDetail) 
                                        : (log.isSunday ? <span className="text-red-900 font-bold">MINGGU</span> : <span className="text-gray-600">LIBUR</span>)
                                      }
                                  </td>
                                  <td className="p-3 text-right font-mono text-green-400">
                                      {log.stats.net > 0 ? `Rp${log.stats.net.toLocaleString('id-ID')}` : '-'}
                                  </td>
                                  <td className="p-3 text-right font-mono text-red-500">
                                      {log.stats.kasbon > 0 ? `(${log.stats.kasbon.toLocaleString('id-ID')})` : '-'}
                                  </td>
                              </tr>
                          );
                      })}
                  </tbody>
              </table>
          </div>
      </div>
        
      <div className="p-6 bg-red-900/30 border-2 border-red-600 text-center rounded">
            <h3 className="text-red-500 font-bold uppercase text-2xl mb-4 tracking-widest">VONIS SISTEM</h3>
            <p className="text-white font-mono text-lg leading-relaxed">"{getBrutalMessage()}"</p>
      </div>
    </div>
  );
};

export default Evaluator;