// Web server for Claude Code Usage Tracker UI

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadClaudeData } from '../core/data-loader.js';
import { aggregateStats } from '../core/aggregator.js';
import { calculateTotalCost } from '../core/cost-calculator.js';
import { APISyncService } from '../core/api-sync.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ServerOptions {
  port: number;
  host: string;
}

export function createServer(options: ServerOptions) {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Serve static files
  app.use(express.static(path.join(__dirname, '../../public')));

  // API Routes

  // Get overall stats
  app.get('/api/stats', async (req, res) => {
    try {
      const data = await loadClaudeData({ includeHistory: false });
      const stats = await aggregateStats(data);

      res.json({
        success: true,
        data: {
          summary: stats.summary,
          modelBreakdown: Array.from(stats.modelBreakdown.entries()).map(([id, model]) => ({
            modelId: id,
            ...model,
          })),
          dailyStats: stats.dailyStats,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  });

  // Get cost breakdown
  app.get('/api/cost', async (req, res) => {
    try {
      const data = await loadClaudeData({ includeHistory: false });
      const stats = await aggregateStats(data);

      const modelUsage: Record<string, any> = {};
      for (const [modelId, model] of stats.modelBreakdown) {
        modelUsage[modelId] = {
          inputTokens: model.inputTokens,
          outputTokens: model.outputTokens,
          cacheReadInputTokens: model.cacheReadTokens,
          cacheCreationInputTokens: model.cacheCreationTokens,
        };
      }

      const costBreakdown = await calculateTotalCost(modelUsage);

      res.json({
        success: true,
        data: costBreakdown,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  });

  // Get sessions
  app.get('/api/sessions', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const data = await loadClaudeData({ includeHistory: true, historyLimit: 1000 });

      if (!data.history || data.history.length === 0) {
        return res.json({
          success: true,
          data: [],
        });
      }

      // Group by session
      const sessionMap = new Map();
      for (const entry of data.history) {
        if (!sessionMap.has(entry.sessionId)) {
          sessionMap.set(entry.sessionId, {
            sessionId: entry.sessionId,
            project: entry.project,
            messageCount: 0,
            firstMessage: new Date(entry.timestamp),
            lastMessage: new Date(entry.timestamp),
          });
        }
        const session = sessionMap.get(entry.sessionId);
        session.messageCount++;
        const msgTime = new Date(entry.timestamp);
        if (msgTime < session.firstMessage) session.firstMessage = msgTime;
        if (msgTime > session.lastMessage) session.lastMessage = msgTime;
      }

      // Add costs
      if (data.config?.projects) {
        for (const [sessionId, session] of sessionMap) {
          const projectMetrics = data.config.projects[session.project];
          if (projectMetrics?.lastSessionId === sessionId) {
            session.cost = projectMetrics.lastCost;
          }
        }
      }

      const sessions = Array.from(sessionMap.values())
        .sort((a, b) => b.lastMessage.getTime() - a.lastMessage.getTime())
        .slice(0, limit);

      res.json({
        success: true,
        data: sessions,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  });

  // Get cached sync data
  app.get('/api/sync/cached', async (req, res) => {
    try {
      const cached = await APISyncService.loadCachedResponse();
      if (!cached) {
        return res.json({
          success: false,
          message: 'No cached sync data found',
        });
      }

      res.json({
        success: true,
        data: cached,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Serve index.html for root route
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/index.html'));
  });

  return app;
}

export function startServer(options: ServerOptions): Promise<void> {
  return new Promise((resolve) => {
    const app = createServer(options);

    app.listen(options.port, options.host, () => {
      console.log(`\n🚀 Web UI running at: http://${options.host}:${options.port}`);
      console.log(`   Press Ctrl+C to stop\n`);
      resolve();
    });
  });
}
