// TypeScript interfaces for Claude Code data files

export interface StatsCache {
  version: number;
  lastComputedDate: string;
  dailyActivity: Array<DailyActivity>;
  dailyModelTokens: Array<DailyModelTokens>;
  modelUsage: Record<string, ModelUsage>;
  totalSessions: number;
  totalMessages: number;
  longestSession?: {
    sessionId: string;
    duration: number;
    messageCount: number;
    timestamp: string;
  };
  firstSessionDate?: string;
  hourCounts?: Record<string, number>;
}

export interface DailyActivity {
  date: string;
  messageCount: number;
  sessionCount: number;
  toolCallCount: number;
}

export interface DailyModelTokens {
  date: string;
  tokensByModel: Record<string, number>;
}

export interface ModelUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
  webSearchRequests?: number;
  costUSD?: number;
  contextWindow?: number;
}

export interface ClaudeConfig {
  numStartups: number;
  userID: string;
  firstStartTime: string;
  hasCompletedOnboarding: boolean;
  projects: Record<string, ProjectMetrics>;
  tipsHistory?: Record<string, number>;
  cachedStatsigGates?: Record<string, any>;
  cachedGrowthBookFeatures?: Record<string, any>;
  skillUsage?: Record<string, any>;
  subscriptionNoticeCount?: number;
}

export interface ProjectMetrics {
  lastCost: number;
  lastDuration?: number;
  lastSessionId?: string;
  lastTotalInputTokens?: number;
  lastTotalOutputTokens?: number;
  lastLinesAdded?: number;
  lastLinesRemoved?: number;
  lastAPIDuration?: number;
  lastModelUsage?: Record<string, ModelUsage>;
  hasTrustDialogAccepted?: boolean;
  hasCompletedProjectOnboarding?: boolean;
}

export interface HistoryEntry {
  display: string;
  pastedContents?: Record<string, any>;
  timestamp: number;
  project: string;
  sessionId: string;
}

export interface Session {
  sessionId: string;
  project: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // milliseconds
  messageCount: number;
  cost: number;
  modelUsage: Map<string, ModelUsage>;
}

export interface AggregatedStats {
  summary: {
    totalSessions: number;
    totalMessages: number;
    totalToolCalls: number;
    totalCost: number;
    cacheSavings: number;
    dateRange: { from: Date; to: Date };
  };

  modelBreakdown: Map<string, {
    name: string;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheCreationTokens: number;
    cost: number;
    cacheSavings: number;
  }>;

  projectBreakdown: Map<string, {
    path: string;
    sessionCount: number;
    messageCount: number;
    totalCost: number;
    lastSessionDate: Date;
    modelUsage: Map<string, ModelUsage>;
  }>;

  dailyStats: Array<{
    date: string; // YYYY-MM-DD
    messageCount: number;
    sessionCount: number;
    toolCallCount: number;
    cost: number;
    tokensByModel: Map<string, number>;
  }>;

  sessions: Array<Session>;
}

export interface ClaudeData {
  statsCache?: StatsCache;
  config?: ClaudeConfig;
  history?: HistoryEntry[];
}
