import { BaseMutationHandler } from "./base.js";
import { GoogleAdsService } from "../../services/google-ads.js";

// Common language codes and their IDs in Google Ads
const LANGUAGE_CODES: Record<string, { id: string; name: string }> = {
  'en': { id: '1000', name: 'English' },
  'es': { id: '1003', name: 'Spanish' },
  'fr': { id: '1002', name: 'French' },
  'de': { id: '1001', name: 'German' },
  'it': { id: '1004', name: 'Italian' },
  'pt': { id: '1014', name: 'Portuguese' },
  'nl': { id: '1010', name: 'Dutch' },
  'ja': { id: '1005', name: 'Japanese' },
  'zh': { id: '1017', name: 'Chinese (simplified)' },
  'zh-TW': { id: '1018', name: 'Chinese (traditional)' },
  'ko': { id: '1012', name: 'Korean' },
  'ar': { id: '1019', name: 'Arabic' },
  'ru': { id: '1015', name: 'Russian' },
  'pl': { id: '1013', name: 'Polish' },
  'tr': { id: '1037', name: 'Turkish' },
  'sv': { id: '1015', name: 'Swedish' },
  'no': { id: '1011', name: 'Norwegian' },
  'da': { id: '1009', name: 'Danish' },
  'fi': { id: '1011', name: 'Finnish' },
  'he': { id: '1027', name: 'Hebrew' },
  'hi': { id: '1023', name: 'Hindi' },
  'th': { id: '1044', name: 'Thai' },
  'vi': { id: '1040', name: 'Vietnamese' },
  'id': { id: '1025', name: 'Indonesian' },
  'ms': { id: '1102', name: 'Malay' },
  'cs': { id: '1008', name: 'Czech' },
  'hu': { id: '1024', name: 'Hungarian' },
  'ro': { id: '1032', name: 'Romanian' },
  'sk': { id: '1033', name: 'Slovak' },
  'bg': { id: '1020', name: 'Bulgarian' },
  'hr': { id: '1039', name: 'Croatian' },
  'sr': { id: '1035', name: 'Serbian' },
  'sl': { id: '1034', name: 'Slovenian' },
  'uk': { id: '1036', name: 'Ukrainian' },
  'el': { id: '1022', name: 'Greek' },
};

export function addLanguageTargetsHandler(
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

    if (!args.languages || !Array.isArray(args.languages) || args.languages.length === 0) {
      throw new Error("Languages array is required and must not be empty");
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
          campaign.name
        FROM campaign 
        WHERE campaign.id = ${args.campaign_id}
      `;

      const results = await googleAdsService.executeQuery(customerId, query);
      if (!results || results.length === 0) {
        throw new Error(`Campaign ${args.campaign_id} not found`);
      }

      const campaign = results[0];

      // Build language criterion operations
      const operations = [];
      const languagesList = [];

      for (const language of args.languages) {
        let languageId: string;
        let languageName: string;

        if (typeof language === 'string') {
          // Check if it's a language code
          const langInfo = LANGUAGE_CODES[language.toLowerCase()];
          if (langInfo) {
            languageId = langInfo.id;
            languageName = langInfo.name;
          } else if (/^\d+$/.test(language)) {
            // It's already an ID
            languageId = language;
            languageName = `Language ID: ${language}`;
          } else {
            throw new Error(`Unknown language code: ${language}. Use language ID or common codes like 'en', 'es', 'fr'`);
          }
        } else if (typeof language === 'object') {
          languageId = language.id || language.language_id;
          languageName = language.name || `Language ID: ${languageId}`;
        } else {
          throw new Error("Each language must be a string code or object with 'id' field");
        }

        operations.push({
          entity: "campaign_criterion",
          operation: "create",
          resource: {
            campaign: `customers/${customerId}/campaigns/${args.campaign_id}`,
            language: {
              language_constant: `languageConstants/${languageId}`,
            },
            negative: false,
          },
        });

        languagesList.push(languageName);
      }

      const preview = await handler.createMutationPreview(
        "Language Targeting",
        campaign.campaign.name,
        [{
          field: "languages",
          oldValue: "All languages",
          newValue: `${operations.length} specific languages`,
        }]
      );

      if (args.dry_run) {
        return `${preview.preview}

Languages to target:
${languagesList.map((l: string) => `  • ${l}`).join('\n')}`;
      }

      // Execute mutations
      const customer = googleAdsService.getCustomer(
        customerId,
        googleAdsService['config'].mccId
      );

      await customer.mutateResources(operations);

      return `✅ Language targeting added successfully!

Campaign: ${campaign.campaign.name}
Languages added: ${operations.length}

${languagesList.map((l: string) => `  • ${l}`).join('\n')}`;
    } catch (error: any) {
      console.error("Error adding language targets:", error);
      throw new Error(`Failed to add language targets: ${error.message}`);
    }
  };
}

export function listAvailableLanguagesHandler(
  googleAdsService: GoogleAdsService,
  getActiveCustomerId: () => string | undefined
) {
  return async (args: any): Promise<string> => {
    try {
      // Return the common languages we support
      const languages = Object.entries(LANGUAGE_CODES)
        .map(([code, info]) => `• ${info.name} (code: ${code}, ID: ${info.id})`)
        .join('\n');

      return `🌐 Available Languages for Targeting:

${languages}

To target languages, use either:
1. Language codes: ['en', 'es', 'fr']
2. Language IDs: ['1000', '1003', '1002']
3. Mixed: ['en', '1003', { id: '1002', name: 'French' }]

Note: These are the most common languages. Google Ads supports many more.
For a complete list, check the Google Ads UI or API documentation.`;
    } catch (error: any) {
      console.error("Error listing languages:", error);
      throw new Error(`Failed to list languages: ${error.message}`);
    }
  };
}