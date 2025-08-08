import { BaseMutationHandler } from "./base.js";
import { GoogleAdsService } from "../../services/google-ads.js";

export function createCampaignHandler(
  googleAdsService: GoogleAdsService,
  getActiveCustomerId: () => string | undefined
) {
  return async (args: any): Promise<string> => {
    const customerId = args.customer_id || getActiveCustomerId();
    if (!customerId) {
      throw new Error("No customer ID provided or set as active account");
    }

    const handler = new BaseMutationHandler(googleAdsService, {
      dryRun: args.dry_run || false,
      confirmationMode: args.confirmation_mode !== false,
    });

    // Validate required fields
    if (!args.name) throw new Error("Campaign name is required");
    if (!args.budget_amount) throw new Error("Budget amount is required");
    if (!args.campaign_type) throw new Error("Campaign type is required");

    // Build campaign object
    const campaign = {
      name: args.name,
      status: args.status === "ENABLED" ? "ENABLED" : "PAUSED", // Default to PAUSED for safety
      campaign_budget: `customers/${customerId}/campaignBudgets/${Date.now()}`, // Temporary ID
      advertising_channel_type: args.campaign_type.toUpperCase(),
      // Add bidding strategy - required!
      manual_cpc: {
        enhanced_cpc_enabled: false,
      },
      // Add network settings for Search campaigns
      ...(args.campaign_type.toUpperCase() === "SEARCH" && {
        network_settings: {
          target_google_search: true,
          target_search_network: args.include_search_partners !== false,
          target_content_network: false,
          target_partner_search_network: false, // Google partners only - disabled for regular accounts
        },
      }),
      // Add shopping settings if needed
      ...(args.campaign_type.toUpperCase() === "SHOPPING" && args.merchant_id && {
        shopping_setting: {
          merchant_id: args.merchant_id,
          campaign_priority: args.priority || 0,
        },
      }),
      // Add tracking template if provided
      ...(args.tracking_url_template && {
        tracking_url_template: args.tracking_url_template,
      }),
      // Add final URL suffix if provided
      ...(args.final_url_suffix && {
        final_url_suffix: args.final_url_suffix,
      }),
    };

    // Build campaign budget
    const campaignBudget = {
      name: `${args.name} - Budget`,
      amount_micros: Math.round(args.budget_amount * 1_000_000),
      delivery_method: args.delivery_method || "STANDARD",
      explicitly_shared: false,
    };

    const preview = await handler.createMutationPreview(
      "Campaign",
      args.name,
      [
        { field: "name", oldValue: "N/A", newValue: args.name },
        { field: "type", oldValue: "N/A", newValue: args.campaign_type },
        { field: "budget", oldValue: 0, newValue: campaignBudget.amount_micros },
        { field: "status", oldValue: "N/A", newValue: campaign.status },
      ]
    );

    if (args.dry_run) {
      return preview.preview;
    }

    try {
      const customer = googleAdsService.getCustomer(
        customerId,
        googleAdsService['config'].mccId
      );

      // First create the budget
      const budgetOperation = {
        entity: "campaign_budget",
        operation: "create",
        resource: campaignBudget,
      };

      const budgetResponse = await customer.mutateResources([budgetOperation]);
      
      // Handle different response formats - check the actual structure
      let budgetResourceName;
      if (budgetResponse.mutate_operation_responses) {
        // New format from the API
        budgetResourceName = budgetResponse.mutate_operation_responses[0].campaign_budget_result.resource_name;
      } else if (budgetResponse.results) {
        // Old format
        budgetResourceName = budgetResponse.results[0].resource_name;
      } else {
        throw new Error("Unexpected response format from budget creation");
      }

      // Update campaign with actual budget resource name
      campaign.campaign_budget = budgetResourceName;

      // Create the campaign
      const campaignOperation = {
        entity: "campaign",
        operation: "create",
        resource: campaign,
      };

      const campaignResponse = await customer.mutateResources([campaignOperation]);
      
      // Handle different response formats
      let campaignResourceName;
      if (campaignResponse.mutate_operation_responses) {
        // New format from the API
        campaignResourceName = campaignResponse.mutate_operation_responses[0].campaign_result.resource_name;
      } else if (campaignResponse.results) {
        // Old format
        campaignResourceName = campaignResponse.results[0].resource_name;
      } else {
        throw new Error("Unexpected response format from campaign creation");
      }

      return `✅ Campaign created successfully!

Campaign: ${args.name}
Resource: ${campaignResourceName}
Status: ${campaign.status}
Budget: $${args.budget_amount}/day
Type: ${args.campaign_type}${args.tracking_url_template ? `
Tracking Template: ${args.tracking_url_template}` : ""}${args.final_url_suffix ? `
URL Suffix: ${args.final_url_suffix}` : ""}

${campaign.status === "PAUSED" ? "ℹ️  Campaign created in PAUSED status for safety. Use update_campaign to enable it." : ""}`;
    } catch (error: any) {
      console.error("Error creating campaign:", error);
      throw new Error(`Failed to create campaign: ${error.message}`);
    }
  };
}

