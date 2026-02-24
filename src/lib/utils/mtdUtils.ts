import { startOfMonth, subMonths, getDate, getDaysInMonth, isValid } from "date-fns";

/**
 * Takes an array of raw data and a designated date column name,
 * and splits it cleanly into Current MTD and exact Last Month Same Date Equivalent arrays.
 */
export function getMTDDataset(rawData: any[], dateColumnName: string) {
    if (!rawData || rawData.length === 0) {
        return { currentMtdData: [], lastMtdData: [] };
    }

    const today = new Date();
    const currentMonthStart = startOfMonth(today);

    const lastMonthStart = startOfMonth(subMonths(today, 1));
    const currentDayNum = Math.max(1, getDate(today)); // e.g. 18
    const daysInLastMonth = getDaysInMonth(lastMonthStart);

    // If today is Mar 31, but Feb only has 28 days, cutoff is 28.
    const lastMonthCutoffDay = Math.min(currentDayNum, daysInLastMonth);

    const currentMtdData: any[] = [];
    const lastMtdData: any[] = [];

    rawData.forEach(row => {
        const dateStr = row[dateColumnName];
        if (!dateStr) return;

        const txDate = new Date(dateStr);
        if (!isValid(txDate)) return;

        // Current MTD
        if (txDate >= currentMonthStart && txDate <= today) {
            currentMtdData.push(row);
        }
        // Last Month equivalent
        else if (
            txDate >= lastMonthStart &&
            txDate.getMonth() === lastMonthStart.getMonth() &&
            getDate(txDate) <= lastMonthCutoffDay
        ) {
            lastMtdData.push(row);
        }
    });

    return { currentMtdData, lastMtdData };
}

/**
 * Generic helper to calculate the % change between two numbers
 */
export function calculateMTDTrend(currentValue: number, lastValue: number): number {
    if (lastValue === 0) return 0;
    return ((currentValue - lastValue) / lastValue) * 100;
}
