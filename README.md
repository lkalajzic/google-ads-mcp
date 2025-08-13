# Google Ads MCP

Running Google Ads feels like cleaning the bathroom floor with a toothbrush. So I built a better way: managing Google Ads through natural conversation with Claude.

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

- Google Ads account with Manager Account (MCC)
- Node.js installed
- Claude desktop app
- About 15 minutes for initial setup

### Step 1: Google Ads Configuration

**Create a Manager Account:**

1. Go to [ads.google.com/home/tools/manager-accounts/](https://ads.google.com/home/tools/manager-accounts/)
2. Click "Create a manager account"
3. Fill in your business name and select how you'll use the account
4. Create the MCC account (required for API access, even with just one ad account)

**Get Your Developer Token:**

1. Log into your Manager Account at [ads.google.com](https://ads.google.com) or using [this form](https://developers.google.com/google-ads/api/docs/get-started/dev-token#apply-token)
2. In the left sidebar, click: Admin → API Center
3. Click "Apply for access" and fill out:
   - Contact email: Your email
   - Developer token name: "MCP Integration" (or any name)
   - Use case: "Managing my own accounts"
   - OAuth2 client type: Desktop
4. Submit and wait for approval (usually 1-3 business days)
5. Once approved (you will get an email), copy your developer token from the API Center

### Step 2: Google Cloud Setup

1. Visit console.cloud.google.com
2. Create a new project
3. Enable the Google Ads API
4. Create OAuth 2.0 credentials:
   - Type: Desktop application
   - Download the credentials JSON

### Step 3: Install Prerequisites

**Install Node.js:**

- Download from [nodejs.org](https://nodejs.org/) (use LTS version)
- Run the installer - just click through with defaults

**Install Bun (optional but faster - speeds up every command!):**

- In your terminal, paste this:

```bash
curl -fsSL https://bun.sh/install | bash
```

### Step 4: Generate Refresh Token

**Option A: Download ZIP (easier for non-devs)**

1. Download the ZIP from [github.com/lkalajzic/google-ads-mcp](https://github.com/lkalajzic/google-ads-mcp)
2. Extract it to a folder you'll remember (e.g., Desktop)
3. Open Terminal (Mac) or Command Prompt (Windows):
   - Mac: Press Cmd+Space, type "Terminal"
   - Windows: Press Win+R, type "cmd"
4. Navigate to the folder - in your terminal, paste:
   ```bash
   cd ~/Desktop/google-ads-mcp  # Mac
   cd C:\Users\YourName\Desktop\google-ads-mcp  # Windows
   ```

**Option B: Git Clone (for devs)**

- In your terminal, paste:

```bash
git clone https://github.com/lkalajzic/google-ads-mcp
cd google-ads-mcp
```

**Then for both options:**

- In your terminal, paste:

```bash
# Install dependencies
bun install  # or: npm install

# Generate your refresh token
bun run generate-token  # or: npm run generate-token
```

Follow the browser prompts to authorize. Save the refresh token it generates.

### Step 5: Configure Environment

**Copy the example file - in your terminal, paste:**

```bash
cp .env.example .env  # Mac/Linux
copy .env.example .env  # Windows
```

**Edit `.env` with your credentials:**

```env
GOOGLE_ADS_DEVELOPER_TOKEN=your-token-here
GOOGLE_ADS_CLIENT_ID=from-oauth-json
GOOGLE_ADS_CLIENT_SECRET=from-oauth-json
GOOGLE_ADS_REFRESH_TOKEN=from-the-script
GOOGLE_ADS_MCC_ID=your-manager-account-id
```

### Step 6: Build the Project

**In your terminal, paste:**

```bash
bun run build  # or: npm run build
```

This creates the `build/index.js` file Claude will use to run any command.

### Step 7: Connect to Claude

**Find your config file:**

**Mac**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`

Or go to Claude -> Settings -> Developer -> Edit config

```json
{
  "google-ads-mcp": {
    "command": "/Users/YOUR_USER_NAME_AND_PATH/.bun/bin/bun",
    "args": ["run", "/absolute-path-to-your-folder/google-ads-mcp/src/index.ts"]
  }
}
```

**Note:** Use `"command": "node"` instead of `"bun"` if you didn't install Bun.

**Finding your absolute path:**

- In your terminal (while in the google-ads-mcp folder), paste: `pwd` (Mac/Linux) or `cd` (Windows)
- Copy that path and add `/build/index.js`

Restart Claude and test with: "Claude, list my Google Ads accounts"

## The Context System (Your Secret Weapon)

The real power comes from giving Claude context about your business. Create three (ideally) markdown files:

**1. general-instructions.md**

See the included example in the repository for MCP usage instructions.

**2. business-context.md**

```markdown
# Business Context

## What We Sell

SaaS product for project management

## Target Metrics

- CPA: <$50
- CTR: >2%

## What Works

- "project management software" - high converter
- Mobile traffic performs 40% better
- US tech hubs: SF, NYC, Austin, Seattle
```

**3. changelog.md**

```markdown
# Change Log

[Claude will update this automatically with each change]
```

At the start of every chat you can say something like "initialize your memory from FOLDER_PATH" and Claude will read all three files if you have the filesystem MCP server enabled.

## Common Commands to Try

```
"Make a report of the campaign performance in the last 30 days"
"Analyze my search terms and suggest keywords to add and exclude"
"Pause all poor performing ad groups"
"Create a brand search protection campaign"
"Add competitor brand names as negative keywords"
"Analyze campaign performance in-depth - per device, location, time of day"
```

## Troubleshooting

**"Claude can't see my accounts"**

- Check your MCC ID is correct
- Run test command: `bun run test-connection` or `npm run test-connection`
- Ensure the refresh token has proper scopes

**"Changes aren't appearing"**

- Check the change history in Google Ads UI

**"Getting permission errors"**

- Your developer token needs to be approved (check email for approval)
- Verify API access level: Manager Account → Admin (left sidebar) → API Center

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

MIT License - see [LICENSE](LICENSE)

---

_Blog post: [lukakalajzic.com/google-ads-mcp](https://lukakalajzic.com/google-ads-mcp)_

_Questions? Issues? Open a GitHub issue or reach out on Twitter: [@lukakalajzic](https://x.com/lukakalajzic)_

_Built by Luka Kalajžić_

_Remember: Always verify changes in Google Ads. This is beta software - use dry_run mode liberally._
