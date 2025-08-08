import { BaseMutationHandler } from "./base.js";
import { GoogleAdsService } from "../../services/google-ads.js";

export function addNegativeKeywordsHandler(
  googleAdsService: GoogleAdsService,
  getActiveCustomerId: () => string | undefined
) {
  return async (args: any): Promise<string> => {
    const customerId = args.customer_id || getActiveCustomerId();
    if (!customerId) {
      throw new Error("No customer ID provided or set as active account");
    }

    if (!args.campaign_id && !args.ad_group_id) {
      throw new Error("Either campaign_id or ad_group_id is required");
    }

    if (args.campaign_id && args.ad_group_id) {
      throw new Error("Specify either campaign_id or ad_group_id, not both");
    }

    if (!args.keywords || !Array.isArray(args.keywords) || args.keywords.length === 0) {
      throw new Error("Keywords array is required and must not be empty");
    }

    const handler = new BaseMutationHandler(googleAdsService, {
      dryRun: args.dry_run || false,
      confirmationMode: args.confirmation_mode !== false,
    });

    try {
      const isCampaignLevel = !!args.campaign_id;
      const targetId = args.campaign_id || args.ad_group_id;
      const targetType = isCampaignLevel ? "campaign" : "ad_group";
      
      // Get target details
      let targetName = "";
      if (isCampaignLevel) {
        const query = `
          SELECT campaign.id, campaign.name
          FROM campaign 
          WHERE campaign.id = ${targetId}
        `;
        const results = await googleAdsService.executeQuery(customerId, query);
        if (results && results.length > 0) {
          targetName = results[0].campaign.name;
        }
      } else {
        const query = `
          SELECT ad_group.id, ad_group.name, campaign.name
          FROM ad_group 
          WHERE ad_group.id = ${targetId}
        `;
        const results = await googleAdsService.executeQuery(customerId, query);
        if (results && results.length > 0) {
          targetName = `${results[0].ad_group.name} (Campaign: ${results[0].campaign.name})`;
        }
      }

      // Build negative keyword operations
      const operations = args.keywords.map((keyword: any) => {
        const keywordText = typeof keyword === 'string' ? keyword : keyword.text;
        const matchType = typeof keyword === 'string' ? 'BROAD' : (keyword.match_type || 'BROAD');

        const resource: any = {
          negative: true,
          keyword: {
            text: keywordText,
            match_type: matchType.toUpperCase(),
          },
        };

        if (isCampaignLevel) {
          resource.campaign = `customers/${customerId}/campaigns/${targetId}`;
          return {
            entity: "campaign_criterion",
            operation: "create",
            resource: resource,
          };
        } else {
          resource.ad_group = `customers/${customerId}/adGroups/${targetId}`;
          return {
            entity: "ad_group_criterion",
            operation: "create",
            resource: resource,
          };
        }
      });

      const keywordsList = args.keywords.map((k: any) => 
        typeof k === 'string' ? `"${k}" (BROAD)` : `"${k.text}" (${k.match_type || 'BROAD'})`
      );

      const preview = await handler.createMutationPreview(
        `Negative Keywords (${targetType} level)`,
        targetName,
        [{
          field: "negative_keywords",
          oldValue: "None",
          newValue: `Adding ${operations.length} negative keywords`,
        }]
      );

      if (args.dry_run) {
        return `${preview.preview}

Negative keywords to add:
${keywordsList.map((k: string) => `  • ${k}`).join('\n')}`;
      }

      // Execute mutations
      const customer = googleAdsService.getCustomer(
        customerId,
        googleAdsService['config'].mccId
      );

      if (isCampaignLevel) {
        await customer.mutateResources(operations);
      } else {
        // For ad group level, use the entity-specific method
        const negativeKeywords = operations.map(op => op.resource);
        await customer.adGroupCriteria.create(negativeKeywords);
      }

      return `✅ Negative keywords added successfully!

${targetType === 'campaign' ? 'Campaign' : 'Ad Group'}: ${targetName}
Negative keywords added: ${operations.length}

${keywordsList.map((k: string) => `  • ${k}`).join('\n')}`;
    } catch (error: any) {
      console.error("Error adding negative keywords:", error);
      throw new Error(`Failed to add negative keywords: ${error.message}`);
    }
  };
}

