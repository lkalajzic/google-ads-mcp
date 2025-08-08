import { GoogleAdsService } from "../services/google-ads.js";

export class AccountValidator {
  private googleAdsService: GoogleAdsService;
  private mccId?: string;
  private cachedAccounts?: any[];

  constructor(googleAdsService: GoogleAdsService, mccId?: string) {
    this.googleAdsService = googleAdsService;
    this.mccId = mccId;
  }

  /**
   * Validates if the given customer ID is a valid client account (not MCC)
   * Returns validation result with helpful error messages
   */
  async validateCustomerId(customerId: string): Promise<{
    valid: boolean;
    isMcc?: boolean;
    message?: string;
    availableAccounts?: any[];
  }> {
    // Remove any hyphens
    const cleanId = customerId.replace(/-/g, "");

    // Check if this is the MCC ID
    if (this.mccId && cleanId === this.mccId) {
      // Get available accounts to help user
      const accounts = await this.getAvailableAccounts();
      
      return {
        valid: false,
        isMcc: true,
        message: `Cannot use MCC account (${customerId}) for operations. Please use one of your client accounts instead.`,
        availableAccounts: accounts
      };
    }

    // Try to verify it's a valid account by attempting a simple query
    try {
      const query = `SELECT customer.id FROM customer WHERE customer.id = ${cleanId} LIMIT 1`;
      await this.googleAdsService.executeQuery(cleanId, query);
      return { valid: true };
    } catch (error: any) {
      // Check if it's an authorization error (account exists but not accessible)
      if (error.message?.includes("CUSTOMER_NOT_FOUND") || error.message?.includes("not authorized")) {
        const accounts = await this.getAvailableAccounts();
        return {
          valid: false,
          message: `Account ${customerId} is not accessible. Please use one of your linked accounts.`,
          availableAccounts: accounts
        };
      }
      
      // Other errors might be temporary
      return {
        valid: false,
        message: `Could not validate account ${customerId}: ${error.message}`
      };
    }
  }

  /**
   * Gets all available client accounts
   */
  async getAvailableAccounts(): Promise<any[]> {
    if (this.cachedAccounts) {
      return this.cachedAccounts;
    }

    try {
      const accounts = await this.googleAdsService.listAccessibleAccounts();
      // Filter out the MCC account if present
      this.cachedAccounts = accounts.filter(acc => {
        const accId = acc.customer_id || acc.resource_name?.split('/')[1];
        return accId !== this.mccId;
      });
      return this.cachedAccounts;
    } catch (error) {
      console.error("Error listing accounts:", error);
      return [];
    }
  }

  /**
   * Suggests the best account to use based on context
   */
  async suggestAccount(context?: string): Promise<string | undefined> {
    const accounts = await this.getAvailableAccounts();
    
    if (accounts.length === 0) {
      return undefined;
    }
    
    if (accounts.length === 1) {
      // Only one account, use it
      return accounts[0].customer_id;
    }
    
    // If there's a default configured, prefer that
    const defaultId = process.env.GOOGLE_ADS_DEFAULT_CUSTOMER_ID;
    if (defaultId && accounts.find(a => a.customer_id === defaultId)) {
      return defaultId;
    }
    
    // Otherwise return the first one
    return accounts[0].customer_id;
  }

  /**
   * Formats account list for display
   */
  formatAccountsList(accounts: any[]): string {
    if (!accounts || accounts.length === 0) {
      return "No accessible accounts found.";
    }

    return accounts.map((acc, index) => {
      const id = acc.customer_id || acc.resource_name?.split('/')[1];
      return `${index + 1}. Account ${id}`;
    }).join('\n');
  }
}