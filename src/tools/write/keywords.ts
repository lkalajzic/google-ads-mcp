import { BaseMutationHandler } from "./base.js";
import { GoogleAdsService } from "../../services/google-ads.js";

export function addKeywordsHandler(
  googleAdsService: GoogleAdsService,
  getActiveCustomerId: () => string | undefined
) {
  return async (args: any): Promise<string> => {
    const customerId = args.customer_id || getActiveCustomerId();
    if (!customerId) {
      throw new Error("No customer ID provided or set as active account");
    }

    if (!args.ad_group_id) {
      throw new Error("Ad group ID is required");
    }

    if (!args.keywords || !Array.isArray(args.keywords) || args.keywords.length === 0) {
      throw new Error("Keywords array is required and must not be empty");
    }

    const handler = new BaseMutationHandler(googleAdsService, {
      dryRun: args.dry_run || false,
      confirmationMode: args.confirmation_mode !== false,
    });

    try {
      // Get ad group details
      const query = `
        SELECT 
          ad_group.id,
          ad_group.name,
          campaign.id,
          campaign.name
        FROM ad_group 
        WHERE ad_group.id = ${args.ad_group_id}
      `;

      const results = await googleAdsService.executeQuery(customerId, query);
      if (!results || results.length === 0) {
        throw new Error(`Ad group ${args.ad_group_id} not found`);
      }

      const adGroup = results[0];

      // Build keyword operations
      const operations = args.keywords.map((keyword: any) => {
        const keywordText = typeof keyword === 'string' ? keyword : keyword.text;
        const matchType = typeof keyword === 'string' ? 'BROAD' : (keyword.match_type || 'BROAD');
        const cpcBidMicros = typeof keyword === 'object' && keyword.cpc_bid 
          ? Math.round(keyword.cpc_bid * 1_000_000) 
          : undefined;

        return {
          entity: "ad_group_criterion",
          operation: "create",
          resource: {
            ad_group: `customers/${customerId}/adGroups/${args.ad_group_id}`,
            status: "ENABLED",
            keyword: {
              text: keywordText,
              match_type: matchType.toUpperCase(),
            },
            ...(cpcBidMicros && {
              cpc_bid_micros: cpcBidMicros,
            }),
          },
        };
      });

      const keywordsList = args.keywords.map((k: any) => 
        typeof k === 'string' ? `"${k}" (BROAD)` : `"${k.text}" (${k.match_type || 'BROAD'})`
      );

      const preview = await handler.createMutationPreview(
        "Keywords",
        `${adGroup.ad_group.name} (Campaign: ${adGroup.campaign.name})`,
        [{
          field: "keywords",
          oldValue: "N/A",
          newValue: `Adding ${operations.length} keywords`,
        }]
      );

      if (args.dry_run) {
        return `${preview.preview}

Keywords to add:
${keywordsList.map((k: string) => `  • ${k}`).join('\n')}`;
      }

      // Execute mutations using the entity-specific method
      const customer = googleAdsService.getCustomer(
        customerId,
        googleAdsService['config'].mccId
      );

      // Convert our operations to the format expected by the API
      const keywordsToCreate = operations.map(op => op.resource);
      
      console.error("Creating keywords:", JSON.stringify(keywordsToCreate, null, 2));
      
      const response = await customer.adGroupCriteria.create(keywordsToCreate);

      return `✅ Keywords added successfully!

Ad Group: ${adGroup.ad_group.name}
Campaign: ${adGroup.campaign.name}
Keywords added: ${operations.length}

${keywordsList.map((k: string) => `  • ${k}`).join('\n')}`;
    } catch (error: any) {
      console.error("Error adding keywords:", error);
      throw new Error(`Failed to add keywords: ${error.message}`);
    }
  };
}

