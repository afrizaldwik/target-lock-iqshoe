import { AppState, DailyRecord, DailyStats } from './types.ts';
import { MENU_ITEMS } from './constants.ts';

export const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

export const formatDate = (year: number, month: number, day: number) => {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

export const isSunday = (dateStr: string) => {
  return new Date(dateStr).getDay() === 0;
};

export const calculateDailyStats = (record: DailyRecord | undefined, mealCost: number): DailyStats => {
  if (!record) {
    return { income: 0, deductions: 0, net: 0, totalPairs: 0, premiumCount: 0, mealAllowance: 0, kasbon: 0 };
  }

  let income = 0;
  let totalPairs = 0;
  let premiumCount = 0;
  let mealAllowance = record.isWorkDay ? mealCost : 0;
  let kasbon = record.kasbon || 0;

  Object.entries(record.items).forEach(([itemId, count]) => {
    const item = MENU_ITEMS.find(i => i.id === itemId);
    if (item && count > 0) {
      income += item.price * count;
      if (item.category !== 'OPERATIONAL') totalPairs += count;
      if (['BLUE', 'PURPLE', 'WHITE'].includes(item.category)) {
         if (item.id.includes('premium') || item.price >= 15000) premiumCount += count;
      }
    }
  });

  return {
    income,
    deductions: 0,
    net: income,
    totalPairs,
    premiumCount,
    mealAllowance,
    kasbon
  };
};

export const calculateTargetProjection = (state: AppState) => {
  const daysInMonth = getDaysInMonth(state.currentYear, state.currentMonth);
  let totalNetIncome = 0;
  let daysPassed = 0;
  let workDaysRemaining = 0;
  let today = new Date();
  const todayStr = formatDate(today.getFullYear(), today.getMonth(), today.getDate());
  
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = formatDate(state.currentYear, state.currentMonth, d);
    const isPastOrToday = dateStr <= todayStr;
    const isFuture = dateStr > todayStr;
    const record = state.records[dateStr];
    
    let isWorkDay = record ? record.isWorkDay : !isSunday(dateStr);

    if (isPastOrToday) {
      const stats = calculateDailyStats(record, state.mealCost);
      totalNetIncome += stats.net;
      daysPassed++;
    }
    if (isFuture && isWorkDay) workDaysRemaining++;
  }

  return {
    totalNetIncome,
    workDaysRemaining, 
    projectedTotal: totalNetIncome + (workDaysRemaining > 0 ? (totalNetIncome / Math.max(1, daysPassed)) * workDaysRemaining : 0)
  };
};

export const getStrictDailyTarget = (state: AppState, targetDateStr: string): number => {
  const daysInMonth = getDaysInMonth(state.currentYear, state.currentMonth);
  let incomePriorToDate = 0;
  let workDaysRemainingInclusive = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = formatDate(state.currentYear, state.currentMonth, d);
    const record = state.records[dStr];
    let isWorkDay = record ? record.isWorkDay : !isSunday(dStr);

    if (dStr < targetDateStr) {
       const stats = calculateDailyStats(record, state.mealCost);
       incomePriorToDate += stats.net;
    }
    if (dStr >= targetDateStr && isWorkDay) workDaysRemainingInclusive++;
  }

  const remainingNeeded = state.monthlyTarget - incomePriorToDate;
  if (workDaysRemainingInclusive <= 0) return remainingNeeded;
  return Math.max(0, Math.ceil(remainingNeeded / workDaysRemainingInclusive));
};