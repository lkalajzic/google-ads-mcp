import { GoogleAdsService } from "../../services/google-ads.js";

export function listAccountsHandler(googleAdsService: GoogleAdsService) {
  return async (args: any): Promise<string> => {
    try {
      // Get directly accessible accounts (usually MCCs)
      const accessibleAccounts = await googleAdsService.listAccessibleAccounts();
      
      let allAccounts: any[] = [];
      let clientAccounts: any[] = [];
      
      // Add accessible accounts
      if (accessibleAccounts && accessibleAccounts.length > 0) {
        allAccounts = accessibleAccounts.map((account: any) => ({
          customer_id: account.customer_id,
          name: "Manager Account (MCC)",
          type: "MCC",
          resource_name: account.resource_name,
        }));
        
        // For each MCC, get its client accounts
        for (const mccAccount of accessibleAccounts) {
          try {
            const query = `
              SELECT 
                customer_client.client_customer,
                customer_client.descriptive_name,
                customer_client.manager,
                customer_client.id,
                customer_client.level
              FROM customer_client
              WHERE customer_client.level <= 1
            `;
            
            console.error(`Fetching client accounts for MCC ${mccAccount.customer_id}`);
            const results = await googleAdsService.executeQuery(mccAccount.customer_id, query);
            
            if (results && results.length > 0) {
              for (const row of results) {
                // Skip the MCC itself
                if (row.customer_client.id === mccAccount.customer_id) continue;
                
                clientAccounts.push({
                  customer_id: row.customer_client.id,
                  name: row.customer_client.descriptive_name || `Client Account ${row.customer_client.id}`,
                  type: row.customer_client.manager ? "Sub-Manager" : "Client",
                  client_customer: row.customer_client.client_customer,
                  level: row.customer_client.level,
                });
              }
            }
          } catch (queryError) {
            console.error(`Error fetching client accounts for MCC ${mccAccount.customer_id}:`, queryError);
          }
        }
      }
      
      // Combine all accounts
      allAccounts = [...allAccounts, ...clientAccounts];
      
      if (allAccounts.length === 0) {
        return "No Google Ads accounts found.";
      }
      
      // Format output
      let output = "📊 Available Google Ads Accounts:\n\n";
      
      // Show MCC accounts first
      const mccAccounts = allAccounts.filter(a => a.type === "MCC");
      if (mccAccounts.length > 0) {
        output += "Manager Accounts (MCC):\n";
        mccAccounts.forEach(acc => {
          output += `  • ${acc.customer_id} - ${acc.name}\n`;
        });
        output += "\n";
      }
      
      // Show client accounts
      const clientAccountsList = allAccounts.filter(a => a.type === "Client");
      if (clientAccountsList.length > 0) {
        output += "Client Accounts (can run operations on these):\n";
        clientAccountsList.forEach(acc => {
          output += `  • ${acc.customer_id} - ${acc.name}\n`;
        });
        
        // Suggest using the first client account
        if (clientAccountsList.length > 0) {
          output += `\n💡 Tip: Use set_active_account with customer_id "${clientAccountsList[0].customer_id}" to start working with this account.`;
        }
      }
      
      // Also return as JSON for programmatic use
      output += "\n\n" + JSON.stringify(allAccounts, null, 2);
      
      return output;
    } catch (error) {
      return `Error listing accounts: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  };
}