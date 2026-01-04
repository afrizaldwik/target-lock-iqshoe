import { AppState, DailyRecord, DailyStats } from './types';
import { MENU_ITEMS } from './constants';

export const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

export const formatDate = (year: number, month: number, day: number) => {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

export const isSunday = (dateStr: string) => {
  return new Date(dateStr).getDay() === 0;
};

export const calculateDailyStats = (record: DailyRecord | undefined, mealCost: number): DailyStats => {
  if (!record || !record.isWorkDay) {
    return { income: 0, deductions: 0, net: 0, totalPairs: 0, premiumCount: 0, mealAllowance: 0 };
  }

  let income = 0;
  let deductions = 0;
  let totalPairs = 0;
  let premiumCount = 0;
  let mealAllowance = 0;

  // REVISI LOGIKA:
  // Jika Masuk Kerja (isWorkDay) -> Dapat Uang Makan (Tunjangan)
  if (record.isWorkDay) {
    mealAllowance = mealCost;
  }

  // Items
  Object.entries(record.items).forEach(([itemId, count]) => {
    const item = MENU_ITEMS.find(i => i.id === itemId);
    if (item && count > 0) {
      income += item.price * count;
      
      if (item.category !== 'OPERATIONAL') {
        totalPairs += count;
      }
      
      if (item.category === 'BLUE' || item.category === 'PURPLE' || item.category === 'WHITE') {
         // Assuming "Premium" refers to higher tier items for the warning logic
         if (item.id.includes('premium') || item.price >= 15000) {
             premiumCount += count;
         }
      }
    }
  });

  return {
    income,
    deductions,
    net: income, // Performa dinilai dari Gross Work (Target 5jt murni jasa)
    totalPairs,
    premiumCount,
    mealAllowance // Uang makan terpisah, masuk ke Take Home Pay
  };
};

export const calculateTargetProjection = (state: AppState) => {
  const daysInMonth = getDaysInMonth(state.currentYear, state.currentMonth);
  let totalNetIncome = 0;
  let daysPassed = 0;
  let workDaysRemaining = 0;
  let today = new Date();
  today.setFullYear(state.currentYear); // Sync system today with App's current year (e.g. 2026)
  
  // Normalize today to start of day for comparison
  const todayStr = formatDate(today.getFullYear(), today.getMonth(), today.getDate());
  
  // Logic: Calculate accumulated income and remaining effective days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = formatDate(state.currentYear, state.currentMonth, d);
    const isPastOrToday = dateStr <= todayStr;
    const isFuture = dateStr > todayStr;
    
    // Check record or default
    const record = state.records[dateStr];
    const isDefaultSunday = isSunday(dateStr);
    
    // Determine if it's a workday
    let isWorkDay = true;
    if (record) {
      isWorkDay = record.isWorkDay;
    } else {
      isWorkDay = !isDefaultSunday;
    }

    if (isPastOrToday) {
      const stats = calculateDailyStats(record, state.mealCost);
      totalNetIncome += stats.net;
      daysPassed++;
    }

    if (isFuture && isWorkDay) {
      workDaysRemaining++;
    }
    
    // Edge case: if it is today, and we are working, we count today as a day to earn, 
    // but the target calculation usually spreads REMAINING needed over REMAINING days (incl today).
  }

  const deficit = state.monthlyTarget - totalNetIncome;
  
  return {
    totalNetIncome,
    deficit: Math.max(0, deficit), // Deficit strictly for math
    rawDeficit: deficit, // Can be negative if we are over target
    workDaysRemaining, 
    projectedTotal: totalNetIncome + (workDaysRemaining > 0 ? (totalNetIncome / Math.max(1, daysPassed)) * workDaysRemaining : 0)
  };
};

// Strict logic: Target for TODAY based on "Target Total" minus "Income until Yesterday" divided by "Days Left including Today"
export const getStrictDailyTarget = (state: AppState, targetDateStr: string): number => {
  const daysInMonth = getDaysInMonth(state.currentYear, state.currentMonth);
  let incomePriorToDate = 0;
  let workDaysRemainingInclusive = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = formatDate(state.currentYear, state.currentMonth, d);
    
    const record = state.records[dStr];
    const isDefaultSunday = isSunday(dStr);
    let isWorkDay = record ? record.isWorkDay : !isDefaultSunday;

    if (dStr < targetDateStr) {
       const stats = calculateDailyStats(record, state.mealCost);
       incomePriorToDate += stats.net;
    }

    if (dStr >= targetDateStr && isWorkDay) {
      workDaysRemainingInclusive++;
    }
  }

  const remainingNeeded = state.monthlyTarget - incomePriorToDate;
  
  if (workDaysRemainingInclusive <= 0) return remainingNeeded; // Should create massive number if 0 days left
  
  // If we are already over target, strict target is 0? Or keep pushing? 
  // Manager Keras says: "Target mati". If over target, ensure we maintain.
  // But strictly math:
  return Math.max(0, Math.ceil(remainingNeeded / workDaysRemainingInclusive));
};