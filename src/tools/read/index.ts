import { GoogleAdsService } from "../../services/google-ads.js";
import { listAccountsHandler } from "./accounts.js";
import { getCampaignsHandler, getCampaignPerformanceHandler } from "./campaigns.js";
import { getKeywordsHandler, getSearchTermsHandler } from "./keywords.js";
import { getAdsHandler } from "./ads.js";
import { runGAQLQueryHandler } from "./query.js";
import { 
  getGeoPerformanceHandler, 
  getDevicePerformanceHandler,
  getDemographicsHandler,
  getAdScheduleHandler,
  getAudiencesHandler
} from "./analysis.js";

export interface Tool {
  name: string;
  description: string;
  inputSchema: any;
  handler: (args: any) => Promise<string>;
}

export function registerReadTools(
  googleAdsService: GoogleAdsService,
  getActiveCustomerId: () => string | undefined
): Record<string, Tool> {
  const tools: Record<string, Tool> = {};

  tools.list_accounts = {
    name: "list_accounts",
    description: "List all accessible Google Ads accounts",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: listAccountsHandler(googleAdsService),
  };

  tools.get_campaigns = {
    name: "get_campaigns",
    description: "Get list of campaigns with basic information",
    inputSchema: {
      type: "object",
      properties: {
        customer_id: {
          type: "string",
          description: "Optional customer ID (uses active account if not provided)",
        },
        include_removed: {
          type: "boolean",
          description: "Include removed campaigns (default: false)",
        },
      },
    },
    handler: getCampaignsHandler(googleAdsService, getActiveCustomerId),
  };

  tools.get_campaign_performance = {
    name: "get_campaign_performance",
    description: "Get campaign performance metrics for a date range",
    inputSchema: {
      type: "object",
      properties: {
        customer_id: {
          type: "string",
          description: "Optional customer ID (uses active account if not provided)",
        },
        campaign_id: {
          type: "string",
          description: "Optional campaign ID (gets all campaigns if not provided)",
        },
        date_range: {
          type: "string",
          description: "Date range: LAST_7_DAYS, LAST_30_DAYS, THIS_MONTH, LAST_MONTH, or custom YYYY-MM-DD:YYYY-MM-DD",
        },
      },
      required: ["date_range"],
    },
    handler: getCampaignPerformanceHandler(googleAdsService, getActiveCustomerId),
  };

  tools.get_keywords = {
    name: "get_keywords",
    description: "Get keywords with bids and quality scores",
    inputSchema: {
      type: "object",
      properties: {
        customer_id: {
          type: "string",
          description: "Optional customer ID (uses active account if not provided)",
        },
        campaign_id: {
          type: "string",
          description: "Optional campaign ID to filter by",
        },
        ad_group_id: {
          type: "string",
          description: "Optional ad group ID to filter by",
        },
      },
    },
    handler: getKeywordsHandler(googleAdsService, getActiveCustomerId),
  };

  tools.get_search_terms = {
    name: "get_search_terms",
    description: "Get actual search queries that triggered ads",
    inputSchema: {
      type: "object",
      properties: {
        customer_id: {
          type: "string",
          description: "Optional customer ID (uses active account if not provided)",
        },
        date_range: {
          type: "string",
          description: "Date range: LAST_7_DAYS, LAST_30_DAYS, THIS_MONTH, LAST_MONTH",
        },
        campaign_id: {
          type: "string",
          description: "Optional campaign ID to filter by",
        },
      },
      required: ["date_range"],
    },
    handler: getSearchTermsHandler(googleAdsService, getActiveCustomerId),
  };

  tools.get_ads = {
    name: "get_ads",
    description: "Get ad copy and creative details",
    inputSchema: {
      type: "object",
      properties: {
        customer_id: {
          type: "string",
          description: "Optional customer ID (uses active account if not provided)",
        },
        campaign_id: {
          type: "string",
          description: "Optional campaign ID to filter by",
        },
        ad_group_id: {
          type: "string",
          description: "Optional ad group ID to filter by",
        },
      },
    },
    handler: getAdsHandler(googleAdsService, getActiveCustomerId),
  };

  tools.run_gaql_query = {
    name: "run_gaql_query",
    description: "Run a custom Google Ads Query Language (GAQL) query",
    inputSchema: {
      type: "object",
      properties: {
        customer_id: {
          type: "string",
          description: "Optional customer ID (uses active account if not provided)",
        },
        query: {
          type: "string",
          description: "The GAQL query to execute",
        },
      },
      required: ["query"],
    },
    handler: runGAQLQueryHandler(googleAdsService, getActiveCustomerId),
  };

  // Analysis tools
  tools.get_geo_performance = {
    name: "get_geo_performance",
    description: "Get detailed geographic performance breakdown by location",
    inputSchema: {
      type: "object",
      properties: {
        customer_id: {
          type: "string",
          description: "Optional customer ID (uses active account if not provided)",
        },
        campaign_id: {
          type: "string",
          description: "Optional campaign ID to filter by",
        },
        date_range: {
          type: "string",
          description: "Date range: LAST_7_DAYS, LAST_30_DAYS, THIS_MONTH, LAST_MONTH",
        },
        min_impressions: {
          type: "number",
          description: "Minimum impressions threshold (default: 0)",
        },
      },
    },
    handler: getGeoPerformanceHandler(googleAdsService, getActiveCustomerId),
  };

  tools.get_device_performance = {
    name: "get_device_performance",
    description: "Get performance breakdown by device type (mobile, desktop, tablet)",
    inputSchema: {
      type: "object",
      properties: {
        customer_id: {
          type: "string",
          description: "Optional customer ID (uses active account if not provided)",
        },
        campaign_id: {
          type: "string",
          description: "Optional campaign ID to filter by",
        },
        date_range: {
          type: "string",
          description: "Date range: LAST_7_DAYS, LAST_30_DAYS, THIS_MONTH, LAST_MONTH",
        },
      },
    },
    handler: getDevicePerformanceHandler(googleAdsService, getActiveCustomerId),
  };

  tools.get_demographics = {
    name: "get_demographics",
    description: "Get demographic performance breakdown by age and gender",
    inputSchema: {
      type: "object",
      properties: {
        customer_id: {
          type: "string",
          description: "Optional customer ID (uses active account if not provided)",
        },
        campaign_id: {
          type: "string",
          description: "Optional campaign ID to filter by",
        },
        date_range: {
          type: "string",
          description: "Date range: LAST_7_DAYS, LAST_30_DAYS, THIS_MONTH, LAST_MONTH",
        },
      },
    },
    handler: getDemographicsHandler(googleAdsService, getActiveCustomerId),
  };

  tools.get_ad_schedule = {
    name: "get_ad_schedule",
    description: "Get performance by hour of day and day of week",
    inputSchema: {
      type: "object",
      properties: {
        customer_id: {
          type: "string",
          description: "Optional customer ID (uses active account if not provided)",
        },
        campaign_id: {
          type: "string",
          description: "Optional campaign ID to filter by",
        },
        date_range: {
          type: "string",
          description: "Date range: LAST_7_DAYS, LAST_30_DAYS, THIS_MONTH, LAST_MONTH",
        },
      },
    },
    handler: getAdScheduleHandler(googleAdsService, getActiveCustomerId),
  };

  tools.get_audiences = {
    name: "get_audiences",
    description: "Get audience performance (remarketing, interests, custom audiences)",
    inputSchema: {
      type: "object",
      properties: {
        customer_id: {
          type: "string",
          description: "Optional customer ID (uses active account if not provided)",
        },
        campaign_id: {
          type: "string",
          description: "Optional campaign ID to filter by",
        },
        date_range: {
          type: "string",
          description: "Date range: LAST_7_DAYS, LAST_30_DAYS, THIS_MONTH, LAST_MONTH",
        },
      },
    },
    handler: getAudiencesHandler(googleAdsService, getActiveCustomerId),
  };

  return tools;
}