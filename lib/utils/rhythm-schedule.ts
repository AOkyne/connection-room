// Calculate when each month of the guided rhythm begins

export function calculateRhythmMonthDates() {
  const today = new Date();
  const currentYear = today.getFullYear();

  // Rhythm months cycle through calendar months: Jan-June, July-Dec, Jan-June, etc.
  // Month 1 = Jan/July, Month 2 = Feb/Aug, Month 3 = Mar/Sep, Month 4 = Apr/Oct, Month 5 = May/Nov, Month 6 = Jun/Dec

  const rhythmMonthToCalendarMonth: Record<number, number[]> = {
    1: [0, 6],      // January, July
    2: [1, 7],      // February, August
    3: [2, 8],      // March, September
    4: [3, 9],      // April, October
    5: [4, 10],     // May, November
    6: [5, 11],     // June, December
  };

  const upcomingMonths: Array<{
    rhythmMonth: number;
    date: Date;
    daysUntil: number;
    isImmediate: boolean;
  }> = [];

  // Check next 12 months for month 5 occurrences
  for (let i = 0; i < 12; i++) {
    const checkDate = new Date(today);
    checkDate.setMonth(checkDate.getMonth() + i);
    const checkMonth = checkDate.getMonth();

    // Find which rhythm month corresponds to this calendar month
    for (const [rhythmMonth, calendarMonths] of Object.entries(rhythmMonthToCalendarMonth)) {
      if (calendarMonths.includes(checkMonth)) {
        const rhythmNum = parseInt(rhythmMonth);

        // Only collect month 5
        if (rhythmNum === 5) {
          const firstDayOfMonth = new Date(checkDate.getFullYear(), checkMonth, 1);
          const daysUntil = Math.ceil((firstDayOfMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          upcomingMonths.push({
            rhythmMonth: rhythmNum,
            date: firstDayOfMonth,
            daysUntil,
            isImmediate: daysUntil <= 14 && daysUntil > 0, // Alert within 2 weeks
          });
          break;
        }
      }
    }
  }

  return upcomingMonths.sort((a, b) => a.daysUntil - b.daysUntil);
}

export function getNextMonth5Alert() {
  const upcoming = calculateRhythmMonthDates();
  const nextMonth5 = upcoming.find(m => m.daysUntil > 0);

  if (!nextMonth5) return null;

  return {
    rhythmMonth: 5,
    startDate: nextMonth5.date,
    daysUntil: nextMonth5.daysUntil,
    isAlert: nextMonth5.isImmediate,
    formattedDate: nextMonth5.date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
  };
}

export function shouldShowMonth5Alert() {
  const alert = getNextMonth5Alert();
  if (!alert) return false;

  // Show alert if month 5 starts within the next 2 weeks
  return alert.daysUntil <= 14 && alert.daysUntil > 0;
}
