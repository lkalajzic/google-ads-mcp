import { GoogleAdsService } from "../../services/google-ads.js";
import { AccountValidator } from "../../utils/account-validator.js";

export function getCampaignsHandler(
  googleAdsService: GoogleAdsService,
  getActiveCustomerId: () => string | undefined
) {
  return async (args: any): Promise<string> => {
    try {
      const customerId = args.customer_id || getActiveCustomerId();
      
      if (!customerId) {
        return "Error: No customer ID provided and no active account set.\n\nPlease use:\n1. list_accounts - to see available accounts\n2. set_active_account - to choose a client account";
      }

      // Only do basic MCC check - don't validate if account is accessible
      // This allows using accounts that the API can't list but are still valid
      if (customerId === process.env.GOOGLE_ADS_MCC_ID) {
        return `Cannot use MCC account (${customerId}) for operations. Please use a client account ID instead.`;
      }

      const includeRemoved = args.include_removed || false;
      const statusFilter = includeRemoved ? "" : "AND campaign.status != 'REMOVED'";

      const query = `
        SELECT
          campaign.id,
          campaign.name,
          campaign.status,
          campaign.advertising_channel_type,
          campaign.bidding_strategy_type,
          campaign_budget.amount_micros,
          campaign.start_date,
          campaign.end_date
        FROM campaign
        WHERE campaign.advertising_channel_type != 'UNSPECIFIED'
        ${statusFilter}
        ORDER BY campaign.name
      `;

      const results = await googleAdsService.executeQuery(customerId, query);

      if (!results || results.length === 0) {
        return "No campaigns found.";
      }

      const campaigns = results.map((row: any) => ({
        id: row.campaign?.id,
        name: row.campaign?.name,
        status: row.campaign?.status,
        type: row.campaign?.advertising_channel_type,
        bidding_strategy: row.campaign?.bidding_strategy_type,
        budget: row.campaign_budget?.amount_micros 
          ? `$${googleAdsService.formatCurrency(row.campaign_budget.amount_micros)}`
          : "N/A",
        start_date: row.campaign?.start_date,
        end_date: row.campaign?.end_date || "Ongoing",
      }));

      return JSON.stringify(campaigns, null, 2);
    } catch (error) {
      return `Error fetching campaigns: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  };
}

export function getCampaignPerformanceHandler(
  googleAdsService: GoogleAdsService,
  getActiveCustomerId: () => string | undefined
) {
  return async (args: any): Promise<string> => {
    try {
      const customerId = args.customer_id || getActiveCustomerId();
      
      if (!customerId) {
        return "Error: No customer ID provided and no active account set.";
      }

      const campaignFilter = args.campaign_id ? `AND campaign.id = ${args.campaign_id}` : "";
      const dateRange = args.date_range;

      let dateFilter = "";
      if (dateRange.includes(":")) {
        const [startDate, endDate] = dateRange.split(":");
        dateFilter = `segments.date BETWEEN '${startDate}' AND '${endDate}'`;
      } else {
        dateFilter = `segments.date DURING ${dateRange}`;
      }

      const query = `
        SELECT
          campaign.id,
          campaign.name,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.conversions_value,
          metrics.ctr,
          metrics.average_cpc,
          metrics.cost_per_conversion
        FROM campaign
        WHERE ${dateFilter}
          AND campaign.status != 'REMOVED'
          ${campaignFilter}
        ORDER BY metrics.impressions DESC
      `;

      const results = await googleAdsService.executeQuery(customerId, query);

      if (!results || results.length === 0) {
        return "No performance data found for the specified date range.";
      }

      const performance = results.map((row: any) => ({
        campaign_id: row.campaign?.id,
        campaign_name: row.campaign?.name,
        impressions: row.metrics?.impressions || 0,
        clicks: row.metrics?.clicks || 0,
        cost: `$${googleAdsService.formatCurrency(row.metrics?.cost_micros || 0)}`,
        conversions: row.metrics?.conversions || 0,
        conversion_value: `$${googleAdsService.formatCurrency(row.metrics?.conversions_value || 0)}`,
        ctr: `${((row.metrics?.ctr || 0) * 100).toFixed(2)}%`,
        avg_cpc: `$${googleAdsService.formatCurrency(row.metrics?.average_cpc || 0)}`,
        cost_per_conversion: row.metrics?.cost_per_conversion 
          ? `$${googleAdsService.formatCurrency(row.metrics.cost_per_conversion)}`
          : "N/A",
      }));

      return JSON.stringify(performance, null, 2);
    } catch (error) {
      return `Error fetching campaign performance: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  };
}