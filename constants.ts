import { MenuItem } from './types';

export const MENU_ITEMS: MenuItem[] = [
  // 🟨 Rp10.000
  { id: 'basic_cleaning', label: 'Basic Cleaning', price: 10000, category: 'YELLOW' },
  { id: 'special_white_basic', label: 'Sp. White Basic', price: 10000, category: 'YELLOW' },
  { id: 'topi', label: 'Topi', price: 10000, category: 'YELLOW' },
  { id: 'unyellowing', label: 'Unyellowing', price: 10000, category: 'YELLOW' },

  // 🟧 Rp13.000
  { id: 'leather_care', label: 'Leather Care', price: 13000, category: 'ORANGE' },
  { id: 'tas', label: 'Tas', price: 13000, category: 'ORANGE' },
  { id: 'extra_hard', label: 'Ekstra Hard', price: 13000, category: 'ORANGE' },
  { id: 'jaket', label: 'Jaket', price: 13000, category: 'ORANGE' },

  // 🟥 Rp12.000
  { id: 'reguler_cleaning', label: 'Reguler Cleaning', price: 12000, category: 'RED' },
  { id: 'sw_reguler', label: 'SW Reguler', price: 12000, category: 'RED' },

  // ⬜ Rp25.000
  { id: 'wearpack', label: 'Wearpack', price: 25000, category: 'WHITE' },
  { id: 'stroller', label: 'Stroller', price: 25000, category: 'WHITE' },

  // 🟦 Rp15.000
  { id: 'premium_cleaning', label: 'Premium Cleaning', price: 15000, category: 'BLUE' },
  { id: 'sw_premium', label: 'SW Premium', price: 15000, category: 'BLUE' },
  { id: 'koper', label: 'Koper XXL', price: 15000, category: 'BLUE' },

  // 🟪 Rp20.000
  { id: 'boots_hard', label: 'Boots Hard', price: 20000, category: 'PURPLE' },
  { id: 'boots_trail', label: 'Boots Trail/Balap', price: 20000, category: 'PURPLE' },

  // 🩷 OPERASIONAL (Penambah Income)
  { id: 'lembur', label: 'Lembur', price: 15000, category: 'OPERATIONAL' },
  { id: 'shift_2', label: 'Jaga 2 Shift', price: 15000, category: 'OPERATIONAL' },
  { id: 'antar_jemput', label: 'Antar Jemput', price: 12000, category: 'OPERATIONAL' },
];

export const COLOR_MAP = {
  YELLOW: 'bg-yellow-500 text-black border-yellow-600',
  ORANGE: 'bg-orange-500 text-black border-orange-600',
  RED: 'bg-red-500 text-black border-red-600',
  WHITE: 'bg-cyan-600 text-white border-cyan-800', // Changed to Industrial Cyan
  BLUE: 'bg-blue-600 text-white border-blue-800',
  PURPLE: 'bg-purple-600 text-white border-purple-800',
  OPERATIONAL: 'bg-pink-600 text-white border-pink-800',
};

export const DEFAULT_TARGET = 5000000;
export const DEFAULT_MEAL_COST = 15000;