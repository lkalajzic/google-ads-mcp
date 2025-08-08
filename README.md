# Google Ads MCP Server

Natural language control for Google Ads through Claude Desktop. Manage campaigns, analyze performance, and optimize budgets—all through conversation.

## Features

### 🔍 Read & Analyze
- List and switch between multiple Google Ads accounts
- Get campaign/keyword/ad performance metrics
- Analyze by device, location, demographics, schedule
- Run custom GAQL queries
- Search term analysis

### ✏️ Create & Manage
- Build complete campaigns from scratch
- Location targeting (geo, radius, exclusions)
- Keyword and negative keyword management
- Responsive search ads with pinning
- Budget and bid adjustments

### 🛡️ Safety First
- **Dry run mode** - Preview changes before execution
- **Default paused** - New campaigns/ads never auto-start
- **Change tracking** - Built-in changelog generation
- **Budget limits** - Configurable caps

## Quick Start

### Prerequisites
- Bun (recommended) or Node.js 18+
- Claude Desktop app
- Google Ads account with Manager Account (MCC)
- Google Ads API developer token (free)

### Installation

1. **Clone and install**
```bash
git clone https://github.com/yourusername/google-ads-mcp
cd google-ads-mcp
bun install  # or npm install
bun run build  # or npm run build
```

2. **Set up Google Ads API access**
   - Create a Manager Account at ads.google.com
   - Get a developer token from API Center
   - Set up OAuth2 credentials in Google Cloud Console
   - Run `node scripts/generate-refresh-token.js` to authenticate

3. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your credentials
```

4. **Add to Claude Desktop**

Edit your Claude config file:
- Mac: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "google-ads": {
      "command": "bun",
      "args": ["run", "/path/to/google-ads-mcp/src/index.ts"]
    }
  }
}
```

Or if using Node:
```json
{
  "mcpServers": {
    "google-ads": {
      "command": "node",
      "args": ["/path/to/google-ads-mcp/build/index.js"]
    }
  }
}
```

5. **Test the connection**
```
You: "Claude, list my Google Ads accounts"
Claude: [Shows your accounts]
```

## Usage Examples

```
"Show me campaign performance for last 30 days"
"Pause campaigns with CPA over $75"
"Create a search campaign for my SaaS, $50/day, targeting San Francisco"
"Add 'free' and 'cheap' as negative keywords to all campaigns"
"What locations are driving the most conversions?"
"Increase mobile bid adjustments by 20%"
```

## Context Files (Recommended)

Create these in your project root for better results:

**business-context.md** - Your products, KPIs, what works
**general-instructions.md** - Budget limits, naming conventions
**changelog.md** - Auto-updated by Claude

See `examples/` directory for templates.

## Available Tools

### Account Management
- `list_accounts` - Show all accessible accounts
- `set_active_account` - Switch between accounts

### Analysis Tools
- `get_campaign_performance` - Metrics by date range
- `get_geo_performance` - Geographic breakdown
- `get_device_performance` - Mobile/desktop/tablet analysis
- `get_demographics` - Age and gender insights
- `get_ad_schedule` - Hour and day performance

### Campaign Tools
- `create_campaign` - Build new campaigns
- `update_campaign` - Modify settings
- `pause_campaign` / `enable_campaign` - Status control

### Targeting Tools
- `search_location_targets` - Find location IDs
- `add_location_targets` - Target specific locations
- `add_radius_target` - Radius targeting
- `exclude_locations` - Location exclusions

### Keywords & Ads
- `add_keywords` - Add with match types
- `add_negative_keywords` - Campaign/ad group level
- `create_responsive_search_ad` - RSAs with pinning
- `update_keyword_bids` - Bid management

## Architecture

```
├── src/
│   ├── index.ts           # MCP server entry
│   ├── client.ts          # Google Ads API client
│   ├── tools/
│   │   ├── read/          # Analysis tools
│   │   ├── write/         # Modification tools
│   │   └── utility/       # Helper tools
│   └── gaql/              # Query builders
├── scripts/
│   └── generate-refresh-token.js
└── examples/
    └── context-files/
```

## Development

```bash
# Run in development
bun run dev

# Run tests
bun test

# Build for production
bun run build

# Type checking
bun run typecheck
```

## Safety & Best Practices

1. **Always use dry_run for testing**
   ```
   "Create a campaign with dry_run true"
   ```

2. **Set budget alerts in Google Ads UI**
   - This is your safety net beyond the code

3. **Start with read-only operations**
   - Get familiar before making changes

4. **Use context files**
   - Better context = better decisions

## Troubleshooting

**Claude can't see accounts**
- Check MCC ID is correct
- Verify refresh token scopes
- Ensure developer token is approved

**Changes don't appear**
- Google Ads has 5-minute cache
- Check change history in UI
- Verify account permissions

**Authentication errors**
- Regenerate refresh token
- Check OAuth client configuration
- Verify API is enabled in Google Cloud

## Contributing

Contributions welcome! Please read CONTRIBUTING.md first.

Key areas for improvement:
- Additional GAQL query templates
- Smart bidding strategies
- Bulk operations
- Performance recommendations

## License

MIT - See LICENSE file

## Disclaimer

This is beta software. Always verify changes in Google Ads UI. The authors are not responsible for ad spend or campaign performance. Use dry_run mode liberally.

## Support

- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Security**: See SECURITY.md

## Author

**Luka Kalajdzic**
- Website: [lukakalajzic.com](https://lukakalajzic.com)
- Twitter/X: [@lukakalajzic](https://x.com/lukakalajzic)
- LinkedIn: [/in/lukakalajzic](https://www.linkedin.com/in/lukakalajzic/)
- YouTube: [@luka-kalajzic](https://www.youtube.com/@luka-kalajzic)

---

Built with ❤️ for people who'd rather chat than click