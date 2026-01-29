// Cost command - Display detailed cost breakdown

import chalk from 'chalk';
import { loadClaudeData } from '../../core/data-loader.js';
import { aggregateStats, filterByDateRange, filterByProject } from '../../core/aggregator.js';
import { calculateTotalCost } from '../../core/cost-calculator.js';
import {
  formatCurrency,
  formatTokens,
  formatPercentage,
  formatModelName,
  createSparkline,
} from '../../utils/formatters.js';

interface CostOptions {
  breakdown: boolean;
  from?: string;
  to?: string;
  project?: string;
  model?: string;
  format: string;
}

export async function costCommand(options: CostOptions) {
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

    // Calculate detailed cost breakdown
    const modelUsage: Record<string, any> = {};
    for (const [modelId, model] of stats.modelBreakdown) {
      if (options.model) {
        const modelFilter = options.model.toLowerCase();
        if (
          !modelId.toLowerCase().includes(modelFilter) &&
          !model.name.toLowerCase().includes(modelFilter)
        ) {
          continue;
        }
      }
      modelUsage[modelId] = {
        inputTokens: model.inputTokens,
        outputTokens: model.outputTokens,
        cacheReadInputTokens: model.cacheReadTokens,
        cacheCreationInputTokens: model.cacheCreationTokens,
      };
    }

    const costBreakdown = await calculateTotalCost(modelUsage);

    // Output format
    if (options.format === 'json') {
      outputJson(costBreakdown, stats);
    } else {
      outputTable(costBreakdown, stats);
    }
  } catch (error) {
    console.error(chalk.red('Error:'), (error as Error).message);
    process.exit(1);
  }
}

function outputTable(costBreakdown: any, stats: any) {
  console.log('');
  console.log(chalk.bold.cyan('╭─────────────────────────────────────────────────────────────────────────────╮'));
  console.log(chalk.bold.cyan('│') + chalk.bold('  Cost Breakdown by Model') + '                                                     ' + chalk.bold.cyan('│'));
  console.log(chalk.bold.cyan('├─────────────────────────────────────────────────────────────────────────────┤'));
  console.log(chalk.cyan('│') + '                                                                               ' + chalk.cyan('│'));

  // Per-model breakdown
  for (const model of costBreakdown.modelBreakdowns) {
    // Model name and total cost
    console.log(
      chalk.cyan('│') +
      `  ${chalk.bold(model.modelName)}`.padEnd(72) +
      chalk.bold.green(formatCurrency(model.totalCost).padStart(10)) +
      chalk.cyan('│')
    );

    // Input tokens
    console.log(
      chalk.cyan('│') +
      `    Input Tokens:    ${formatTokens(model.inputTokens).padStart(10)}  × $${model.inputCost > 0 ? (model.inputCost / (model.inputTokens / 1_000_000)).toFixed(2) : '0.00'}   = ${formatCurrency(model.inputCost)}`.padEnd(80) +
      chalk.cyan('│')
    );

    // Output tokens
    console.log(
      chalk.cyan('│') +
      `    Output Tokens:   ${formatTokens(model.outputTokens).padStart(10)}  × $${model.outputCost > 0 ? (model.outputCost / (model.outputTokens / 1_000_000)).toFixed(2) : '0.00'}  = ${formatCurrency(model.outputCost)}`.padEnd(80) +
      chalk.cyan('│')
    );

    // Cache creation
    if (model.cacheCreationTokens > 0) {
      console.log(
        chalk.cyan('│') +
        `    Cache Creation:  ${formatTokens(model.cacheCreationTokens).padStart(10)}  × $${(model.cacheWriteCost / (model.cacheCreationTokens / 1_000_000)).toFixed(2)}   = ${formatCurrency(model.cacheWriteCost)}`.padEnd(80) +
        chalk.cyan('│')
      );
    }

    // Cache reads
    if (model.cacheReadTokens > 0) {
      console.log(
        chalk.cyan('│') +
        `    Cache Reads:     ${formatTokens(model.cacheReadTokens).padStart(10)}  × $${(model.cacheReadCost / (model.cacheReadTokens / 1_000_000)).toFixed(2)}   = ${formatCurrency(model.cacheReadCost)}`.padEnd(80) +
        chalk.cyan('│')
      );
    }

    // Divider
    console.log(
      chalk.cyan('│') +
      `    ${'─'.repeat(73)}` +
      chalk.cyan('│')
    );

    // Subtotal
    console.log(
      chalk.cyan('│') +
      `    Subtotal:                                   ${formatCurrency(model.totalCostWithoutCache)}`.padEnd(80) +
      chalk.cyan('│')
    );

    // Cache savings
    if (model.cacheSavings > 0) {
      console.log(
        chalk.cyan('│') +
        `    Cache Savings:                              -${formatCurrency(model.cacheSavings)} (${formatPercentage(model.cacheSavingsPercentage)})`.padEnd(80) +
        chalk.cyan('│')
      );
    }

    console.log(chalk.cyan('│') + '                                                                               ' + chalk.cyan('│'));
  }

  // Total
  console.log(chalk.cyan('├─────────────────────────────────────────────────────────────────────────────┤'));
  console.log(
    chalk.cyan('│') +
    `  ${chalk.bold('TOTAL COST:')}`.padEnd(63) +
    chalk.bold.green(formatCurrency(costBreakdown.totalCost).padStart(15)) +
    chalk.cyan('│')
  );

  if (costBreakdown.totalCostWithoutCache > costBreakdown.totalCost) {
    console.log(
      chalk.cyan('│') +
      `  Without Cache:`.padEnd(63) +
      chalk.gray(formatCurrency(costBreakdown.totalCostWithoutCache).padStart(15)) +
      chalk.cyan('│')
    );
    console.log(
      chalk.cyan('│') +
      `  Total Savings:`.padEnd(63) +
      chalk.green(formatCurrency(costBreakdown.totalCacheSavings).padStart(15) + ` (${formatPercentage(costBreakdown.totalCacheSavingsPercentage)})`) +
      '  ' +
      chalk.cyan('│')
    );
  }

  console.log(chalk.bold.cyan('╰─────────────────────────────────────────────────────────────────────────────╯'));
  console.log('');

  // Cost trend (last 7 days)
  if (stats.dailyStats && stats.dailyStats.length > 0) {
    const last7Days = stats.dailyStats.slice(-7);
    const costs = last7Days.map((day: any) => day.cost);
    const avgCost = costs.reduce((sum: number, c: number) => sum + c, 0) / costs.length;

    console.log(chalk.bold('Cost Trend (Last 7 Days):'));
    console.log(chalk.cyan(createSparkline(costs)) + chalk.gray(` (${formatCurrency(avgCost)}/day avg)`));
    console.log('');
  }
}

function outputJson(costBreakdown: any, stats: any) {
  console.log(JSON.stringify(costBreakdown, null, 2));
}
