import { BaseMutationHandler } from "./base.js";
import { GoogleAdsService } from "../../services/google-ads.js";

export function createResponsiveSearchAdHandler(
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

    if (!args.headlines || !Array.isArray(args.headlines) || args.headlines.length < 3) {
      throw new Error("At least 3 headlines are required for responsive search ads");
    }

    if (!args.descriptions || !Array.isArray(args.descriptions) || args.descriptions.length < 2) {
      throw new Error("At least 2 descriptions are required for responsive search ads");
    }

    if (!args.final_urls || !Array.isArray(args.final_urls) || args.final_urls.length === 0) {
      throw new Error("At least one final URL is required");
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

      // Build the ad
      const responsiveSearchAd = {
        headlines: args.headlines.map((h: string | any) => ({
          text: typeof h === 'string' ? h : h.text,
          ...(typeof h === 'object' && h.pinned_field !== undefined && {
            pinned_field: `HEADLINE_${h.pinned_field}`
          }),
        })),
        descriptions: args.descriptions.map((d: string | any) => ({
          text: typeof d === 'string' ? d : d.text,
          ...(typeof d === 'object' && d.pinned_field !== undefined && {
            pinned_field: `DESCRIPTION_${d.pinned_field}`
          }),
        })),
        path1: args.path1,
        path2: args.path2,
      };

      const ad = {
        name: args.name,
        final_urls: args.final_urls,
        final_mobile_urls: args.final_mobile_urls,
        tracking_url_template: args.tracking_url_template,
        responsive_search_ad: responsiveSearchAd,
      };

      const adGroupAd = {
        ad_group: `customers/${customerId}/adGroups/${args.ad_group_id}`,
        status: args.status || "PAUSED", // Default to PAUSED for safety
        ad: ad,
      };

      const preview = await handler.createMutationPreview(
        "Responsive Search Ad",
        adGroup.ad_group.name,
        [{
          field: "ad",
          oldValue: "N/A",
          newValue: `${args.headlines.length} headlines, ${args.descriptions.length} descriptions`,
        }]
      );

      if (args.dry_run) {
        return `${preview.preview}

Headlines:
${args.headlines.map((h: any, i: number) => `  ${i + 1}. ${typeof h === 'string' ? h : h.text}${typeof h === 'object' && h.pinned_field ? ` (pinned to position ${h.pinned_field})` : ''}`).join('\n')}

Descriptions:
${args.descriptions.map((d: any, i: number) => `  ${i + 1}. ${typeof d === 'string' ? d : d.text}${typeof d === 'object' && d.pinned_field ? ` (pinned to position ${d.pinned_field})` : ''}`).join('\n')}

Final URLs: ${args.final_urls.join(', ')}
${args.path1 ? `Display path: ${args.path1}${args.path2 ? `/${args.path2}` : ''}` : ''}`;
      }

      // Execute mutation
      const customer = googleAdsService.getCustomer(
        customerId,
        googleAdsService['config'].mccId
      );

      const operation = {
        entity: "ad_group_ad",
        operation: "create",
        resource: adGroupAd,
      };

      const response = await customer.mutateResources([operation]);

      return `✅ Responsive search ad created successfully!

Ad Group: ${adGroup.ad_group.name}
Campaign: ${adGroup.campaign.name}
Status: ${adGroupAd.status}

Headlines: ${args.headlines.length}
Descriptions: ${args.descriptions.length}

${adGroupAd.status === "PAUSED" ? "ℹ️  Ad created in PAUSED status for safety. Use update_ad_status to enable it." : ""}`;
    } catch (error: any) {
      console.error("Error creating responsive search ad:", error);
      throw new Error(`Failed to create ad: ${error.message}`);
    }
  };
}

