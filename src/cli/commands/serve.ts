// Serve command - Start web UI server

import chalk from 'chalk';
import { startServer } from '../../server/index.js';

interface ServeOptions {
  port: string;
  host: string;
  open: boolean;
}

export async function serveCommand(options: ServeOptions) {
  try {
    const port = parseInt(options.port, 10);
    const host = options.host;

    console.log(chalk.cyan('\n🌐 Starting Claude Code Usage Tracker Web UI...\n'));

    await startServer({ port, host });

    // Open browser if requested
    if (options.open) {
      const open = await import('open');
      await open.default(`http://${host}:${port}`);
    }

  } catch (error) {
    console.error(chalk.red('Error starting server:'), (error as Error).message);
    process.exit(1);
  }
}
