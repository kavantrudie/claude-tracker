// Aggregate and transform Claude Code data into useful statistics

import { ClaudeData, AggregatedStats, ModelUsage } from '../types/claude-data.js';
import { calculateTotalCost, loadPricing, getPricing, calculateModelCost } from './cost-calculator.js';

export async function aggregateStats(data: Partial<ClaudeData>): Promise<AggregatedStats> {
  const pricingConfig = await loadPricing();

  // Initialize aggregated stats
  const stats: AggregatedStats = {
    summary: {
      totalSessions: 0,
      totalMessages: 0,
      totalToolCalls: 0,
      totalCost: 0,
      cacheSavings: 0,
      dateRange: { from: new Date(), to: new Date() },
    },
    modelBreakdown: new Map(),
    projectBreakdown: new Map(),
    dailyStats: [],
    sessions: [],
  };

  // Process stats-cache data
  if (data.statsCache) {
    const { modelUsage, dailyActivity, dailyModelTokens, totalSessions, totalMessages } = data.statsCache;

    // Summary stats
    stats.summary.totalSessions = totalSessions || 0;
    stats.summary.totalMessages = totalMessages || 0;

    // Calculate costs for each model
    const costSummary = await calculateTotalCost(modelUsage);
    stats.summary.totalCost = costSummary.totalCost;
    stats.summary.cacheSavings = costSummary.totalCacheSavings;

    // Model breakdown
    for (const breakdown of costSummary.modelBreakdowns) {
      stats.modelBreakdown.set(breakdown.modelId, {
        name: breakdown.modelName,
        inputTokens: breakdown.inputTokens,
        outputTokens: breakdown.outputTokens,
        cacheReadTokens: breakdown.cacheReadTokens,
        cacheCreationTokens: breakdown.cacheCreationTokens,
        cost: breakdown.totalCost,
        cacheSavings: breakdown.cacheSavings,
      });
    }

    // Daily stats
    if (dailyActivity && dailyActivity.length > 0) {
      // Set date range from first and last day
      stats.summary.dateRange.from = new Date(dailyActivity[0].date);
      stats.summary.dateRange.to = new Date(dailyActivity[dailyActivity.length - 1].date);

      // Create a map of date to tokens for easier lookup
      const tokensByDate = new Map<string, Record<string, number>>();
      if (dailyModelTokens) {
        for (const dayTokens of dailyModelTokens) {
          tokensByDate.set(dayTokens.date, dayTokens.tokensByModel);
        }
      }

      for (const activity of dailyActivity) {
        const tokenUsage = tokensByDate.get(activity.date) || {};

        // Calculate cost for this day - estimate based on total tokens and overall model usage
        let dayCost = 0;
        const tokensByModel = new Map<string, number>();

        for (const [modelId, totalTokens] of Object.entries(tokenUsage)) {
          tokensByModel.set(modelId, totalTokens);

          // Estimate cost based on proportional token usage
          const modelStats = modelUsage[modelId];
          if (modelStats) {
            const totalModelTokens = modelStats.inputTokens + modelStats.outputTokens;
            if (totalModelTokens > 0) {
              const proportion = totalTokens / totalModelTokens;
              const modelCostBreakdown = costSummary.modelBreakdowns.find(b => b.modelId === modelId);
              if (modelCostBreakdown) {
                dayCost += modelCostBreakdown.totalCost * proportion;
              }
            }
          }
        }

        stats.dailyStats.push({
          date: activity.date,
          messageCount: activity.messageCount || 0,
          sessionCount: activity.sessionCount || 0,
          toolCallCount: activity.toolCallCount || 0,
          cost: dayCost,
          tokensByModel,
        });

        stats.summary.totalToolCalls += activity.toolCallCount || 0;
      }
    }
  }

  // Process config data for project breakdown
  if (data.config && data.config.projects) {
    for (const [projectPath, metrics] of Object.entries(data.config.projects)) {
      stats.projectBreakdown.set(projectPath, {
        path: projectPath,
        sessionCount: 0, // TODO: Calculate from history
        messageCount: 0, // TODO: Calculate from history
        totalCost: metrics.lastCost || 0, // Note: This is only the last session cost
        lastSessionDate: metrics.lastSessionId
          ? new Date() // TODO: Get actual date from lastSessionId lookup
          : new Date(),
        modelUsage: new Map(),
      });
    }
  }

  return stats;
}

// Filter stats by date range
export function filterByDateRange(
  stats: AggregatedStats,
  from?: Date,
  to?: Date
): AggregatedStats {
  if (!from && !to) return stats;

  const filtered = { ...stats };

  // Filter daily stats
  if (from || to) {
    filtered.dailyStats = stats.dailyStats.filter((day) => {
      const dayDate = new Date(day.date);
      if (from && dayDate < from) return false;
      if (to && dayDate > to) return false;
      return true;
    });

    // Recalculate summary based on filtered daily stats
    filtered.summary = {
      ...stats.summary,
      totalMessages: filtered.dailyStats.reduce((sum, day) => sum + day.messageCount, 0),
      totalSessions: filtered.dailyStats.reduce((sum, day) => sum + day.sessionCount, 0),
      totalToolCalls: filtered.dailyStats.reduce((sum, day) => sum + day.toolCallCount, 0),
      totalCost: filtered.dailyStats.reduce((sum, day) => sum + day.cost, 0),
      dateRange: {
        from: from || stats.summary.dateRange.from,
        to: to || stats.summary.dateRange.to,
      },
    };
  }

  return filtered;
}

// Filter stats by project
export function filterByProject(
  stats: AggregatedStats,
  projectPath: string
): AggregatedStats {
  const filtered = { ...stats };

  // Filter project breakdown to only include the specified project
  const project = stats.projectBreakdown.get(projectPath);
  if (project) {
    filtered.projectBreakdown = new Map([[projectPath, project]]);

    // Update summary to reflect project-specific data
    filtered.summary = {
      ...stats.summary,
      totalSessions: project.sessionCount,
      totalMessages: project.messageCount,
      totalCost: project.totalCost,
    };
  } else {
    // Project not found, return empty stats
    filtered.projectBreakdown = new Map();
    filtered.summary = {
      totalSessions: 0,
      totalMessages: 0,
      totalToolCalls: 0,
      totalCost: 0,
      cacheSavings: 0,
      dateRange: { from: new Date(), to: new Date() },
    };
  }

  return filtered;
}

// Get top N sessions by cost (requires session history)
export function getTopSessionsByCost(stats: AggregatedStats, limit: number = 10) {
  return stats.sessions
    .sort((a, b) => b.cost - a.cost)
    .slice(0, limit);
}

// Get recent sessions
export function getRecentSessions(stats: AggregatedStats, limit: number = 10) {
  return stats.sessions
    .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
    .slice(0, limit);
}