export function updateAdStatusHandler(
  googleAdsService: GoogleAdsService,
  getActiveCustomerId: () => string | undefined
) {
  return async (args: any): Promise<string> => {
    const customerId = args.customer_id || getActiveCustomerId();
    if (!customerId) {
      throw new Error("No customer ID provided or set as active account");
    }

    if (!args.ad_ids || !Array.isArray(args.ad_ids) || args.ad_ids.length === 0) {
      throw new Error("Ad IDs array is required");
    }

    if (!args.status) {
      throw new Error("Status is required (ENABLED, PAUSED, or REMOVED)");
    }

    const handler = new BaseMutationHandler(googleAdsService, {
      dryRun: args.dry_run || false,
      confirmationMode: args.confirmation_mode !== false,
    });

    try {
      // Get current ad details
      const adIdsList = args.ad_ids.join(',');
      const query = `
        SELECT 
          ad_group_ad.ad.id,
          ad_group_ad.ad.name,
          ad_group_ad.status,
          ad_group_ad.resource_name,
          ad_group.name,
          campaign.name
        FROM ad_group_ad 
        WHERE ad_group_ad.ad.id IN (${adIdsList})
      `;

      const results = await googleAdsService.executeQuery(customerId, query);
      if (!results || results.length === 0) {
        throw new Error("No ads found with the provided IDs");
      }

      const operations = results
        .filter(ad => ad.ad_group_ad.status !== args.status)
        .map(ad => ({
          entity: "ad_group_ad",
          operation: "update",
          resource: {
            resource_name: ad.ad_group_ad.resource_name,
            status: args.status,
          },
          update_mask: ["status"],
        }));

      if (operations.length === 0) {
        return `ℹ️  All selected ads are already ${args.status}.`;
      }

      const preview = await handler.createMutationPreview(
        "Ad Status",
        `${operations.length} ads`,
        [{
          field: "status",
          oldValue: results[0].ad_group_ad.status,
          newValue: args.status,
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

      return `✅ Ad status updated successfully!

Updated ${operations.length} ads to ${args.status}.

${args.status === "ENABLED" ? "⚡ Ads are now live and serving!" : ""}`;
    } catch (error: any) {
      console.error("Error updating ad status:", error);
      throw new Error(`Failed to update ad status: ${error.message}`);
    }
  };
}

export function updateResponsiveSearchAdHandler(
  googleAdsService: GoogleAdsService,
  getActiveCustomerId: () => string | undefined
) {
  return async (args: any): Promise<string> => {
    const customerId = args.customer_id || getActiveCustomerId();
    if (!customerId) {
      throw new Error("No customer ID provided or set as active account");
    }

    if (!args.ad_id) {
      throw new Error("Ad ID is required");
    }

    const handler = new BaseMutationHandler(googleAdsService, {
      dryRun: args.dry_run || false,
      confirmationMode: args.confirmation_mode !== false,
    });

    try {
      // Get current ad details
      const query = `
        SELECT 
          ad_group_ad.ad.id,
          ad_group_ad.ad.responsive_search_ad.headlines,
          ad_group_ad.ad.responsive_search_ad.descriptions,
          ad_group_ad.ad.final_urls,
          ad_group_ad.ad.resource_name,
          ad_group.name,
          campaign.name
        FROM ad_group_ad 
        WHERE ad_group_ad.ad.id = ${args.ad_id}
          AND ad_group_ad.ad.type = 'RESPONSIVE_SEARCH_AD'
      `;

      const results = await googleAdsService.executeQuery(customerId, query);
      if (!results || results.length === 0) {
        throw new Error(`Responsive search ad ${args.ad_id} not found`);
      }

      const currentAd = results[0];
      const updateMask = [];
      const resource: any = {
        resource_name: currentAd.ad_group_ad.ad.resource_name,
      };

      // Build update based on what's provided
      if (args.headlines) {
        if (!Array.isArray(args.headlines) || args.headlines.length < 3) {
          throw new Error("At least 3 headlines are required");
        }
        resource.responsive_search_ad = resource.responsive_search_ad || {};
        resource.responsive_search_ad.headlines = args.headlines.map((h: string | any) => ({
          text: typeof h === 'string' ? h : h.text,
          ...(typeof h === 'object' && h.pinned_field !== undefined && {
            pinned_field: `HEADLINE_${h.pinned_field}`
          }),
        }));
        updateMask.push("responsive_search_ad.headlines");
      }

      if (args.descriptions) {
        if (!Array.isArray(args.descriptions) || args.descriptions.length < 2) {
          throw new Error("At least 2 descriptions are required");
        }
        resource.responsive_search_ad = resource.responsive_search_ad || {};
        resource.responsive_search_ad.descriptions = args.descriptions.map((d: string | any) => ({
          text: typeof d === 'string' ? d : d.text,
          ...(typeof d === 'object' && d.pinned_field !== undefined && {
            pinned_field: `DESCRIPTION_${d.pinned_field}`
          }),
        }));
        updateMask.push("responsive_search_ad.descriptions");
      }

      if (args.final_urls) {
        resource.final_urls = args.final_urls;
        updateMask.push("final_urls");
      }

      if (updateMask.length === 0) {
        return "ℹ️  No changes specified. Please provide headlines, descriptions, or final_urls to update.";
      }

      const changes = [];
      if (args.headlines) {
        changes.push({
          field: "headlines",
          oldValue: `${currentAd.ad_group_ad.ad.responsive_search_ad.headlines.length} headlines`,
          newValue: `${args.headlines.length} headlines`,
        });
      }
      if (args.descriptions) {
        changes.push({
          field: "descriptions",
          oldValue: `${currentAd.ad_group_ad.ad.responsive_search_ad.descriptions.length} descriptions`,
          newValue: `${args.descriptions.length} descriptions`,
        });
      }
      if (args.final_urls) {
        changes.push({
          field: "final_urls",
          oldValue: currentAd.ad_group_ad.ad.final_urls.join(', '),
          newValue: args.final_urls.join(', '),
        });
      }

      const preview = await handler.createMutationPreview(
        "Responsive Search Ad",
        currentAd.ad_group.name,
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
        entity: "ad",
        operation: "update",
        resource: resource,
        update_mask: updateMask,
      };

      await customer.mutateResources([operation]);

      return `✅ Ad updated successfully!

Ad Group: ${currentAd.ad_group.name}
Campaign: ${currentAd.campaign.name}

${changes.map(c => `${c.field}: ${c.newValue}`).join('\n')}`;
    } catch (error: any) {
      console.error("Error updating ad:", error);
      throw new Error(`Failed to update ad: ${error.message}`);
    }
  };
}