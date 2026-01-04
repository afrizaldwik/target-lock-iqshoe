export type ItemCategory = 'YELLOW' | 'ORANGE' | 'RED' | 'WHITE' | 'BLUE' | 'PURPLE' | 'OPERATIONAL';

export interface MenuItem {
  id: string;
  label: string;
  price: number;
  category: ItemCategory;
  isDeduction?: boolean; // For operational costs
}

export interface DailyRecord {
  date: string; // ISO Date YYYY-MM-DD
  isWorkDay: boolean;
  items: Record<string, number>; // itemId -> count
  manualDeductions: {
    meal: boolean; // kept for legacy state compatibility, but logic changes to allowance
  };
  notes?: string;
}

export interface AppState {
  monthlyTarget: number;
  mealCost: number;
  currentYear: number;
  currentMonth: number; // 0-11
  records: Record<string, DailyRecord>; // date -> record
}

export interface DailyStats {
  income: number;
  deductions: number;
  net: number;
  totalPairs: number;
  premiumCount: number;
  mealAllowance: number; // Added: Tunjangan makan
}