export function updateCampaignHandler(
  googleAdsService: GoogleAdsService,
  getActiveCustomerId: () => string | undefined
) {
  return async (args: any): Promise<string> => {
    const customerId = args.customer_id || getActiveCustomerId();
    if (!customerId) {
      throw new Error("No customer ID provided or set as active account");
    }

    if (!args.campaign_id) {
      throw new Error("Campaign ID is required");
    }

    const handler = new BaseMutationHandler(googleAdsService, {
      dryRun: args.dry_run || false,
      confirmationMode: args.confirmation_mode !== false,
      maxBudgetChange: args.max_budget_change || 1000,
    });

    try {
      // First, get the current campaign details
      const query = `
        SELECT 
          campaign.id,
          campaign.name,
          campaign.status,
          campaign_budget.id,
          campaign_budget.amount_micros,
          campaign_budget.delivery_method
        FROM campaign 
        WHERE campaign.id = ${args.campaign_id}
      `;

      const results = await googleAdsService.executeQuery(customerId, query);
      if (!results || results.length === 0) {
        throw new Error(`Campaign ${args.campaign_id} not found`);
      }

      const current = results[0];
      const changes = [];
      const operations = [];

      // Handle status change
      if (args.status) {
        const newStatusValue = args.status === "ENABLED" ? 2 : 
                              args.status === "PAUSED" ? 3 : 
                              args.status === "REMOVED" ? 4 : null;
        
        if (newStatusValue && newStatusValue !== current.campaign.status) {
          const oldStatusName = current.campaign.status === 2 ? "ENABLED" : 
                               current.campaign.status === 3 ? "PAUSED" : 
                               current.campaign.status === 4 ? "REMOVED" : "UNKNOWN";
          
          changes.push({
            field: "status",
            oldValue: oldStatusName,
            newValue: args.status,
          });

          operations.push({
            entity: "campaign",
            operation: "update",
            resource: {
              resource_name: `customers/${customerId}/campaigns/${args.campaign_id}`,
              status: newStatusValue,
            },
            update_mask: ["status"],
          });
        }
      }

      // Handle budget change
      if (args.budget_amount !== undefined) {
        const newBudgetMicros = Math.round(args.budget_amount * 1_000_000);
        if (newBudgetMicros !== current.campaign_budget.amount_micros) {
          changes.push({
            field: "budget",
            oldValue: current.campaign_budget.amount_micros,
            newValue: newBudgetMicros,
          });

          operations.push({
            entity: "campaign_budget",
            operation: "update",
            resource: {
              resource_name: `customers/${customerId}/campaignBudgets/${current.campaign_budget.id}`,
              amount_micros: newBudgetMicros,
            },
            update_mask: ["amount_micros"],
          });
        }
      }

      // Handle name change
      if (args.name && args.name !== current.campaign.name) {
        changes.push({
          field: "name",
          oldValue: current.campaign.name,
          newValue: args.name,
        });

        operations.push({
          entity: "campaign",
          operation: "update",
          resource: {
            resource_name: `customers/${customerId}/campaigns/${args.campaign_id}`,
            name: args.name,
          },
          update_mask: ["name"],
        });
      }

      // Handle tracking template change
      if (args.tracking_url_template !== undefined) {
        // Need to fetch current tracking template
        const trackingQuery = `
          SELECT campaign.tracking_url_template
          FROM campaign 
          WHERE campaign.id = ${args.campaign_id}
        `;
        const trackingResult = await googleAdsService.executeQuery(customerId, trackingQuery);
        const currentTracking = trackingResult?.[0]?.campaign?.tracking_url_template || "";
        
        if (args.tracking_url_template !== currentTracking) {
          changes.push({
            field: "tracking_url_template",
            oldValue: currentTracking || "None",
            newValue: args.tracking_url_template || "None",
          });

          const updateMask = ["tracking_url_template"];
          const resource: any = {
            resource_name: `customers/${customerId}/campaigns/${args.campaign_id}`,
            tracking_url_template: args.tracking_url_template,
          };

          operations.push({
            entity: "campaign",
            operation: "update",
            resource,
            update_mask: updateMask,
          });
        }
      }

      // Handle final URL suffix change
      if (args.final_url_suffix !== undefined) {
        // Need to fetch current final URL suffix
        const suffixQuery = `
          SELECT campaign.final_url_suffix
          FROM campaign 
          WHERE campaign.id = ${args.campaign_id}
        `;
        const suffixResult = await googleAdsService.executeQuery(customerId, suffixQuery);
        const currentSuffix = suffixResult?.[0]?.campaign?.final_url_suffix || "";
        
        if (args.final_url_suffix !== currentSuffix) {
          changes.push({
            field: "final_url_suffix",
            oldValue: currentSuffix || "None",
            newValue: args.final_url_suffix || "None",
          });

          const updateMask = ["final_url_suffix"];
          const resource: any = {
            resource_name: `customers/${customerId}/campaigns/${args.campaign_id}`,
            final_url_suffix: args.final_url_suffix,
          };

          operations.push({
            entity: "campaign",
            operation: "update",
            resource,
            update_mask: updateMask,
          });
        }
      }

      if (changes.length === 0) {
        return "ℹ️  No changes to apply. All values are already set as requested.";
      }

      const preview = await handler.createMutationPreview(
        "Campaign",
        current.campaign.name,
        changes
      );

      if (args.dry_run) {
        return preview.preview;
      }

      // Execute mutations
      const customer = googleAdsService.getCustomer(
        customerId,
        googleAdsService['config'].mccId
      );

      const response = await customer.mutateResources(operations);

      return `✅ Campaign updated successfully!

Campaign: ${args.name || current.campaign.name}
${changes.map(c => `${handler['formatChange'](c.field, c.oldValue, c.newValue)}`).join('\n')}

${args.status === "ENABLED" && current.campaign.status !== "ENABLED" ? "⚡ Campaign is now live and spending budget!" : ""}`;
    } catch (error: any) {
      console.error("Error updating campaign:", error);
      throw new Error(`Failed to update campaign: ${error.message}`);
    }
  };
}

export function pauseCampaignHandler(
  googleAdsService: GoogleAdsService,
  getActiveCustomerId: () => string | undefined
) {
  return async (args: any): Promise<string> => {
    return updateCampaignHandler(googleAdsService, getActiveCustomerId)({
      ...args,
      status: "PAUSED",
    });
  };
}

export function enableCampaignHandler(
  googleAdsService: GoogleAdsService,
  getActiveCustomerId: () => string | undefined
) {
  return async (args: any): Promise<string> => {
    return updateCampaignHandler(googleAdsService, getActiveCustomerId)({
      ...args,
      status: "ENABLED",
    });
  };
}