import { BaseMutationHandler } from "./base.js";
import { GoogleAdsService } from "../../services/google-ads.js";

export function createAdGroupHandler(
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

    if (!args.name) {
      throw new Error("Ad group name is required");
    }

    const handler = new BaseMutationHandler(googleAdsService, {
      dryRun: args.dry_run || false,
      confirmationMode: args.confirmation_mode !== false,
    });

    try {
      // Get campaign details
      const query = `
        SELECT 
          campaign.id,
          campaign.name,
          campaign.status
        FROM campaign 
        WHERE campaign.id = ${args.campaign_id}
      `;

      const results = await googleAdsService.executeQuery(customerId, query);
      if (!results || results.length === 0) {
        throw new Error(`Campaign ${args.campaign_id} not found`);
      }

      const campaign = results[0];

      // Build ad group object
      const adGroup = {
        campaign: `customers/${customerId}/campaigns/${args.campaign_id}`,
        name: args.name,
        status: args.status === "ENABLED" ? "ENABLED" : "PAUSED", // Default to PAUSED for safety
        type: args.type || "SEARCH_STANDARD",
        cpc_bid_micros: args.cpc_bid ? Math.round(args.cpc_bid * 1_000_000) : undefined,
        // Add targeting criterion type for shopping campaigns
        ...(args.listing_scope && {
          listing_scope: args.listing_scope,
        }),
      };

      const preview = await handler.createMutationPreview(
        "Ad Group",
        campaign.campaign.name,
        [
          { field: "name", oldValue: "N/A", newValue: args.name },
          { field: "status", oldValue: "N/A", newValue: adGroup.status },
          ...(args.cpc_bid ? [{ field: "cpc_bid", oldValue: 0, newValue: adGroup.cpc_bid_micros }] : []),
        ]
      );

      if (args.dry_run) {
        return preview.preview;
      }

      // Execute mutation
      const customer = googleAdsService.getCustomer(
        customerId,
        googleAdsService['config'].mccId
      );

      const operation = {
        entity: "ad_group",
        operation: "create",
        resource: adGroup,
      };

      const response = await customer.mutateResources([operation]);
      
      // Handle response format
      let adGroupResourceName;
      if (response.mutate_operation_responses) {
        adGroupResourceName = response.mutate_operation_responses[0].ad_group_result.resource_name;
      } else if (response.results) {
        adGroupResourceName = response.results[0].resource_name;
      } else {
        throw new Error("Unexpected response format from ad group creation");
      }

      // Extract ad group ID from resource name
      const adGroupIdMatch = adGroupResourceName.match(/adGroups\/(\d+)/);
      const adGroupId = adGroupIdMatch ? adGroupIdMatch[1] : "unknown";

      return `✅ Ad group created successfully!

Campaign: ${campaign.campaign.name}
Ad Group: ${args.name}
ID: ${adGroupId}
Status: ${adGroup.status}
${args.cpc_bid ? `Default CPC Bid: $${args.cpc_bid}` : ''}

${adGroup.status === "PAUSED" ? "ℹ️  Ad group created in PAUSED status for safety. Use update_ad_group to enable it." : ""}`;
    } catch (error: any) {
      console.error("Error creating ad group:", error);
      throw new Error(`Failed to create ad group: ${error.message}`);
    }
  };
}

export function updateAdGroupHandler(
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

    const handler = new BaseMutationHandler(googleAdsService, {
      dryRun: args.dry_run || false,
      confirmationMode: args.confirmation_mode !== false,
    });

    try {
      // Get current ad group details
      const query = `
        SELECT 
          ad_group.id,
          ad_group.name,
          ad_group.status,
          ad_group.cpc_bid_micros,
          campaign.name
        FROM ad_group 
        WHERE ad_group.id = ${args.ad_group_id}
      `;

      const results = await googleAdsService.executeQuery(customerId, query);
      if (!results || results.length === 0) {
        throw new Error(`Ad group ${args.ad_group_id} not found`);
      }

      const current = results[0];
      const changes = [];
      const resource: any = {
        resource_name: `customers/${customerId}/adGroups/${args.ad_group_id}`,
      };
      const updateMask = [];

      // Handle status change
      if (args.status && args.status !== current.ad_group.status) {
        resource.status = args.status;
        updateMask.push("status");
        changes.push({
          field: "status",
          oldValue: current.ad_group.status,
          newValue: args.status,
        });
      }

      // Handle name change
      if (args.name && args.name !== current.ad_group.name) {
        resource.name = args.name;
        updateMask.push("name");
        changes.push({
          field: "name",
          oldValue: current.ad_group.name,
          newValue: args.name,
        });
      }

      // Handle CPC bid change
      if (args.cpc_bid !== undefined) {
        const newBidMicros = Math.round(args.cpc_bid * 1_000_000);
        if (newBidMicros !== current.ad_group.cpc_bid_micros) {
          resource.cpc_bid_micros = newBidMicros;
          updateMask.push("cpc_bid_micros");
          changes.push({
            field: "cpc_bid",
            oldValue: current.ad_group.cpc_bid_micros,
            newValue: newBidMicros,
          });
        }
      }

      if (changes.length === 0) {
        return "ℹ️  No changes to apply. All values are already set as requested.";
      }

      const preview = await handler.createMutationPreview(
        "Ad Group",
        current.ad_group.name,
        changes
      );

      if (args.dry_run) {
        return preview.preview;
      }

      // Execute mutation
      const customer = googleAdsService.getCustomer(
        customerId,
        googleAdsService['config'].mccId
      );

      const operation = {
        entity: "ad_group",
        operation: "update",
        resource: resource,
        update_mask: updateMask,
      };

      await customer.mutateResources([operation]);

      return `✅ Ad group updated successfully!

Campaign: ${current.campaign.name}
Ad Group: ${args.name || current.ad_group.name}
${changes.map(c => `${c.field}: ${c.field === 'cpc_bid' ? `$${(c.oldValue / 1_000_000).toFixed(2)} → $${(c.newValue / 1_000_000).toFixed(2)}` : `${c.oldValue} → ${c.newValue}`}`).join('\n')}`;
    } catch (error: any) {
      console.error("Error updating ad group:", error);
      throw new Error(`Failed to update ad group: ${error.message}`);
    }
  };
}