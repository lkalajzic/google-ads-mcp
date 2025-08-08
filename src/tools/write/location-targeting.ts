import { BaseMutationHandler } from "./base.js";
import { GoogleAdsService } from "../../services/google-ads.js";

export function addLocationTargetsHandler(
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

    if (!args.locations || !Array.isArray(args.locations) || args.locations.length === 0) {
      throw new Error("Locations array is required and must not be empty");
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

      // Build location criterion operations
      const operations = args.locations.map((location: any) => {
        const locationId = typeof location === 'string' || typeof location === 'number' 
          ? location.toString() 
          : location.id || location.location_id;
          
        if (!locationId) {
          throw new Error("Each location must have an ID");
        }

        return {
          entity: "campaign_criterion",
          operation: "create",
          resource: {
            campaign: `customers/${customerId}/campaigns/${args.campaign_id}`,
            location: {
              geo_target_constant: `geoTargetConstants/${locationId}`,
            },
            negative: false, // Positive targeting
          },
        };
      });

      const locationsList = args.locations.map((loc: any) => {
        if (typeof loc === 'object' && loc.name) {
          return `${loc.name} (${loc.id || loc.location_id})`;
        }
        return `Location ID: ${loc}`;
      });

      const preview = await handler.createMutationPreview(
        "Location Targeting",
        campaign.campaign.name,
        [{
          field: "locations",
          oldValue: "None",
          newValue: `Adding ${operations.length} locations`,
        }]
      );

      if (args.dry_run) {
        return `${preview.preview}

Locations to target:
${locationsList.map((l: string) => `  • ${l}`).join('\n')}`;
      }

      // Execute mutations
      const customer = googleAdsService.getCustomer(
        customerId,
        googleAdsService['config'].mccId
      );

      await customer.mutateResources(operations);

      return `✅ Location targeting added successfully!

Campaign: ${campaign.campaign.name}
Locations added: ${operations.length}

${locationsList.map((l: string) => `  • ${l}`).join('\n')}`;
    } catch (error: any) {
      console.error("Error adding location targets:", error);
      throw new Error(`Failed to add location targets: ${error.message}`);
    }
  };
}

export function excludeLocationsHandler(
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

    if (!args.locations || !Array.isArray(args.locations) || args.locations.length === 0) {
      throw new Error("Locations array is required and must not be empty");
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

      // Build location exclusion operations
      const operations = args.locations.map((location: any) => {
        const locationId = typeof location === 'string' || typeof location === 'number' 
          ? location.toString() 
          : location.id || location.location_id;
          
        if (!locationId) {
          throw new Error("Each location must have an ID");
        }

        return {
          entity: "campaign_criterion",
          operation: "create",
          resource: {
            campaign: `customers/${customerId}/campaigns/${args.campaign_id}`,
            location: {
              geo_target_constant: `geoTargetConstants/${locationId}`,
            },
            negative: true, // Negative targeting (exclusion)
          },
        };
      });

      const locationsList = args.locations.map((loc: any) => {
        if (typeof loc === 'object' && loc.name) {
          return `${loc.name} (${loc.id || loc.location_id})`;
        }
        return `Location ID: ${loc}`;
      });

      const preview = await handler.createMutationPreview(
        "Location Exclusions",
        campaign.campaign.name,
        [{
          field: "excluded_locations",
          oldValue: "None",
          newValue: `Excluding ${operations.length} locations`,
        }]
      );

      if (args.dry_run) {
        return `${preview.preview}

Locations to exclude:
${locationsList.map((l: string) => `  • ${l}`).join('\n')}`;
      }

      // Execute mutations
      const customer = googleAdsService.getCustomer(
        customerId,
        googleAdsService['config'].mccId
      );

      await customer.mutateResources(operations);

      return `✅ Location exclusions added successfully!

Campaign: ${campaign.campaign.name}
Locations excluded: ${operations.length}

${locationsList.map((l: string) => `  • ${l}`).join('\n')}`;
    } catch (error: any) {
      console.error("Error excluding locations:", error);
      throw new Error(`Failed to exclude locations: ${error.message}`);
    }
  };
}

