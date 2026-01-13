const BASE_POINTS = 10;
const STREAK_BONUS_MULTIPLIER = 2;
const STORY_ARC_COMPLETION_BONUS = 25;
const FIRST_BRUSH_BONUS = 5;
const SECOND_BRUSH_BONUS = 5;

export interface PointsBreakdown {
  base: number;
  streakBonus: number;
  storyArcBonus: number;
  timeBonuses: number;
  total: number;
}

export const calculateSessionPoints = (
  currentStreak: number,
  completedStoryArc: boolean = false,
  isFirstBrushOfDay: boolean = false,
  isSecondBrushOfDay: boolean = false
): PointsBreakdown => {
  const base = BASE_POINTS;
  const streakBonus = currentStreak * STREAK_BONUS_MULTIPLIER;
  const storyArcBonus = completedStoryArc ? STORY_ARC_COMPLETION_BONUS : 0;

  let timeBonuses = 0;
  if (isFirstBrushOfDay) timeBonuses += FIRST_BRUSH_BONUS;
  if (isSecondBrushOfDay) timeBonuses += SECOND_BRUSH_BONUS;

  const total = base + streakBonus + storyArcBonus + timeBonuses;

  return {
    base,
    streakBonus,
    storyArcBonus,
    timeBonuses,
    total,
  };
};

export const formatPoints = (points: number): string => {
  return points.toLocaleString();
};
