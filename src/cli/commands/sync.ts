// Sync command - Fetch usage data from Anthropic API

import chalk from 'chalk';
import ora from 'ora';
import { AnthropicClient } from '../../core/anthropic-client.js';
import { APISyncService } from '../../core/api-sync.js';
import { calculateTotalCost } from '../../core/cost-calculator.js';
import { formatCurrency, formatTokens, formatDateTime } from '../../utils/formatters.js';

interface SyncOptions {
  apiKey?: string;
  from?: string;
  to?: string;
  timeBucket?: '1m' | '1h' | '1d';
  workspace?: string;
  cache?: boolean;
}

export async function syncCommand(options: SyncOptions) {
  try {
    // Get API key
    let apiKey = options.apiKey || AnthropicClient.getAPIKey();

    if (!apiKey) {
      console.error(chalk.red('Error: No API key provided.'));
      console.log('');
      console.log('Please provide an API key using one of these methods:');
      console.log('  1. Pass it as an option: ' + chalk.cyan('--api-key YOUR_KEY'));
      console.log('  2. Set environment variable: ' + chalk.cyan('ANTHROPIC_ADMIN_API_KEY'));
      console.log('  3. Set environment variable: ' + chalk.cyan('ANTHROPIC_API_KEY'));
      console.log('');
      console.log(chalk.yellow('Note: Usage/Cost APIs require an Admin API key (starts with sk-ant-admin...)'));
      console.log(chalk.yellow('Get your Admin API key from: https://console.anthropic.com/settings/keys'));
      process.exit(1);
    }

    // Check if it's an admin key
    if (!AnthropicClient.isAdminKey(apiKey)) {
      console.log(chalk.yellow('⚠ Warning: This does not appear to be an Admin API key'));
      console.log(chalk.yellow('  Admin keys start with: sk-ant-admin...'));
      console.log(chalk.yellow('  Your key starts with: ' + apiKey.substring(0, 12) + '...'));
      console.log(chalk.yellow('  The API request may fail if this is not an admin key.'));
      console.log('');
    }

    // Parse dates
    const startDate = options.from ? new Date(options.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = options.to ? new Date(options.to) : new Date();

    console.log(chalk.bold('\n📊 Syncing Claude API Usage Data\n'));
    console.log(`  Date range: ${chalk.cyan(startDate.toISOString().split('T')[0])} to ${chalk.cyan(endDate.toISOString().split('T')[0])}`);
    console.log(`  Time bucket: ${chalk.cyan(options.timeBucket || '1d')}`);
    if (options.workspace) {
      console.log(`  Workspace: ${chalk.cyan(options.workspace)}`);
    }
    console.log('');

    // Create sync service
    const syncService = new APISyncService(apiKey);

    // Show spinner
    const spinner = ora('Fetching data from Anthropic API...').start();

    // Sync data
    const result = await syncService.sync({
      apiKey,
      startDate,
      endDate,
      timeBucket: options.timeBucket,
      workspaceId: options.workspace,
    });

    spinner.stop();

    if (!result.success) {
      console.error(chalk.red('✗ Sync failed'));
      console.error(chalk.red('  Error: ' + result.error));
      console.log('');
      console.log(chalk.yellow('Troubleshooting:'));
      console.log('  • Ensure you have an Admin API key (starts with sk-ant-admin...)');
      console.log('  • Verify your API key has admin permissions');
      console.log('  • Check that your organization has usage data in the specified date range');
      console.log('  • Visit https://console.anthropic.com/settings/keys to manage keys');
      process.exit(1);
    }

    console.log(chalk.green('✓ Sync successful\n'));

    // Display results
    if (result.usageData && result.usageData.data.length > 0) {
      console.log(chalk.bold('Usage Data:'));
      console.log(`  Records fetched: ${chalk.cyan(result.usageData.data.length)}`);

      // Convert to model usage
      const modelUsage = APISyncService.convertToModelUsage(result.usageData);

      // Calculate costs
      const costSummary = await calculateTotalCost(modelUsage);

      console.log('');
      console.log(chalk.bold('Token Usage by Model:'));
      for (const [modelId, usage] of Object.entries(modelUsage)) {
        const totalTokens = usage.inputTokens + usage.outputTokens;
        console.log(`  ${chalk.cyan(modelId)}`);
        console.log(`    Input:  ${formatTokens(usage.inputTokens)}`);
        console.log(`    Output: ${formatTokens(usage.outputTokens)}`);
        console.log(`    Cache Creation: ${formatTokens(usage.cacheCreationInputTokens)}`);
        console.log(`    Cache Reads: ${formatTokens(usage.cacheReadInputTokens)}`);
        console.log(`    Total: ${formatTokens(totalTokens)}`);
      }

      console.log('');
      console.log(chalk.bold('Cost Breakdown:'));
      for (const breakdown of costSummary.modelBreakdowns) {
        console.log(`  ${chalk.cyan(breakdown.modelName)}: ${chalk.green(formatCurrency(breakdown.totalCost))}`);
        console.log(`    Cache Savings: ${chalk.green(formatCurrency(breakdown.cacheSavings))} (${Math.round(breakdown.cacheSavingsPercentage)}%)`);
      }

      console.log('');
      console.log(chalk.bold('Total Cost (from calculated tokens):'));
      console.log(`  ${chalk.green(formatCurrency(costSummary.totalCost))}`);
      console.log(`  Cache Savings: ${chalk.green(formatCurrency(costSummary.totalCacheSavings))} (${Math.round(costSummary.totalCacheSavingsPercentage)}%)`);
    }

    if (result.costData) {
      console.log('');
      console.log(chalk.bold('Total Cost (from Anthropic API):'));
      console.log(`  ${chalk.green(formatCurrency(result.costData.total_cost_usd))}`);
    }

    // Cache the result if requested
    if (options.cache !== false) {
      await APISyncService.cacheAPIResponse(result);
      console.log('');
      console.log(chalk.gray('✓ Cached API response locally'));
    }

    console.log('');
    console.log(chalk.gray(`Synced at: ${formatDateTime(result.syncedAt)}`));
    console.log('');

  } catch (error) {
    console.error(chalk.red('Error:'), (error as Error).message);
    process.exit(1);
  }
}