export function updateKeywordBidsHandler(
  googleAdsService: GoogleAdsService,
  getActiveCustomerId: () => string | undefined
) {
  return async (args: any): Promise<string> => {
    const customerId = args.customer_id || getActiveCustomerId();
    if (!customerId) {
      throw new Error("No customer ID provided or set as active account");
    }

    if (!args.keyword_ids || !Array.isArray(args.keyword_ids) || args.keyword_ids.length === 0) {
      throw new Error("Keyword IDs array is required");
    }

    if (args.cpc_bid === undefined) {
      throw new Error("CPC bid is required");
    }

    const handler = new BaseMutationHandler(googleAdsService, {
      dryRun: args.dry_run || false,
      confirmationMode: args.confirmation_mode !== false,
    });

    try {
      // Get current keyword details
      const keywordIdsList = args.keyword_ids.join(',');
      const query = `
        SELECT 
          ad_group_criterion.criterion_id,
          ad_group_criterion.keyword.text,
          ad_group_criterion.keyword.match_type,
          ad_group_criterion.cpc_bid_micros,
          ad_group_criterion.resource_name,
          ad_group_criterion.negative,
          ad_group.name,
          campaign.name
        FROM ad_group_criterion 
        WHERE ad_group_criterion.type = 'KEYWORD'
          AND ad_group_criterion.criterion_id IN (${keywordIdsList})
      `;

      const results = await googleAdsService.executeQuery(customerId, query);
      if (!results || results.length === 0) {
        throw new Error("No keywords found with the provided IDs");
      }

      const newBidMicros = Math.round(args.cpc_bid * 1_000_000);
      const operations = [];
      const changes = [];

      for (const keyword of results) {
        // Skip negative keywords
        if (keyword.ad_group_criterion.negative) {
          console.error(`Skipping negative keyword: ${keyword.ad_group_criterion.keyword.text}`);
          continue;
        }
        
        const oldBidMicros = keyword.ad_group_criterion.cpc_bid_micros || 0;
        
        operations.push({
          entity: "ad_group_criterion",
          operation: "update",
          resource: {
            resource_name: keyword.ad_group_criterion.resource_name,
            cpc_bid_micros: newBidMicros,
          },
          update_mask: ["cpc_bid_micros"],
        });

        changes.push({
          keyword: keyword.ad_group_criterion.keyword.text,
          oldBid: oldBidMicros / 1_000_000,
          newBid: args.cpc_bid,
        });
      }

      if (operations.length === 0) {
        return "ℹ️  No keywords eligible for bid updates (all were negative keywords).";
      }

      const preview = await handler.createMutationPreview(
        "Keyword Bids",
        `${operations.length} keywords`,
        changes.map(c => ({
          field: `"${c.keyword}" bid`,
          oldValue: c.oldBid * 1_000_000,
          newValue: newBidMicros,
        }))
      );

      if (args.dry_run) {
        return preview.preview;
      }

      // Execute mutations
      const customer = googleAdsService.getCustomer(
        customerId,
        googleAdsService['config'].mccId
      );

      await customer.mutateResources(operations);

      return `✅ Keyword bids updated successfully!

Updated ${operations.length} keywords to $${args.cpc_bid} CPC

${changes.map(c => `  • "${c.keyword}": $${c.oldBid.toFixed(2)} → $${c.newBid.toFixed(2)}`).join('\n')}`;
    } catch (error: any) {
      console.error("Error updating keyword bids:", error);
      throw new Error(`Failed to update keyword bids: ${error.message}`);
    }
  };
}

export function pauseKeywordsHandler(
  googleAdsService: GoogleAdsService,
  getActiveCustomerId: () => string | undefined
) {
  return async (args: any): Promise<string> => {
    const customerId = args.customer_id || getActiveCustomerId();
    if (!customerId) {
      throw new Error("No customer ID provided or set as active account");
    }

    if (!args.keyword_ids || !Array.isArray(args.keyword_ids) || args.keyword_ids.length === 0) {
      throw new Error("Keyword IDs array is required");
    }

    const handler = new BaseMutationHandler(googleAdsService, {
      dryRun: args.dry_run || false,
      confirmationMode: args.confirmation_mode !== false,
    });

    try {
      const keywordIdsList = args.keyword_ids.join(',');
      const query = `
        SELECT 
          ad_group_criterion.criterion_id,
          ad_group_criterion.resource_name,
          ad_group_criterion.keyword.text,
          ad_group_criterion.status
        FROM ad_group_criterion 
        WHERE ad_group_criterion.type = 'KEYWORD'
          AND ad_group_criterion.criterion_id IN (${keywordIdsList})
      `;

      const results = await googleAdsService.executeQuery(customerId, query);
      if (!results || results.length === 0) {
        throw new Error("No keywords found with the provided IDs");
      }

      const operations = results
        .filter(k => k.ad_group_criterion.status !== 'PAUSED')
        .map(k => ({
          entity: "ad_group_criterion",
          operation: "update",
          resource: {
            resource_name: k.ad_group_criterion.resource_name,
            status: "PAUSED",
          },
          update_mask: ["status"],
        }));

      if (operations.length === 0) {
        return "ℹ️  All selected keywords are already paused.";
      }

      const preview = await handler.createMutationPreview(
        "Keywords",
        `${operations.length} keywords`,
        [{
          field: "status",
          oldValue: "ENABLED",
          newValue: "PAUSED",
        }]
      );

      if (args.dry_run) {
        return preview.preview;
      }

      // Execute mutations
      const customer = googleAdsService.getCustomer(
        customerId,
        googleAdsService['config'].mccId
      );

      await customer.mutateResources(operations);

      return `✅ Keywords paused successfully!

Paused ${operations.length} keywords.`;
    } catch (error: any) {
      console.error("Error pausing keywords:", error);
      throw new Error(`Failed to pause keywords: ${error.message}`);
    }
  };
}