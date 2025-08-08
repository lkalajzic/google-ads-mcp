import { GoogleAdsService } from "../../services/google-ads.js";
import type { Tool } from "../read/index.js";
import {
  createCampaignHandler,
  updateCampaignHandler,
  pauseCampaignHandler,
  enableCampaignHandler,
} from "./campaigns.js";
import {
  createAdGroupHandler,
  updateAdGroupHandler,
} from "./ad-groups.js";
import {
  addKeywordsHandler,
  updateKeywordBidsHandler,
  pauseKeywordsHandler,
} from "./keywords.js";
import {
  createResponsiveSearchAdHandler,
  updateAdStatusHandler,
  updateResponsiveSearchAdHandler,
} from "./ads.js";
import {
  addLocationTargetsHandler,
  excludeLocationsHandler,
  addRadiusTargetHandler,
  searchLocationTargetsHandler,
} from "./location-targeting.js";
import {
  addLanguageTargetsHandler,
  listAvailableLanguagesHandler,
} from "./language-targeting.js";
import {
  addNegativeKeywordsHandler,
  createNegativeKeywordListHandler,
  addKeywordsToNegativeListHandler,
  applyNegativeListToCampaignsHandler,
} from "./negative-keywords.js";

export function registerWriteTools(
  googleAdsService: GoogleAdsService,
  getActiveCustomerId: () => string | undefined
): Record<string, Tool> {
  const tools: Record<string, Tool> = {};

  // Campaign tools
  tools.create_campaign = {
    name: "create_campaign",
    description: "Create a new Google Ads campaign with safety features",
    inputSchema: {
      type: "object",
      properties: {
        customer_id: {
          type: "string",
          description: "Optional customer ID (uses active account if not provided)",
        },
        name: {
          type: "string",
          description: "Campaign name",
        },
        budget_amount: {
          type: "number",
          description: "Daily budget in currency units (e.g., 50.00 for $50)",
        },
        campaign_type: {
          type: "string",
          enum: ["SEARCH", "DISPLAY", "SHOPPING", "VIDEO"],
          description: "Type of campaign",
        },
        status: {
          type: "string",
          enum: ["ENABLED", "PAUSED"],
          description: "Campaign status (defaults to PAUSED for safety)",
        },
        include_search_partners: {
          type: "boolean",
          description: "Include Google search partners (for SEARCH campaigns)",
        },
        merchant_id: {
          type: "string",
          description: "Merchant Center ID (required for SHOPPING campaigns)",
        },
        tracking_url_template: {
          type: "string",
          description: "Tracking template for campaign URLs (e.g., {lpurl}?utm_source=google)",
        },
        final_url_suffix: {
          type: "string",
          description: "Parameters to append to all final URLs (e.g., utm_content=abc123)",
        },
        dry_run: {
          type: "boolean",
          description: "Preview changes without applying them",
        },
        confirmation_mode: {
          type: "boolean",
          description: "Show confirmation before applying changes (default: true)",
        },
      },
      required: ["name", "budget_amount", "campaign_type"],
    },
    handler: createCampaignHandler(googleAdsService, getActiveCustomerId),
  };

  tools.update_campaign = {
    name: "update_campaign",
    description: "Update campaign settings (name, budget, status)",
    inputSchema: {
      type: "object",
      properties: {
        customer_id: {
          type: "string",
          description: "Optional customer ID (uses active account if not provided)",
        },
        campaign_id: {
          type: "string",
          description: "Campaign ID to update",
        },
        name: {
          type: "string",
          description: "New campaign name",
        },
        budget_amount: {
          type: "number",
          description: "New daily budget in currency units",
        },
        status: {
          type: "string",
          enum: ["ENABLED", "PAUSED", "REMOVED"],
          description: "New campaign status",
        },
        tracking_url_template: {
          type: "string",
          description: "Tracking template for campaign URLs (e.g., {lpurl}?utm_source=google)",
        },
        final_url_suffix: {
          type: "string",
          description: "Parameters to append to all final URLs (e.g., utm_content=abc123)",
        },
        dry_run: {
          type: "boolean",
          description: "Preview changes without applying them",
        },
        max_budget_change: {
          type: "number",
          description: "Maximum allowed budget change in currency units (default: 1000)",
        },
      },
      required: ["campaign_id"],
    },
    handler: updateCampaignHandler(googleAdsService, getActiveCustomerId),
  };

  tools.pause_campaign = {
    name: "pause_campaign",
    description: "Pause a campaign (stop spending)",
    inputSchema: {
      type: "object",
      properties: {
        customer_id: {
          type: "string",
          description: "Optional customer ID (uses active account if not provided)",
        },
        campaign_id: {
          type: "string",
          description: "Campaign ID to pause",
        },
        dry_run: {
          type: "boolean",
          description: "Preview changes without applying them",
        },
      },
      required: ["campaign_id"],
    },
    handler: pauseCampaignHandler(googleAdsService, getActiveCustomerId),
  };

  tools.enable_campaign = {
    name: "enable_campaign",
    description: "Enable a campaign (start spending)",
    inputSchema: {
      type: "object",
      properties: {
        customer_id: {
          type: "string",
          description: "Optional customer ID (uses active account if not provided)",
        },
        campaign_id: {
          type: "string",
          description: "Campaign ID to enable",
        },
        dry_run: {
          type: "boolean",
          description: "Preview changes without applying them",
        },
      },
      required: ["campaign_id"],
    },
    handler: enableCampaignHandler(googleAdsService, getActiveCustomerId),
  };

  // Ad Group tools
  tools.create_ad_group = {
    name: "create_ad_group",
    description: "Create a new ad group in a campaign",
    inputSchema: {
      type: "object",
      properties: {
        customer_id: {
          type: "string",
          description: "Optional customer ID (uses active account if not provided)",
        },
        campaign_id: {
          type: "string",
          description: "Campaign ID to create the ad group in",
        },
        name: {
          type: "string",
          description: "Ad group name",
        },
        status: {
          type: "string",
          enum: ["ENABLED", "PAUSED"],
          description: "Ad group status (defaults to PAUSED for safety)",
        },
        cpc_bid: {
          type: "number",
          description: "Default CPC bid in currency units (e.g., 2.50 for $2.50)",
        },
        dry_run: {
          type: "boolean",
          description: "Preview changes without applying them",
        },
      },
      required: ["campaign_id", "name"],
    },
    handler: createAdGroupHandler(googleAdsService, getActiveCustomerId),
  };

  tools.update_ad_group = {
    name: "update_ad_group",
    description: "Update ad group settings (name, status, default bid)",
    inputSchema: {
      type: "object",
      properties: {
        customer_id: {
          type: "string",
          description: "Optional customer ID (uses active account if not provided)",
        },
        ad_group_id: {
          type: "string",
          description: "Ad group ID to update",
        },
        name: {
          type: "string",
          description: "New ad group name",
        },
        status: {
          type: "string",
          enum: ["ENABLED", "PAUSED", "REMOVED"],
          description: "New ad group status",
        },
        cpc_bid: {
          type: "number",
          description: "New default CPC bid in currency units",
        },
        dry_run: {
          type: "boolean",
          description: "Preview changes without applying them",
        },
      },
      required: ["ad_group_id"],
    },
    handler: updateAdGroupHandler(googleAdsService, getActiveCustomerId),
  };

  // Keyword tools
  tools.add_keywords = {
    name: "add_keywords",
    description: "Add keywords to an ad group",
    inputSchema: {
      type: "object",
      properties: {
        customer_id: {
          type: "string",
          description: "Optional customer ID (uses active account if not provided)",
        },
        ad_group_id: {
          type: "string",
          description: "Ad group ID to add keywords to",
        },
        keywords: {
          type: "array",
          description: "Array of keywords (strings or objects with text, match_type, cpc_bid)",
          items: {
            oneOf: [
              { type: "string" },
              {
                type: "object",
                properties: {
                  text: { type: "string" },
                  match_type: {
                    type: "string",
                    enum: ["BROAD", "PHRASE", "EXACT"],
                  },
                  cpc_bid: { type: "number" },
                },
                required: ["text"],
              },
            ],
          },
        },
        dry_run: {
          type: "boolean",
          description: "Preview changes without applying them",
        },
      },
      required: ["ad_group_id", "keywords"],
    },
    handler: addKeywordsHandler(googleAdsService, getActiveCustomerId),
  };

  tools.update_keyword_bids = {
    name: "update_keyword_bids",
    description: "Update CPC bids for keywords",
    inputSchema: {
      type: "object",
      properties: {
        customer_id: {
          type: "string",
          description: "Optional customer ID (uses active account if not provided)",
        },
        keyword_ids: {
          type: "array",
          description: "Array of keyword criterion IDs",
          items: { type: "string" },
        },
        cpc_bid: {
          type: "number",
          description: "New CPC bid in currency units",
        },
        dry_run: {
          type: "boolean",
          description: "Preview changes without applying them",
        },
      },
      required: ["keyword_ids", "cpc_bid"],
    },
    handler: updateKeywordBidsHandler(googleAdsService, getActiveCustomerId),
  };

  tools.pause_keywords = {
    name: "pause_keywords",
    description: "Pause keywords to stop them from triggering ads",
    inputSchema: {
      type: "object",
      properties: {
        customer_id: {
          type: "string",
          description: "Optional customer ID (uses active account if not provided)",
        },
        keyword_ids: {
          type: "array",
          description: "Array of keyword criterion IDs to pause",
          items: { type: "string" },
        },
        dry_run: {
          type: "boolean",
          description: "Preview changes without applying them",
        },
      },
      required: ["keyword_ids"],
    },
    handler: pauseKeywordsHandler(googleAdsService, getActiveCustomerId),
  };

  // Ad tools
  tools.create_responsive_search_ad = {
    name: "create_responsive_search_ad",
    description: "Create a new responsive search ad",
    inputSchema: {
      type: "object",
      properties: {
        customer_id: {
          type: "string",
          description: "Optional customer ID (uses active account if not provided)",
        },
        ad_group_id: {
          type: "string",
          description: "Ad group ID to create the ad in",
        },
        headlines: {
          type: "array",
          description: "Array of headlines (3-15 required, max 30 chars each)",
          items: {
            oneOf: [
              { type: "string" },
              {
                type: "object",
                properties: {
                  text: { type: "string" },
                  pinned_field: { type: "number" },
                },
                required: ["text"],
              },
            ],
          },
        },
        descriptions: {
          type: "array",
          description: "Array of descriptions (2-4 required, max 90 chars each)",
          items: {
            oneOf: [
              { type: "string" },
              {
                type: "object",
                properties: {
                  text: { type: "string" },
                  pinned_field: { type: "number" },
                },
                required: ["text"],
              },
            ],
          },
        },
        final_urls: {
          type: "array",
          description: "Landing page URLs",
          items: { type: "string" },
        },
        path1: {
          type: "string",
          description: "First display path segment (max 15 chars)",
        },
        path2: {
          type: "string",
          description: "Second display path segment (max 15 chars)",
        },
        status: {
          type: "string",
          enum: ["ENABLED", "PAUSED"],
          description: "Ad status (defaults to PAUSED for safety)",
        },
        dry_run: {
          type: "boolean",
          description: "Preview changes without applying them",
        },
      },
      required: ["ad_group_id", "headlines", "descriptions", "final_urls"],
    },
    handler: createResponsiveSearchAdHandler(googleAdsService, getActiveCustomerId),
  };

  tools.update_ad_status = {
    name: "update_ad_status",
    description: "Enable, pause, or remove ads",
    inputSchema: {
      type: "object",
      properties: {
        customer_id: {
          type: "string",
          description: "Optional customer ID (uses active account if not provided)",
        },
        ad_ids: {
          type: "array",
          description: "Array of ad IDs to update",
          items: { type: "string" },
        },
        status: {
          type: "string",
          enum: ["ENABLED", "PAUSED", "REMOVED"],
          description: "New status for the ads",
        },
        dry_run: {
          type: "boolean",
          description: "Preview changes without applying them",
        },
      },
      required: ["ad_ids", "status"],
    },
    handler: updateAdStatusHandler(googleAdsService, getActiveCustomerId),
  };

  tools.update_responsive_search_ad = {
    name: "update_responsive_search_ad",
    description: "Update headlines, descriptions, or URLs of a responsive search ad",
    inputSchema: {
      type: "object",
      properties: {
        customer_id: {
          type: "string",
          description: "Optional customer ID (uses active account if not provided)",
        },
        ad_id: {
          type: "string",
          description: "Ad ID to update",
        },
        headlines: {
          type: "array",
          description: "New headlines (3-15 required if provided)",
          items: {
            oneOf: [
              { type: "string" },
              {
                type: "object",
                properties: {
                  text: { type: "string" },
                  pinned_field: { type: "number" },
                },
                required: ["text"],
              },
            ],
          },
        },
        descriptions: {
          type: "array",
          description: "New descriptions (2-4 required if provided)",
          items: {
            oneOf: [
              { type: "string" },
              {
                type: "object",
                properties: {
                  text: { type: "string" },
                  pinned_field: { type: "number" },
                },
                required: ["text"],
              },
            ],
          },
        },
        final_urls: {
          type: "array",
          description: "New landing page URLs",
          items: { type: "string" },
        },
        dry_run: {
          type: "boolean",
          description: "Preview changes without applying them",
        },
      },
      required: ["ad_id"],
    },
    handler: updateResponsiveSearchAdHandler(googleAdsService, getActiveCustomerId),
  };

  // Location targeting tools
  tools.add_location_targets = {
    name: "add_location_targets",
    description: "Add location targeting to a campaign (countries, states, cities)",
    inputSchema: {
      type: "object",
      properties: {
        customer_id: {
          type: "string",
          description: "Optional customer ID (uses active account if not provided)",
        },
        campaign_id: {
          type: "string",
          description: "Campaign ID to add location targeting to",
        },
        locations: {
          type: "array",
          description: "Array of location IDs or objects with {id, name}",
          items: {
            oneOf: [
              { type: "string" },
              { type: "number" },
              {
                type: "object",
                properties: {
                  id: { type: "string" },
                  location_id: { type: "string" },
                  name: { type: "string" },
                },
              },
            ],
          },
        },
        dry_run: {
          type: "boolean",
          description: "Preview changes without applying them",
        },
      },
      required: ["campaign_id", "locations"],
    },
    handler: addLocationTargetsHandler(googleAdsService, getActiveCustomerId),
  };

  tools.exclude_locations = {
    name: "exclude_locations",
    description: "Exclude locations from campaign targeting",
    inputSchema: {
      type: "object",
      properties: {
        customer_id: {
          type: "string",
          description: "Optional customer ID (uses active account if not provided)",
        },
        campaign_id: {
          type: "string",
          description: "Campaign ID to exclude locations from",
        },
        locations: {
          type: "array",
          description: "Array of location IDs to exclude",
          items: {
            oneOf: [
              { type: "string" },
              { type: "number" },
              {
                type: "object",
                properties: {
                  id: { type: "string" },
                  location_id: { type: "string" },
                  name: { type: "string" },
                },
              },
            ],
          },
        },
        dry_run: {
          type: "boolean",
          description: "Preview changes without applying them",
        },
      },
      required: ["campaign_id", "locations"],
    },
    handler: excludeLocationsHandler(googleAdsService, getActiveCustomerId),
  };

  tools.add_radius_target = {
    name: "add_radius_target",
    description: "Target a radius around a specific location",
    inputSchema: {
      type: "object",
      properties: {
        customer_id: {
          type: "string",
          description: "Optional customer ID (uses active account if not provided)",
        },
        campaign_id: {
          type: "string",
          description: "Campaign ID to add radius targeting to",
        },
        latitude: {
          type: "number",
          description: "Latitude of the center point",
        },
        longitude: {
          type: "number",
          description: "Longitude of the center point",
        },
        radius: {
          type: "number",
          description: "Radius to target",
        },
        radius_units: {
          type: "string",
          enum: ["MILES", "KILOMETERS"],
          description: "Units for radius (default: MILES)",
        },
        address: {
          type: "object",
          description: "Optional address details",
          properties: {
            street: { type: "string" },
            city: { type: "string" },
            state: { type: "string" },
            postal_code: { type: "string" },
            country: { type: "string" },
          },
        },
        dry_run: {
          type: "boolean",
          description: "Preview changes without applying them",
        },
      },
      required: ["campaign_id", "latitude", "longitude", "radius"],
    },
    handler: addRadiusTargetHandler(googleAdsService, getActiveCustomerId),
  };

  tools.search_location_targets = {
    name: "search_location_targets",
    description: "Search for location IDs by name or country",
    inputSchema: {
      type: "object",
      properties: {
        customer_id: {
          type: "string",
          description: "Optional customer ID (uses active account if not provided)",
        },
        query: {
          type: "string",
          description: "Location name to search for (e.g., 'New York', 'California')",
        },
        country_code: {
          type: "string",
          description: "Two-letter country code to filter results (e.g., 'US', 'GB')",
        },
        locale: {
          type: "string",
          description: "Locale for results (default: 'en')",
        },
      },
    },
    handler: searchLocationTargetsHandler(googleAdsService, getActiveCustomerId),
  };

  // Language targeting tools
  tools.add_language_targets = {
    name: "add_language_targets",
    description: "Add language targeting to a campaign",
    inputSchema: {
      type: "object",
      properties: {
        customer_id: {
          type: "string",
          description: "Optional customer ID (uses active account if not provided)",
        },
        campaign_id: {
          type: "string",
          description: "Campaign ID to add language targeting to",
        },
        languages: {
          type: "array",
          description: "Array of language codes ('en', 'es') or IDs ('1000', '1003')",
          items: {
            oneOf: [
              { type: "string" },
              {
                type: "object",
                properties: {
                  id: { type: "string" },
                  language_id: { type: "string" },
                  name: { type: "string" },
                },
              },
            ],
          },
        },
        dry_run: {
          type: "boolean",
          description: "Preview changes without applying them",
        },
      },
      required: ["campaign_id", "languages"],
    },
    handler: addLanguageTargetsHandler(googleAdsService, getActiveCustomerId),
  };

  tools.list_available_languages = {
    name: "list_available_languages",
    description: "List common languages available for targeting",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: listAvailableLanguagesHandler(googleAdsService, getActiveCustomerId),
  };

  // Negative keyword tools
  tools.add_negative_keywords = {
    name: "add_negative_keywords",
    description: "Add negative keywords to a campaign or ad group",
    inputSchema: {
      type: "object",
      properties: {
        customer_id: {
          type: "string",
          description: "Optional customer ID (uses active account if not provided)",
        },
        campaign_id: {
          type: "string",
          description: "Campaign ID (required if not using ad_group_id)",
        },
        ad_group_id: {
          type: "string",
          description: "Ad group ID (required if not using campaign_id)",
        },
        keywords: {
          type: "array",
          description: "Array of negative keywords (strings or objects with text, match_type)",
          items: {
            oneOf: [
              { type: "string" },
              {
                type: "object",
                properties: {
                  text: { type: "string" },
                  match_type: {
                    type: "string",
                    enum: ["BROAD", "PHRASE", "EXACT"],
                  },
                },
                required: ["text"],
              },
            ],
          },
        },
        dry_run: {
          type: "boolean",
          description: "Preview changes without applying them",
        },
      },
      required: ["keywords"],
    },
    handler: addNegativeKeywordsHandler(googleAdsService, getActiveCustomerId),
  };

  tools.create_negative_keyword_list = {
    name: "create_negative_keyword_list",
    description: "Create a shared negative keyword list",
    inputSchema: {
      type: "object",
      properties: {
        customer_id: {
          type: "string",
          description: "Optional customer ID (uses active account if not provided)",
        },
        name: {
          type: "string",
          description: "Name for the negative keyword list",
        },
        dry_run: {
          type: "boolean",
          description: "Preview changes without applying them",
        },
      },
      required: ["name"],
    },
    handler: createNegativeKeywordListHandler(googleAdsService, getActiveCustomerId),
  };

  tools.add_keywords_to_negative_list = {
    name: "add_keywords_to_negative_list",
    description: "Add keywords to an existing negative keyword list",
    inputSchema: {
      type: "object",
      properties: {
        customer_id: {
          type: "string",
          description: "Optional customer ID (uses active account if not provided)",
        },
        list_id: {
          type: "string",
          description: "ID of the negative keyword list",
        },
        keywords: {
          type: "array",
          description: "Array of keywords to add to the list",
          items: {
            oneOf: [
              { type: "string" },
              {
                type: "object",
                properties: {
                  text: { type: "string" },
                  match_type: {
                    type: "string",
                    enum: ["BROAD", "PHRASE", "EXACT"],
                  },
                },
                required: ["text"],
              },
            ],
          },
        },
        dry_run: {
          type: "boolean",
          description: "Preview changes without applying them",
        },
      },
      required: ["list_id", "keywords"],
    },
    handler: addKeywordsToNegativeListHandler(googleAdsService, getActiveCustomerId),
  };

  tools.apply_negative_list_to_campaigns = {
    name: "apply_negative_list_to_campaigns",
    description: "Apply a negative keyword list to one or more campaigns",
    inputSchema: {
      type: "object",
      properties: {
        customer_id: {
          type: "string",
          description: "Optional customer ID (uses active account if not provided)",
        },
        list_id: {
          type: "string",
          description: "ID of the negative keyword list to apply",
        },
        campaign_ids: {
          type: "array",
          description: "Array of campaign IDs to apply the list to",
          items: { type: "string" },
        },
        dry_run: {
          type: "boolean",
          description: "Preview changes without applying them",
        },
      },
      required: ["list_id", "campaign_ids"],
    },
    handler: applyNegativeListToCampaignsHandler(googleAdsService, getActiveCustomerId),
  };

  return tools;
}