export function addRadiusTargetHandler(
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

    if (!args.latitude || !args.longitude) {
      throw new Error("Latitude and longitude are required");
    }

    if (!args.radius) {
      throw new Error("Radius is required");
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

      // Build radius targeting operation
      const operation = {
        entity: "campaign_criterion",
        operation: "create",
        resource: {
          campaign: `customers/${customerId}/campaigns/${args.campaign_id}`,
          proximity: {
            geo_point: {
              latitude_in_micro_degrees: Math.round(args.latitude * 1_000_000),
              longitude_in_micro_degrees: Math.round(args.longitude * 1_000_000),
            },
            radius: args.radius,
            radius_units: args.radius_units || "MILES",
            address: args.address ? {
              street_address: args.address.street,
              city_name: args.address.city,
              province_code: args.address.state,
              postal_code: args.address.postal_code,
              country_code: args.address.country,
            } : undefined,
          },
          negative: false,
        },
      };

      const locationDesc = args.address 
        ? `${args.address.street || ''} ${args.address.city || ''} ${args.address.state || ''}`
        : `${args.latitude}, ${args.longitude}`;

      const preview = await handler.createMutationPreview(
        "Radius Targeting",
        campaign.campaign.name,
        [{
          field: "radius_target",
          oldValue: "None",
          newValue: `${args.radius} ${args.radius_units || 'MILES'} around ${locationDesc}`,
        }]
      );

      if (args.dry_run) {
        return preview.preview;
      }

      // Execute mutation
      const customer = googleAdsService.getCustomer(
        customerId,
        googleAdsService['config'].mccId
      );

      await customer.mutateResources([operation]);

      return `✅ Radius targeting added successfully!

Campaign: ${campaign.campaign.name}
Location: ${locationDesc}
Radius: ${args.radius} ${args.radius_units || 'MILES'}`;
    } catch (error: any) {
      console.error("Error adding radius target:", error);
      throw new Error(`Failed to add radius target: ${error.message}`);
    }
  };
}

export function searchLocationTargetsHandler(
  googleAdsService: GoogleAdsService,
  getActiveCustomerId: () => string | undefined
) {
  return async (args: any): Promise<string> => {
    const customerId = args.customer_id || getActiveCustomerId();
    if (!customerId) {
      throw new Error("No customer ID provided or set as active account");
    }

    if (!args.query && !args.country_code) {
      throw new Error("Either query or country_code is required");
    }

    try {
      const customer = googleAdsService.getCustomer(
        customerId,
        googleAdsService['config'].mccId
      );

      // Build the request
      const request: any = {
        locale: args.locale || "en",
        country_code: args.country_code,
      };

      if (args.query) {
        request.location_names = {
          names: [args.query],
        };
      }

      // Use GAQL query instead of the suggest API which doesn't exist in this client
      // Search for locations matching the query
      const query = `
        SELECT 
          geo_target_constant.id,
          geo_target_constant.name,
          geo_target_constant.country_code,
          geo_target_constant.target_type,
          geo_target_constant.status,
          geo_target_constant.canonical_name
        FROM geo_target_constant
        WHERE geo_target_constant.name LIKE '%${args.query}%'
          ${args.country_code ? `AND geo_target_constant.country_code = '${args.country_code}'` : ''}
          AND geo_target_constant.status = 'ENABLED'
        ORDER BY geo_target_constant.target_type
        LIMIT 20
      `;

      const queryResults = await googleAdsService.executeQuery(customerId, query);

      if (!queryResults || queryResults.length === 0) {
        return "No location targets found for your query.";
      }

      const results = queryResults.map((row: any) => {
        const geo = row.geo_target_constant;
        return {
          id: geo.id,
          name: geo.name,
          country_code: geo.country_code,
          target_type: geo.target_type,
          status: geo.status,
          canonical_name: geo.canonical_name,
        };
      });

      // Format the results
      const output = results.map((loc: any) => 
        `• ${loc.name} (ID: ${loc.id})
  Type: ${loc.target_type}
  Country: ${loc.country_code}
  ${loc.canonical_name ? `Full name: ${loc.canonical_name}` : ''}`
      ).join('\n\n');

      return `📍 Location Search Results:
      
${output}

To use these locations, provide the ID when calling add_location_targets.`;
    } catch (error: any) {
      console.error("Error searching location targets:", error);
      throw new Error(`Failed to search location targets: ${error.message}`);
    }
  };
}