export const getDateString = (date: Date = new Date()): string => {
  return date.toISOString().split('T')[0];
};

export const isToday = (dateString: string | null): boolean => {
  if (!dateString) return false;
  return dateString === getDateString();
};

export const isYesterday = (dateString: string | null): boolean => {
  if (!dateString) return false;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return dateString === getDateString(yesterday);
};

export const calculateStreak = (
  lastBrushDate: string | null,
  currentStreak: number
): { newStreak: number; streakBroken: boolean } => {
  const today = getDateString();

  // If already brushed today, streak stays the same
  if (lastBrushDate === today) {
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
