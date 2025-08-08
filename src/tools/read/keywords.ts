import { GoogleAdsService } from "../../services/google-ads.js";

export function getKeywordsHandler(
  googleAdsService: GoogleAdsService,
  getActiveCustomerId: () => string | undefined
) {
  return async (args: any): Promise<string> => {
    try {
      const customerId = args.customer_id || getActiveCustomerId();
      
      if (!customerId) {
        return "Error: No customer ID provided and no active account set.";
      }

      let filters = ["ad_group_criterion.type = 'KEYWORD'"];
      if (args.campaign_id) {
        filters.push(`campaign.id = ${args.campaign_id}`);
      }
      if (args.ad_group_id) {
        filters.push(`ad_group.id = ${args.ad_group_id}`);
      }

      const query = `
        SELECT
          campaign.id,
          campaign.name,
          ad_group.id,
          ad_group.name,
          ad_group_criterion.criterion_id,
          ad_group_criterion.keyword.text,
          ad_group_criterion.keyword.match_type,
          ad_group_criterion.status,
          ad_group_criterion.quality_info.quality_score,
          ad_group_criterion.cpc_bid_micros,
          ad_group_criterion.position_estimates.first_page_cpc_micros,
          ad_group_criterion.position_estimates.top_of_page_cpc_micros
        FROM keyword_view
        WHERE ${filters.join(" AND ")}
        ORDER BY campaign.name, ad_group.name, ad_group_criterion.keyword.text
        LIMIT 1000
      `;

      const results = await googleAdsService.executeQuery(customerId, query);

      if (!results || results.length === 0) {
        return "No keywords found.";
      }

      const keywords = results.map((row: any) => ({
        campaign_name: row.campaign?.name,
        ad_group_name: row.ad_group?.name,
        keyword: row.ad_group_criterion?.keyword?.text,
        match_type: row.ad_group_criterion?.keyword?.match_type,
        status: row.ad_group_criterion?.status,
        quality_score: row.ad_group_criterion?.quality_info?.quality_score || "N/A",
        cpc_bid: row.ad_group_criterion?.cpc_bid_micros 
          ? `$${googleAdsService.formatCurrency(row.ad_group_criterion.cpc_bid_micros)}`
          : "N/A",
        first_page_cpc: row.ad_group_criterion?.position_estimates?.first_page_cpc_micros
          ? `$${googleAdsService.formatCurrency(row.ad_group_criterion.position_estimates.first_page_cpc_micros)}`
          : "N/A",
        top_of_page_cpc: row.ad_group_criterion?.position_estimates?.top_of_page_cpc_micros
          ? `$${googleAdsService.formatCurrency(row.ad_group_criterion.position_estimates.top_of_page_cpc_micros)}`
          : "N/A",
      }));

      return JSON.stringify(keywords, null, 2);
    } catch (error) {
      return `Error fetching keywords: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  };
}

export function getSearchTermsHandler(
  googleAdsService: GoogleAdsService,
  getActiveCustomerId: () => string | undefined
) {
  return async (args: any): Promise<string> => {
    try {
      const customerId = args.customer_id || getActiveCustomerId();
      
      if (!customerId) {
        return "Error: No customer ID provided and no active account set.";
      }

      const dateRange = args.date_range;
      const campaignFilter = args.campaign_id ? `AND campaign.id = ${args.campaign_id}` : "";

      const query = `
        SELECT
          campaign.name,
          ad_group.name,
          search_term_view.search_term,
          search_term_view.status,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.ctr,
          metrics.average_cpc
        FROM search_term_view
        WHERE segments.date DURING ${dateRange}
          ${campaignFilter}
        ORDER BY metrics.impressions DESC
        LIMIT 500
      `;

      const results = await googleAdsService.executeQuery(customerId, query);

      if (!results || results.length === 0) {
        return "No search terms found for the specified date range.";
      }

      const searchTerms = results.map((row: any) => ({
        campaign: row.campaign?.name,
        ad_group: row.ad_group?.name,
        search_term: row.search_term_view?.search_term,
        status: row.search_term_view?.status,
        impressions: row.metrics?.impressions || 0,
        clicks: row.metrics?.clicks || 0,
        cost: `$${googleAdsService.formatCurrency(row.metrics?.cost_micros || 0)}`,
        conversions: row.metrics?.conversions || 0,
        ctr: `${((row.metrics?.ctr || 0) * 100).toFixed(2)}%`,
        avg_cpc: `$${googleAdsService.formatCurrency(row.metrics?.average_cpc || 0)}`,
      }));

      return JSON.stringify(searchTerms, null, 2);
    } catch (error) {
      return `Error fetching search terms: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  };
}