export function createNegativeKeywordListHandler(
  googleAdsService: GoogleAdsService,
  getActiveCustomerId: () => string | undefined
) {
  return async (args: any): Promise<string> => {
    const customerId = args.customer_id || getActiveCustomerId();
    if (!customerId) {
      throw new Error("No customer ID provided or set as active account");
    }

    if (!args.name) {
      throw new Error("List name is required");
    }

    const handler = new BaseMutationHandler(googleAdsService, {
      dryRun: args.dry_run || false,
      confirmationMode: args.confirmation_mode !== false,
    });

    try {
      // Create shared set for negative keywords
      const sharedSet = {
        name: args.name,
        type: "NEGATIVE_KEYWORDS",
      };

      const preview = await handler.createMutationPreview(
        "Negative Keyword List",
        args.name,
        [{
          field: "name",
          oldValue: "N/A",
          newValue: args.name,
        }]
      );

      if (args.dry_run) {
        return preview.preview;
      }

      const customer = googleAdsService.getCustomer(
        customerId,
        googleAdsService['config'].mccId
      );

      const operation = {
        entity: "shared_set",
        operation: "create",
        resource: sharedSet,
      };

      const response = await customer.mutateResources([operation]);
      
      let sharedSetResourceName;
      if (response.mutate_operation_responses) {
        sharedSetResourceName = response.mutate_operation_responses[0].shared_set_result.resource_name;
      } else if (response.results) {
        sharedSetResourceName = response.results[0].resource_name;
      }

      const sharedSetIdMatch = sharedSetResourceName?.match(/sharedSets\/(\d+)/);
      const sharedSetId = sharedSetIdMatch ? sharedSetIdMatch[1] : "unknown";

      return `✅ Negative keyword list created successfully!

List name: ${args.name}
List ID: ${sharedSetId}

Next steps:
1. Use add_keywords_to_negative_list to add keywords
2. Use apply_negative_list_to_campaigns to apply to campaigns`;
    } catch (error: any) {
      console.error("Error creating negative keyword list:", error);
      throw new Error(`Failed to create negative keyword list: ${error.message}`);
    }
  };
}

export function addKeywordsToNegativeListHandler(
  googleAdsService: GoogleAdsService,
  getActiveCustomerId: () => string | undefined
) {
  return async (args: any): Promise<string> => {
    const customerId = args.customer_id || getActiveCustomerId();
    if (!customerId) {
      throw new Error("No customer ID provided or set as active account");
    }

    if (!args.list_id) {
      throw new Error("List ID is required");
    }

    if (!args.keywords || !Array.isArray(args.keywords) || args.keywords.length === 0) {
      throw new Error("Keywords array is required and must not be empty");
    }

    const handler = new BaseMutationHandler(googleAdsService, {
      dryRun: args.dry_run || false,
      confirmationMode: args.confirmation_mode !== false,
    });

    try {
      // Get shared set details
      const query = `
        SELECT shared_set.id, shared_set.name
        FROM shared_set
        WHERE shared_set.id = ${args.list_id}
          AND shared_set.type = 'NEGATIVE_KEYWORDS'
      `;

      const results = await googleAdsService.executeQuery(customerId, query);
      if (!results || results.length === 0) {
        throw new Error(`Negative keyword list ${args.list_id} not found`);
      }

      const sharedSet = results[0];

      // Build shared criterion operations
      const operations = args.keywords.map((keyword: any) => {
        const keywordText = typeof keyword === 'string' ? keyword : keyword.text;
        const matchType = typeof keyword === 'string' ? 'BROAD' : (keyword.match_type || 'BROAD');

        return {
          entity: "shared_criterion",
          operation: "create",
          resource: {
            shared_set: `customers/${customerId}/sharedSets/${args.list_id}`,
            keyword: {
              text: keywordText,
              match_type: matchType.toUpperCase(),
            },
          },
        };
      });

      const keywordsList = args.keywords.map((k: any) => 
        typeof k === 'string' ? `"${k}" (BROAD)` : `"${k.text}" (${k.match_type || 'BROAD'})`
      );

      const preview = await handler.createMutationPreview(
        "Add to Negative List",
        sharedSet.shared_set.name,
        [{
          field: "keywords",
          oldValue: "Existing keywords",
          newValue: `Adding ${operations.length} keywords`,
        }]
      );

      if (args.dry_run) {
        return `${preview.preview}

Keywords to add:
${keywordsList.map((k: string) => `  • ${k}`).join('\n')}`;
      }

      // Execute mutations
      const customer = googleAdsService.getCustomer(
        customerId,
        googleAdsService['config'].mccId
      );

      await customer.mutateResources(operations);

      return `✅ Keywords added to negative list successfully!

List: ${sharedSet.shared_set.name}
Keywords added: ${operations.length}

${keywordsList.map((k: string) => `  • ${k}`).join('\n')}`;
    } catch (error: any) {
      console.error("Error adding keywords to negative list:", error);
      throw new Error(`Failed to add keywords to negative list: ${error.message}`);
    }
  };
}

