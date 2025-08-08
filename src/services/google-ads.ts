import { GoogleAdsApi } from "google-ads-api";

export interface GoogleAdsServiceConfig {
  developerToken: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  defaultCustomerId?: string;
  mccId?: string;
}

export class GoogleAdsService {
  private client: any;
  private config: GoogleAdsServiceConfig;

  constructor(config: GoogleAdsServiceConfig) {
    this.config = config;
    this.client = new GoogleAdsApi({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      developer_token: config.developerToken,
    });
  }

  getCustomer(customerId: string, loginCustomerId?: string): any {
    const cleanCustomerId = customerId.replace(/-/g, "");
    const cleanLoginCustomerId = loginCustomerId ? loginCustomerId.replace(/-/g, "") : undefined;
    
    return this.client.Customer({
      customer_id: cleanCustomerId,
      refresh_token: this.config.refreshToken,
      login_customer_id: cleanLoginCustomerId,
    });
  }

  async listAccessibleAccounts(): Promise<any[]> {
    try {
      const result = await this.client.listAccessibleCustomers(this.config.refreshToken);
      // Extract customer IDs from resource names
      if (result && result.resource_names) {
        return result.resource_names.map((resourceName: string) => {
          const customerId = resourceName.split('/')[1];
          return {
            customer_id: customerId,
            resource_name: resourceName
          };
        });
      }
      return [];
    } catch (error) {
      console.error("Error listing accessible accounts:", error);
      throw error;
    }
  }

  formatCurrency(micros: number): string {
    return (micros / 1_000_000).toFixed(2);
  }

  formatDate(date: string): string {
    return date;
  }

  async executeQuery(customerId: string, query: string, loginCustomerId?: string): Promise<any[]> {
    try {
      // Use MCC ID if available and no specific login customer ID provided
      const effectiveLoginCustomerId = loginCustomerId || this.config.mccId;
      const customer = this.getCustomer(customerId, effectiveLoginCustomerId);
      console.error(`Executing query for customer ${customerId}:`, query);
      const results = await customer.query(query);
      return results;
    } catch (error: any) {
      console.error("Error executing query:", error);
      
      // Check for specific Google Ads API errors
      if (error.errors && error.errors[0]) {
        const apiError = error.errors[0];
        const errorCode = apiError.error_code;
        
        if (errorCode?.authorization_error === "DEVELOPER_TOKEN_NOT_APPROVED") {
          throw new Error(
            "Your developer token is only approved for test accounts. " +
            "To access production accounts, you need to apply for Basic or Standard access at: " +
            "https://developers.google.com/google-ads/api/docs/access-levels"
          );
        } else if (errorCode?.authorization_error === "CUSTOMER_NOT_ENABLED") {
          throw new Error(
            "This Google Ads account is not enabled or has been deactivated. " +
            "Please check the account status in Google Ads."
          );
        }
      }
      
      throw error;
    }
  }
}