// Sessions command - Display session history

import chalk from 'chalk';
import Table from 'cli-table3';
import { loadClaudeData } from '../../core/data-loader.js';
import {
  formatCurrency,
  formatDateTime,
  formatDate,
} from '../../utils/formatters.js';
import { getProjectName } from '../../utils/path-resolver.js';

interface SessionsOptions {
  limit: string;
  from?: string;
  to?: string;
  project?: string;
  sort: string;
  format: string;
}

interface SessionInfo {
  sessionId: string;
  project: string;
  projectName: string;
  messageCount: number;
  firstMessage: Date;
  lastMessage: Date;
  cost?: number;
}

export async function sessionsCommand(options: SessionsOptions) {
  try {
    console.log(chalk.cyan('Loading Claude Code data...'));

    // Load data with history
    const data = await loadClaudeData({ includeHistory: true, historyLimit: 1000 });

    if (!data.history || data.history.length === 0) {
      console.log(chalk.yellow('No session data found in history.'));
      return;
    }

    // Group messages by session ID
    const sessionMap = new Map<string, SessionInfo>();

    for (const entry of data.history) {
      if (!sessionMap.has(entry.sessionId)) {
        sessionMap.set(entry.sessionId, {
          sessionId: entry.sessionId,
          project: entry.project,
          projectName: getProjectName(entry.project),
          messageCount: 0,
          firstMessage: new Date(entry.timestamp),
          lastMessage: new Date(entry.timestamp),
        });
      }

      const session = sessionMap.get(entry.sessionId)!;
      session.messageCount++;
      const msgTime = new Date(entry.timestamp);
      if (msgTime < session.firstMessage) session.firstMessage = msgTime;
      if (msgTime > session.lastMessage) session.lastMessage = msgTime;
    }

    // Add cost info from config if available
    if (data.config && data.config.projects) {
      for (const [sessionId, session] of sessionMap) {
        const projectMetrics = data.config.projects[session.project];
        if (projectMetrics && projectMetrics.lastSessionId === sessionId) {
          session.cost = projectMetrics.lastCost;
        }
      }
    }

    // Convert to array
    let sessions = Array.from(sessionMap.values());

    // Apply filters
    if (options.project) {
      sessions = sessions.filter(s =>
        s.project.toLowerCase().includes(options.project!.toLowerCase()) ||
        s.projectName.toLowerCase().includes(options.project!.toLowerCase())
      );
    }

    if (options.from) {
      const from = new Date(options.from);
      sessions = sessions.filter(s => s.lastMessage >= from);
    }

    if (options.to) {
      const to = new Date(options.to);
      sessions = sessions.filter(s => s.firstMessage <= to);
    }

    // Sort
    switch (options.sort) {
      case 'cost':
        sessions.sort((a, b) => (b.cost || 0) - (a.cost || 0));
        break;
      case 'duration':
        sessions.sort((a, b) =>
          (b.lastMessage.getTime() - b.firstMessage.getTime()) -
          (a.lastMessage.getTime() - a.firstMessage.getTime())
        );
        break;
      case 'date':
      default:
        sessions.sort((a, b) => b.lastMessage.getTime() - a.lastMessage.getTime());
        break;
    }

    // Limit
    const limit = parseInt(options.limit, 10);
    const limited = sessions.slice(0, limit);

    // Output
    if (options.format === 'json') {
      outputJson(limited);
    } else {
      outputTable(limited);
    }
  } catch (error) {
    console.error(chalk.red('Error:'), (error as Error).message);
    process.exit(1);
  }
}

function outputTable(sessions: SessionInfo[]) {
  if (sessions.length === 0) {
    console.log(chalk.yellow('\nNo sessions found.'));
    return;
  }

  console.log(chalk.bold(`\nRecent Sessions (Last ${sessions.length}):\n`));

  const table = new Table({
    head: [
      chalk.cyan('Date'),
      chalk.cyan('Project'),
      chalk.cyan('Messages'),
      chalk.cyan('Cost'),
    ],
    style: {
      head: [],
      border: ['gray'],
    },
    colWidths: [20, 35, 10, 12],
  });

  for (const session of sessions) {
    table.push([
      formatDateTime(session.lastMessage),
      session.projectName,
      session.messageCount.toString(),
      session.cost !== undefined ? formatCurrency(session.cost) : 'N/A',
    ]);
  }

  console.log(table.toString());
  console.log('');
}

function outputJson(sessions: SessionInfo[]) {
  console.log(JSON.stringify(sessions, null, 2));
}