export function applyNegativeListToCampaignsHandler(
  googleAdsService: GoogleAdsService,
  getActiveCustomerId: () => string | undefined
) {
  return async (args: any): Promise<string> => {
    const customerId = args.customer_id || getActiveCustomerId();
    if (!customerId) {
      throw new Error("No customer ID provided or set as active account");
    }

    if (!args.list_id) {
      throw new Error("List ID is required");
    }

    if (!args.campaign_ids || !Array.isArray(args.campaign_ids) || args.campaign_ids.length === 0) {
      throw new Error("Campaign IDs array is required and must not be empty");
    }

    const handler = new BaseMutationHandler(googleAdsService, {
      dryRun: args.dry_run || false,
      confirmationMode: args.confirmation_mode !== false,
    });

    try {
      // Get shared set details
      const listQuery = `
        SELECT shared_set.id, shared_set.name
        FROM shared_set
        WHERE shared_set.id = ${args.list_id}
          AND shared_set.type = 'NEGATIVE_KEYWORDS'
      `;

      const listResults = await googleAdsService.executeQuery(customerId, listQuery);
      if (!listResults || listResults.length === 0) {
        throw new Error(`Negative keyword list ${args.list_id} not found`);
      }

      const sharedSet = listResults[0];

      // Get campaign names
      const campaignIdsList = args.campaign_ids.join(',');
      const campaignQuery = `
        SELECT campaign.id, campaign.name
        FROM campaign
        WHERE campaign.id IN (${campaignIdsList})
      `;

      const campaignResults = await googleAdsService.executeQuery(customerId, campaignQuery);
      const campaignNames = campaignResults.map(c => c.campaign.name);

      // Build campaign shared set operations
      const operations = args.campaign_ids.map((campaignId: string) => ({
        entity: "campaign_shared_set",
        operation: "create",
        resource: {
          campaign: `customers/${customerId}/campaigns/${campaignId}`,
          shared_set: `customers/${customerId}/sharedSets/${args.list_id}`,
        },
      }));

      const preview = await handler.createMutationPreview(
        "Apply Negative List",
        sharedSet.shared_set.name,
        [{
          field: "campaigns",
          oldValue: "None",
          newValue: `Applying to ${operations.length} campaigns`,
        }]
      );

      if (args.dry_run) {
        return `${preview.preview}

Campaigns:
${campaignNames.map((name: string) => `  • ${name}`).join('\n')}`;
      }

      // Execute mutations
      const customer = googleAdsService.getCustomer(
        customerId,
        googleAdsService['config'].mccId
      );

      await customer.mutateResources(operations);

      return `✅ Negative keyword list applied successfully!

List: ${sharedSet.shared_set.name}
Applied to ${operations.length} campaigns:

${campaignNames.map((name: string) => `  • ${name}`).join('\n')}`;
    } catch (error: any) {
      console.error("Error applying negative list to campaigns:", error);
      throw new Error(`Failed to apply negative list to campaigns: ${error.message}`);
    }
  };
}