export type ItemCategory = 'YELLOW' | 'ORANGE' | 'RED' | 'WHITE' | 'BLUE' | 'PURPLE' | 'OPERATIONAL';

export interface MenuItem {
  id: string;
  label: string;
  price: number;
  category: ItemCategory;
  isDeduction?: boolean;
}

export interface DailyRecord {
  date: string;
  isWorkDay: boolean;
  items: Record<string, number>;
  kasbon: number; // Baru: Nominal pinjaman/kasbon per hari
  manualDeductions: {
    meal: boolean;
  };
  notes?: string;
}

export interface AppState {
  monthlyTarget: number;
  mealCost: number;
  currentYear: number;
  currentMonth: number;
  records: Record<string, DailyRecord>;
}

export interface DailyStats {
  income: number;
  deductions: number;
  net: number;
  totalPairs: number;
  premiumCount: number;
  mealAllowance: number;
  kasbon: number; // Baru: Untuk summary
}