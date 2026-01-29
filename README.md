# Claude Code Usage Tracker

A CLI tool to track Claude Code API usage costs, token statistics, session history, and more. Similar to what the codexbar Mac app provides, but as a cross-platform command-line tool.

## Features

- **Overall Statistics**: View total sessions, messages, token usage, and estimated costs
- **Detailed Cost Breakdown**: Per-model cost analysis with cache savings calculation
- **Session History**: Browse recent sessions with message counts and costs
- **Real-time Cost Tracking**: Monitor your API usage as you work
- **Cache Savings Analysis**: See how much you're saving with prompt caching

## Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Or run directly in development mode
npm run dev <command>
```

## Commands

### `claude-tracker stats`

Display overall usage statistics including total sessions, messages, costs, and cache savings.

```bash
npm run dev stats

# With filters
npm run dev stats -- --from 2026-01-01 --to 2026-01-31
npm run dev stats -- --project snapai
npm run dev stats -- --format json
```

**Example Output:**
```
╭────────────────────────────────────────────────────────────╮
│  Claude Code Usage Statistics                              │
├────────────────────────────────────────────────────────────┤
│  Period: Jan 07, 2026 - Jan 28, 2026 (21 days)            │
│                                                            │
│  Total Sessions:       29                                 │
│  Total Messages:      3,297                               │
│  Total Tool Calls:      898                               │
│                                                            │
│  Models Used:                                                │
│    • Claude Opus 4.5:   396.2K tokens (92.8M cache)       │
│    • Claude Sonnet 4.5:   283.8K tokens (52.6M cache)     │
│                                                            │
│  Estimated Cost:     $142.69                               │
│  Cache Savings:      $545.45 (79%)                         │
│                                                            │
│  Most Active Day:    2026-01-28 (809 messages)            │
╰────────────────────────────────────────────────────────────╯
```

### `claude-tracker cost`

Show detailed cost breakdown by model with input/output tokens, cache costs, and savings.

```bash
npm run dev cost

# With filters
npm run dev cost -- --model opus
npm run dev cost -- --from 2026-01-01
npm run dev cost -- --format json
```

**Example Output:**
```
╭─────────────────────────────────────────────────────────────────────────────╮
│  Cost Breakdown by Model                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Claude Opus 4.5                                                    $102.50│
│    Input Tokens:        133.8K  × $5.00   = $0.67                           │
│    Output Tokens:       262.4K  × $25.00  = $6.56                           │
│    Cache Creation:        7.8M  × $6.25   = $48.89                          │
│    Cache Reads:          92.8M  × $0.50   = $46.38                          │
│    ─────────────────────────────────────────────────────────────────────────│
│    Subtotal:                                   $510.10                       │
│    Cache Savings:                              -$407.60 (80%)                │
│                                                                               │
│  ...                                                                          │
│                                                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  TOTAL COST:                                                        $142.69│
│  Without Cache:                                                     $688.13│
│  Total Savings:                                                     $545.45 (79%)  │
╰─────────────────────────────────────────────────────────────────────────────╯

Cost Trend (Last 7 Days):
▃▄█▂▁▁▅ ($20.38/day avg)
```

### `claude-tracker sessions`

Browse recent Claude Code sessions with message counts and costs.

```bash
npm run dev sessions -- --limit 10

# With filters
npm run dev sessions -- --limit 20
npm run dev sessions -- --project snapai
npm run dev sessions -- --sort cost
npm run dev sessions -- --from 2026-01-01
npm run dev sessions -- --format json
```

**Example Output:**
```
Recent Sessions (Last 10):

┌────────────────────┬───────────────────────────────────┬──────────┬────────────┐
│ Date               │ Project                           │ Messages │ Cost       │
├────────────────────┼───────────────────────────────────┼──────────┼────────────┤
│ Jan 29, 8:18 PM    │ snaptrudereact                    │ 15       │ N/A        │
│ Jan 29, 7:48 PM    │ claude-tracker                    │ 1        │ N/A        │
│ Jan 29, 5:07 PM    │ snapai                            │ 4        │ N/A        │
│ ...                │ ...                               │ ...      │ ...        │
└────────────────────┴───────────────────────────────────┴──────────┴────────────┘
```

## Global Options

All commands support these global options:

- `--from <date>`: Filter by start date (YYYY-MM-DD)
- `--to <date>`: Filter by end date (YYYY-MM-DD)
- `--project <path>`: Filter by project path or name
- `--format <format>`: Output format (`table` or `json`)

## How It Works

The tool reads data from Claude Code's local storage files:

- `~/.claude/stats-cache.json` - Token usage and daily metrics
- `~/.claude.json` - Per-project costs and configuration
- `~/.claude/history.jsonl` - Conversation history

It then calculates costs using the current Claude API pricing:

| Model | Input (per 1M tokens) | Output (per 1M tokens) | Cache Write | Cache Read |
|-------|----------------------|------------------------|-------------|------------|
| **Opus 4.5** | $5.00 | $25.00 | $6.25 | $0.50 |
| **Sonnet 4.5** | $3.00 | $15.00 | $3.75 | $0.30 |
| **Haiku 4.5** | $1.00 | $5.00 | $1.25 | $0.10 |

## Project Structure

```
claude-tracker/
├── src/
│   ├── cli/
│   │   ├── index.ts              # CLI entry point
│   │   └── commands/
│   │       ├── stats.ts          # Stats command
│   │       ├── cost.ts           # Cost breakdown command
│   │       └── sessions.ts       # Sessions command
│   ├── core/
│   │   ├── data-loader.ts        # Load Claude Code files
│   │   ├── cost-calculator.ts    # Calculate costs
│   │   └── aggregator.ts         # Aggregate statistics
│   ├── parsers/
│   │   ├── stats-cache-parser.ts # Parse stats-cache.json
│   │   ├── config-parser.ts      # Parse .claude.json
│   │   └── history-parser.ts     # Parse history.jsonl
│   ├── types/
│   │   ├── claude-data.ts        # TypeScript interfaces
│   │   └── pricing.ts            # Pricing types
│   └── utils/
│       ├── path-resolver.ts      # Cross-platform paths
│       ├── formatters.ts         # Output formatting
│       └── errors.ts             # Error handling
├── config/
│   └── pricing.json              # API pricing configuration
├── package.json
├── tsconfig.json
└── README.md
```

## Requirements

- Node.js >= 18.0.0
- Claude Code installed and used at least once

## Pricing Updates

To update pricing, edit `config/pricing.json`:

```json
{
  "version": "2026-01",
  "models": {
    "claude-opus-4-5-20251101": {
      "name": "Claude Opus 4.5",
      "inputTokenPrice": 5.0,
      "outputTokenPrice": 25.0,
      "cacheWritePrice": 6.25,
      "cacheReadPrice": 0.5
    }
  }
}
```

## Development

```bash
# Run in development mode
npm run dev stats

# Build for production
npm run build

# Run built version
npm start stats

# Run tests
npm test
```

## Future Enhancements

- [ ] Real-time monitoring with TUI dashboard (`monitor` command)
- [ ] Export to CSV/JSON (`export` command)
- [ ] Project-specific deep dives (`project` command)
- [ ] Budget alerts and notifications
- [ ] SQLite cache for faster historical queries
- [ ] Plugin system for custom exporters
- [ ] Web dashboard (optional)

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## Acknowledgments

Inspired by the codexbar Mac app for Claude Code.
