import { DEFAULT_TASKS, TASKS_PER_BRUSHING } from '../types';
import type { TaskConfig, TaskDefinition, TaskTime } from '../types';

const BOTH: TaskTime[] = ['morning', 'night'];

/**
 * Merge a child's saved task config with the current defaults. Text, labels and
 * emoji always come from DEFAULT_TASKS (so renames reach saved configs), new
 * default tasks show up, and the parent's enabled/times choices are kept.
 */
export function resolveTaskConfig(saved: TaskConfig | null | undefined): TaskConfig {
  const savedById = new Map((saved?.tasks ?? []).map((t) => [t.id, t]));
  const tasks: TaskDefinition[] = DEFAULT_TASKS.map((def) => {
    const s = savedById.get(def.id);
    const times = s?.times?.length ? s.times : def.times ?? BOTH;
    return { ...def, enabled: s ? s.enabled : def.enabled, times };
  });
  return { enabled: saved?.enabled ?? true, tasks };
}

/** Morning before 3pm, night after. */
export function currentTaskTime(now: Date = new Date()): TaskTime {
  return now.getHours() < 15 ? 'morning' : 'night';
}

/** Up to TASKS_PER_BRUSHING random enabled tasks that fit this brushing's time of day. */
export function pickTasksForBrushing(config: TaskConfig, now: Date = new Date()): TaskDefinition[] {
  if (!config.enabled) return [];
  const time = currentTaskTime(now);
  const pool = config.tasks.filter((t) => t.enabled && (t.times ?? BOTH).includes(time));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, TASKS_PER_BRUSHING);
}
