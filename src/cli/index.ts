#!/usr/bin/env node

// CLI entry point

import { Command } from 'commander';
import { statsCommand } from './commands/stats.js';
import { costCommand } from './commands/cost.js';
import { sessionsCommand } from './commands/sessions.js';

const program = new Command();

program
  .name('claude-tracker')
  .description('Track Claude Code API usage costs and statistics')
  .version('1.0.0');

// Stats command
program
  .command('stats')
  .description('Display overall usage statistics')
  .option('--from <date>', 'Start date (YYYY-MM-DD)')
  .option('--to <date>', 'End date (YYYY-MM-DD)')
  .option('--project <path>', 'Filter by project path')
  .option('--format <format>', 'Output format (table|json)', 'table')
  .action(statsCommand);

// Cost command
program
  .command('cost')
  .description('Display detailed cost breakdown')
  .option('--breakdown', 'Show detailed per-model breakdown', true)
  .option('--from <date>', 'Start date (YYYY-MM-DD)')
  .option('--to <date>', 'End date (YYYY-MM-DD)')
  .option('--project <path>', 'Filter by project path')
  .option('--model <model>', 'Filter by model (opus|sonnet|haiku)')
  .option('--format <format>', 'Output format (table|json)', 'table')
  .action(costCommand);

// Sessions command
program
  .command('sessions')
  .description('Display session history')
  .option('--limit <number>', 'Number of sessions to display', '10')
  .option('--from <date>', 'Start date (YYYY-MM-DD)')
  .option('--to <date>', 'End date (YYYY-MM-DD)')
  .option('--project <path>', 'Filter by project path')
  .option('--sort <field>', 'Sort by field (date|cost|duration)', 'date')
  .option('--format <format>', 'Output format (table|json)', 'table')
  .action(sessionsCommand);

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
