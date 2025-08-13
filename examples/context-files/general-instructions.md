# Google Ads MCP Server - Instructions

## Getting Started

Always start by listing your accounts to see what's available:

```
"List my Google Ads accounts"
```

Then set your active account:

```
"Set account [ACCOUNT_ID] as active"
```

## Available Commands

### Account Management

- `list_accounts` - Shows all Manager and Client accounts
- `set_active_account` - Switch between accounts
- `get_account_info` - View current account details

### Campaign Operations (Read)

- `get_campaigns` - List all campaigns with performance metrics
- `get_campaign_performance` - Detailed metrics for date ranges
- `get_ads` - View ads in campaigns
- `get_keywords` - Show keywords with quality scores
- `get_search_terms` - See actual search queries
- `run_gaql_query` - Run custom GAQL queries

### Analysis Tools

- `get_geo_performance` - Performance by location
- `get_device_performance` - Mobile vs Desktop vs Tablet
- `get_demographics` - Age and gender breakdown
- `get_ad_schedule` - Hour and day performance
- `get_audiences` - Audience targeting insights

### Campaign Management (Write)

- `create_campaign` - Create new campaigns (starts PAUSED by default)
- `update_campaign` - Modify budget, name, or status
- `pause_campaign` / `enable_campaign` - Control campaign status

### Targeting

- `add_location_targets` - Target specific locations
- `exclude_locations` - Exclude locations
- `add_radius_target` - Target radius around coordinates
- `search_location_targets` - Find location IDs
- `add_language_targets` - Set language targeting

### Keywords & Ads

- `create_ad_group` - Create ad groups with CPC bids
- `add_keywords` - Add keywords with match types
- `update_keyword_bids` - Change CPC bids
- `pause_keywords` - Pause specific keywords
- `create_responsive_search_ad` - Create RSAs with headlines/descriptions
- `update_ad_status` - Enable/pause/remove ads

### Negative Keywords

- `add_negative_keywords` - Add at campaign or ad group level
- `create_negative_keyword_list` - Create shared negative lists
- `apply_negative_list_to_campaigns` - Apply lists to campaigns

## Safety Features

### Dry Run Mode

Always test changes first:

```
"Create a campaign for my product with dry_run: true"
```

### Default Safety Settings

- New campaigns start PAUSED
- Budget changes have built-in limits
- All changes are logged

## Best Practices

1. **Always start with dry_run** for any write operation
2. **Check current state first** before making changes
3. **Use analysis tools** to understand performance before optimizing
4. **Be specific** with account IDs when managing multiple accounts

## Example Workflows

### Quick Campaign Analysis

```
"Show me campaign performance for last 30 days"
"Which keywords have quality score below 5?"
"What locations are performing best?"
```

### Safe Campaign Creation

```
"Create a search campaign with dry_run"
[Review the preview]
"Now create it for real"
"Add keywords: 'project management', 'task software'"
"Set location to United States"
"Add radius targeting for San Francisco, 25 miles"
```

### Optimization Flow

```
"Show search terms report"
"Add high-performing terms as keywords"
"Add irrelevant terms as negative keywords"
"Pause keywords with quality score below 4"
```

## Troubleshooting

- **No accounts showing**: Check MCC configuration
- **Permission errors**: Verify developer token is approved
- **Changes not appearing**: Check Google Ads change history
- **Commands not working**: Ensure active account is set

## Need Help?

- Use `dry_run: true` to preview any changes
- Check the repository for updates: github.com/lkalajzic/google-ads-mcp
- Report issues on GitHub
