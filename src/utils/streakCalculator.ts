// Streaks are tracked by local calendar day (YYYY-MM-DD in the device's
// timezone), so an evening brush in the US does not count as "tomorrow".

export const getDateString = (date: Date = new Date()): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Accepts the plain YYYY-MM-DD form the app stores, and tolerates an ISO
// timestamp from older records by keeping only the date part.
const normalizeDate = (dateString: string | null): string | null => {
  if (!dateString) return null;
  return dateString.slice(0, 10);
};

export const isToday = (dateString: string | null): boolean => {
  const d = normalizeDate(dateString);
  return d !== null && d === getDateString();
};

export const isYesterday = (dateString: string | null): boolean => {
  const d = normalizeDate(dateString);
  if (!d) return false;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return d === getDateString(yesterday);
};

export const calculateStreak = (
  lastBrushDate: string | null,
  currentStreak: number
): { newStreak: number; streakBroken: boolean } => {
  // If already brushed today, streak stays the same
  if (isToday(lastBrushDate)) {
    return { newStreak: currentStreak, streakBroken: false };
  }

  // If brushed yesterday, continue the streak
  if (isYesterday(lastBrushDate)) {
    return { newStreak: currentStreak + 1, streakBroken: false };
  }

  // If never brushed or missed more than a day, start new streak
  return { newStreak: 1, streakBroken: currentStreak > 0 };
};

export const getStreakMilestone = (streak: number): string | null => {
  if (streak === 7) return '1 Week Streak!';
  if (streak === 14) return '2 Week Streak!';
  if (streak === 30) return '1 Month Streak!';
  if (streak === 60) return '2 Month Streak!';
  if (streak === 100) return '100 Day Streak!';
  if (streak === 365) return '1 Year Streak!';
  return null;
};

export const getStreakLevel = (streak: number): 'low' | 'medium' | 'high' | 'fire' => {
  if (streak >= 30) return 'fire';
  if (streak >= 14) return 'high';
  if (streak >= 7) return 'medium';
  return 'low';
};
