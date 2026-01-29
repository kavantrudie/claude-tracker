// Stats command - Display overall usage statistics

import chalk from 'chalk';
import { loadClaudeData } from '../../core/data-loader.js';
import { aggregateStats, filterByDateRange, filterByProject } from '../../core/aggregator.js';
import {
  formatCurrency,
  formatTokens,
  formatDate,
  formatDuration,
  formatPercentage,
  formatModelName,
} from '../../utils/formatters.js';

interface StatsOptions {
  from?: string;
  to?: string;
  project?: string;
  format: string;
}

export async function statsCommand(options: StatsOptions) {
  try {
    console.log(chalk.cyan('Loading Claude Code data...'));

    // Load data
    const data = await loadClaudeData({ includeHistory: false });

    // Aggregate stats
    let stats = await aggregateStats(data);

    // Apply filters
    if (options.from || options.to) {
      const from = options.from ? new Date(options.from) : undefined;
      const to = options.to ? new Date(options.to) : undefined;
      stats = filterByDateRange(stats, from, to);
    }

    if (options.project) {
      stats = filterByProject(stats, options.project);
    }

    // Output format
    if (options.format === 'json') {
      outputJson(stats);
    } else {
      outputTable(stats);
    }
  } catch (error) {
    console.error(chalk.red('Error:'), (error as Error).message);
    process.exit(1);
  }
}

function outputTable(stats: any) {
  const { summary, modelBreakdown, dailyStats } = stats;

  console.log('');
  console.log(chalk.bold.cyan('╭────────────────────────────────────────────────────────────╮'));
  console.log(chalk.bold.cyan('│') + chalk.bold('  Claude Code Usage Statistics') + '                              ' + chalk.bold.cyan('│'));
  console.log(chalk.bold.cyan('├────────────────────────────────────────────────────────────┤'));

  // Date range
  const fromDate = formatDate(summary.dateRange.from);
  const toDate = formatDate(summary.dateRange.to);
  const daysDiff = Math.ceil(
    (summary.dateRange.to.getTime() - summary.dateRange.from.getTime()) / (1000 * 60 * 60 * 24)
  );
  console.log(chalk.cyan('│') + `  Period: ${fromDate} - ${toDate} (${daysDiff} days)`.padEnd(59) + chalk.cyan('│'));
  console.log(chalk.cyan('│') + '                                                            ' + chalk.cyan('│'));

  // Summary stats
  console.log(chalk.cyan('│') + `  Total Sessions:     ${summary.totalSessions.toString().padStart(4)}`.padEnd(59) + chalk.cyan('│'));
  console.log(chalk.cyan('│') + `  Total Messages:     ${summary.totalMessages.toLocaleString().padStart(6)}`.padEnd(59) + chalk.cyan('│'));
  console.log(chalk.cyan('│') + `  Total Tool Calls:   ${summary.totalToolCalls.toLocaleString().padStart(6)}`.padEnd(59) + chalk.cyan('│'));
  console.log(chalk.cyan('│') + '                                                            ' + chalk.cyan('│'));

  // Model usage
  console.log(chalk.cyan('│') + chalk.bold('  Models Used:') + '                                                ' + chalk.cyan('│'));

  for (const [modelId, model] of modelBreakdown) {
    const totalTokens = model.inputTokens + model.outputTokens;
    const cacheRead = model.cacheReadTokens > 0 ? ` (${formatTokens(model.cacheReadTokens)} cache)` : '';
    console.log(
      chalk.cyan('│') +
      `    • ${formatModelName(modelId)}:   ${formatTokens(totalTokens)} tokens${cacheRead}`.padEnd(59) +
      chalk.cyan('│')
    );
  }

  console.log(chalk.cyan('│') + '                                                            ' + chalk.cyan('│'));

  // Cost
  console.log(
    chalk.cyan('│') +
    `  Estimated Cost:     ${chalk.bold.green(formatCurrency(summary.totalCost))}`.padEnd(68) +
    chalk.cyan('│')
  );
  console.log(
    chalk.cyan('│') +
    `  Cache Savings:      ${chalk.bold.green(formatCurrency(summary.cacheSavings))} (${formatPercentage((summary.cacheSavings / (summary.totalCost + summary.cacheSavings)) * 100)})`.padEnd(68) +
    chalk.cyan('│')
  );
  console.log(chalk.cyan('│') + '                                                            ' + chalk.cyan('│'));

  // Most active day
  if (dailyStats.length > 0) {
    const mostActiveDay = dailyStats.reduce((max, day) =>
      day.messageCount > max.messageCount ? day : max
    );
    console.log(
      chalk.cyan('│') +
      `  Most Active Day:    ${mostActiveDay.date} (${mostActiveDay.messageCount} messages)`.padEnd(59) +
      chalk.cyan('│')
    );
  }

  console.log(chalk.bold.cyan('╰────────────────────────────────────────────────────────────╯'));
  console.log('');
}

function outputJson(stats: any) {
  const output = {
    summary: stats.summary,
    models: Array.from(stats.modelBreakdown.entries()).map(([id, model]) => ({
      modelId: id,
      ...model,
    })),
    dailyStats: stats.dailyStats,
  };
  console.log(JSON.stringify(output, null, 2));
}
