import React from 'react';

interface WarningProps {
  totalNet: number;
  totalPairs: number;
  premiumCount: number;
  consecutiveLoss: boolean;
  isWorkDay: boolean;
  target: number;
}

const WarningSystem: React.FC<WarningProps> = ({ 
  totalNet, totalPairs, premiumCount, consecutiveLoss, isWorkDay, target 
}) => {
  if (!isWorkDay) return null;

  const messages: string[] = [];

  // Rules from prompt
  if (totalNet < 150000) {
    messages.push("HARI GAGAL. Target bulan makin berat.");
  }

  if (premiumCount >= 4 && totalPairs < 14) {
    messages.push("Kamu berhenti terlalu cepat. GENJOT KUANTITAS.");
  }

  if (consecutiveLoss) {
    messages.push("Pola kerja ini akan GAGAL.");
  }

  // Real-time comparison
  const deficit = target - totalNet;
  if (deficit > 0) {
     messages.push(`KURANG Rp${deficit.toLocaleString('id-ID')} UNTUK SELAMAT HARI INI.`);
  }

  if (messages.length === 0) return null;

  return (
    <div className="bg-industrial-alert border-y-4 border-yellow-400 p-4 mb-4 animate-pulse">
      <h3 className="text-yellow-400 font-bold uppercase tracking-widest text-sm mb-2">PERINGATAN SISTEM:</h3>
      <ul className="list-disc list-inside space-y-1">
        {messages.map((msg, idx) => (
          <li key={idx} className="text-white font-bold uppercase text-sm md:text-base font-mono">
            {msg}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default WarningSystem;