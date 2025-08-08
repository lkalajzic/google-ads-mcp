#!/usr/bin/env bun

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { GoogleAdsService } from "./services/google-ads.js";
import { registerReadTools } from "./tools/read/index.js";
import { registerWriteTools } from "./tools/write/index.js";

// Load env vars without dotenv to avoid stdout pollution
const envPath = new URL('../.env', import.meta.url).pathname;
const envContent = await Bun.file(envPath).text();
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && !key.startsWith('#')) {
    process.env[key.trim()] = valueParts.join('=').trim();
  }
});

const server = new Server(
  {
    name: process.env.MCP_SERVER_NAME || "google-ads-mcp",
    version: process.env.MCP_SERVER_VERSION || "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const googleAdsService = new GoogleAdsService({
  developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
  clientId: process.env.GOOGLE_ADS_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
  refreshToken: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
  defaultCustomerId: process.env.GOOGLE_ADS_DEFAULT_CUSTOMER_ID,
  mccId: process.env.GOOGLE_ADS_MCC_ID,
});

// Use the default customer ID from env if available
let activeCustomerId: string | undefined = process.env.GOOGLE_ADS_DEFAULT_CUSTOMER_ID;

const readTools = registerReadTools(googleAdsService, () => activeCustomerId);
const writeTools = registerWriteTools(googleAdsService, () => activeCustomerId);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    ...Object.values(readTools),
    ...Object.values(writeTools),
    {
      name: "set_active_account",
      description: "Set the active Google Ads account for subsequent operations",
      inputSchema: {
        type: "object",
        properties: {
          customer_id: {
            type: "string",
            description: "The Google Ads customer ID (format: 123-456-7890 or 1234567890)",
          },
        },
        required: ["customer_id"],
      },
    },
    {
      name: "get_account_status",
      description: "Check which Google Ads account is currently active",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "set_active_account") {
      if (!args || !args.customer_id) {
        throw new McpError(
          ErrorCode.InvalidParams,
          "customer_id is required"
        );
      }
      
      const customerId = (args.customer_id as string).replace(/-/g, "");
      
      // Only block if it's exactly the MCC ID
      if (customerId === process.env.GOOGLE_ADS_MCC_ID) {
        return {
          content: [
            {
              type: "text",
              text: `Cannot use MCC account (${customerId}) for operations.\n\nPlease run 'list_accounts' to see available client accounts, then use 'set_active_account' with a client account ID.`,
            },
          ],
        };
      }
      
      activeCustomerId = customerId;
      return {
        content: [
          {
            type: "text",
            text: `✅ Active account set to: ${customerId}`,
          },
        ],
      };
    }

    if (name === "get_account_status") {
      if (!activeCustomerId) {
        return {
          content: [
            {
              type: "text",
              text: "❌ No active account set.\n\nPlease use:\n1. list_accounts - to see available accounts\n2. set_active_account - to choose a client account from the list",
            },
          ],
        };
      }
      
      return {
        content: [
          {
            type: "text",
            text: `✅ Active account: ${activeCustomerId}\n\nAll operations will use this account unless you specify a different customer_id.`,
          },
        ],
      };
    }

    if (readTools[name]) {
      const result = await readTools[name].handler(args);
      return {
        content: [
          {
            type: "text",
            text: result,
          },
        ],
      };
    }

    if (writeTools[name]) {
      const result = await writeTools[name].handler(args);
      return {
        content: [
          {
            type: "text",
            text: result,
          },
        ],
      };
    }

    throw new McpError(
      ErrorCode.MethodNotFound,
      `Tool '${name}' not found`
    );
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }
    
    throw new McpError(
      ErrorCode.InternalError,
      error instanceof Error ? error.message : "Unknown error occurred"
    );
  }
});

const transport = new StdioServerTransport();
server.connect(transport);

// MCP servers should not output to stderr during normal operation
// Only output errors when something goes wrong