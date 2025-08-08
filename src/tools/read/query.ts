import { GoogleAdsService } from "../../services/google-ads.js";

export function runGAQLQueryHandler(
  googleAdsService: GoogleAdsService,
  getActiveCustomerId: () => string | undefined
) {
  return async (args: any): Promise<string> => {
    try {
      const customerId = args.customer_id || getActiveCustomerId();
      
      if (!customerId) {
        return "Error: No customer ID provided and no active account set.";
      }

      const query = args.query;
      
      if (!query || typeof query !== "string") {
        return "Error: Invalid query provided. Please provide a valid GAQL query string.";
      }

      const results = await googleAdsService.executeQuery(customerId, query);

      if (!results || results.length === 0) {
        return "No results found for the query.";
      }

      if (results.length > 1000) {
        return JSON.stringify({
          warning: `Query returned ${results.length} rows. Showing first 1000.`,
          results: results.slice(0, 1000),
        }, null, 2);
      }

      return JSON.stringify(results, null, 2);
    } catch (error) {
      return `Error executing query: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  };
}