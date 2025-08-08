import { GoogleAdsService } from "../../services/google-ads.js";

export function getAdsHandler(
  googleAdsService: GoogleAdsService,
  getActiveCustomerId: () => string | undefined
) {
  return async (args: any): Promise<string> => {
    try {
      const customerId = args.customer_id || getActiveCustomerId();
      
      if (!customerId) {
        return "Error: No customer ID provided and no active account set.";
      }

      let filters = ["ad_group_ad.status != 'REMOVED'"];
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
          ad_group_ad.ad.id,
          ad_group_ad.ad.type,
          ad_group_ad.status,
          ad_group_ad.ad.expanded_text_ad.headline_part1,
          ad_group_ad.ad.expanded_text_ad.headline_part2,
          ad_group_ad.ad.expanded_text_ad.headline_part3,
          ad_group_ad.ad.expanded_text_ad.description,
          ad_group_ad.ad.expanded_text_ad.description2,
          ad_group_ad.ad.responsive_search_ad.headlines,
          ad_group_ad.ad.responsive_search_ad.descriptions,
          ad_group_ad.ad.final_urls,
          ad_group_ad.ad.display_url
        FROM ad_group_ad
        WHERE ${filters.join(" AND ")}
        ORDER BY campaign.name, ad_group.name
        LIMIT 500
      `;

      const results = await googleAdsService.executeQuery(customerId, query);

      if (!results || results.length === 0) {
        return "No ads found.";
      }

      const ads = results.map((row: any) => {
        const ad = row.ad_group_ad?.ad;
        let adDetails: any = {
          campaign_name: row.campaign?.name,
          ad_group_name: row.ad_group?.name,
          ad_id: ad?.id,
          type: ad?.type,
          status: row.ad_group_ad?.status,
          final_urls: ad?.final_urls,
          display_url: ad?.display_url,
        };

        if (ad?.type === "EXPANDED_TEXT_AD") {
          adDetails.headlines = [
            ad.expanded_text_ad?.headline_part1,
            ad.expanded_text_ad?.headline_part2,
            ad.expanded_text_ad?.headline_part3,
          ].filter(Boolean);
          adDetails.descriptions = [
            ad.expanded_text_ad?.description,
            ad.expanded_text_ad?.description2,
          ].filter(Boolean);
        } else if (ad?.type === "RESPONSIVE_SEARCH_AD") {
          adDetails.headlines = ad.responsive_search_ad?.headlines?.map((h: any) => h.text) || [];
          adDetails.descriptions = ad.responsive_search_ad?.descriptions?.map((d: any) => d.text) || [];
        }

        return adDetails;
      });

      return JSON.stringify(ads, null, 2);
    } catch (error) {
      return `Error fetching ads: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  };
}