// Aggregate recent history entries into daily stats to supplement outdated stats-cache

import { HistoryEntry, DailyActivity, StatsCache } from '../types/claude-data.js';

/**
 * Convert Date to local YYYY-MM-DD string
 */
function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Aggregate history entries into daily activity stats
 */
export function aggregateHistoryByDay(
  entries: HistoryEntry[],
  fromDate: Date
): DailyActivity[] {
  const dailyMap = new Map<string, DailyActivity>();
  const sessionsByDay = new Map<string, Set<string>>();

  for (const entry of entries) {
    const entryDate = new Date(entry.timestamp);

    // Skip entries before the fromDate
    if (entryDate < fromDate) {
      continue;
    }

    const dateStr = toLocalDateString(entryDate); // Use local time, not UTC

    // Initialize day stats if not exists
    if (!dailyMap.has(dateStr)) {
      dailyMap.set(dateStr, {
        date: dateStr,
        messageCount: 0,
        sessionCount: 0,
        toolCallCount: 0,
      });
      sessionsByDay.set(dateStr, new Set());
    }

    const dayStats = dailyMap.get(dateStr)!;
    const sessions = sessionsByDay.get(dateStr)!;

    // Increment message count
    dayStats.messageCount++;

    // Track unique sessions
    sessions.add(entry.sessionId);
  }

  // Update session counts
  for (const [dateStr, sessions] of sessionsByDay.entries()) {
    const dayStats = dailyMap.get(dateStr)!;
    dayStats.sessionCount = sessions.size;
  }

  // Sort by date and return
  return Array.from(dailyMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
}

/**
 * Merge new daily stats with existing stats-cache data
 */
export function mergeWithStatsCache(
  statsCache: StatsCache,
  newDailyStats: DailyActivity[]
): StatsCache {
  // Create a copy of the stats cache
  const merged: StatsCache = {
    ...statsCache,
    dailyActivity: [...statsCache.dailyActivity],
    dailyModelTokens: statsCache.dailyModelTokens ? [...statsCache.dailyModelTokens] : [],
  };

  // Create a map of existing dates for easy lookup
  const existingDates = new Set(
    statsCache.dailyActivity.map(activity => activity.date)
  );

  // Add new daily stats that don't exist in the cache
  for (const newDay of newDailyStats) {
    if (!existingDates.has(newDay.date)) {
      merged.dailyActivity.push(newDay);
    }
  }

  // Sort by date
  merged.dailyActivity.sort((a, b) => a.date.localeCompare(b.date));

  // Update lastComputedDate to the latest date
  if (merged.dailyActivity.length > 0) {
    const latestDate = merged.dailyActivity[merged.dailyActivity.length - 1].date;
    merged.lastComputedDate = latestDate;
  }

  // Update total messages based on all daily activity
  merged.totalMessages = merged.dailyActivity.reduce(
    (sum, day) => sum + day.messageCount,
    0
  );

  // Update total sessions (approximate by taking max of dailyActivity session counts)
  // This is an approximation since sessions can span multiple days
  const uniqueSessionsApprox = Math.max(
    merged.totalSessions || 0,
    merged.dailyActivity.reduce((sum, day) => sum + day.sessionCount, 0)
  );
  merged.totalSessions = uniqueSessionsApprox;

  return merged;
}

/**
 * Check if stats-cache needs updating based on lastComputedDate
 */
export function needsUpdate(statsCache: StatsCache): boolean {
  const lastComputed = new Date(statsCache.lastComputedDate);
  const today = new Date();

  // Reset time to midnight for comparison
  lastComputed.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return lastComputed < today;
}

/**
 * Get the date from which to start aggregating history entries
 */
export function getAggregationStartDate(statsCache: StatsCache): Date {
  const lastComputed = new Date(statsCache.lastComputedDate);
  // Start from the day after lastComputedDate
  lastComputed.setDate(lastComputed.getDate() + 1);
  lastComputed.setHours(0, 0, 0, 0);
  return lastComputed;
}
