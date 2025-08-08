import { GoogleAdsService } from "../../services/google-ads.js";

// Get geographic performance breakdown
export function getGeoPerformanceHandler(
  googleAdsService: GoogleAdsService,
  getActiveCustomerId: () => string | undefined
) {
  return async (args: any): Promise<string> => {
    try {
      const customerId = args.customer_id || getActiveCustomerId();
      if (!customerId) {
        return "❌ No active account set. Please use:\n1. list_accounts - to see available accounts\n2. set_active_account - to choose an account";
      }

    const dateRange = args.date_range || "LAST_30_DAYS";
    const campaignFilter = args.campaign_id ? `AND campaign.id = ${args.campaign_id}` : "";
    const minImpressions = args.min_impressions || 0;

    try {
      const query = `
        SELECT
          campaign.id,
          campaign.name,
          geographic_view.country_criterion_id,
          geographic_view.location_type,
          geo_target_constant.name,
          geo_target_constant.canonical_name,
          geo_target_constant.country_code,
          geo_target_constant.target_type,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.ctr,
          metrics.average_cpc,
          metrics.cost_per_conversion,
          metrics.all_conversions,
          metrics.view_through_conversions
        FROM geographic_view
        WHERE segments.date DURING ${dateRange}
          ${campaignFilter}
          AND metrics.impressions > ${minImpressions}
        ORDER BY metrics.impressions DESC
        LIMIT 100
      `;

      console.log(`Executing geo performance query for customer ${customerId}`);
      const results = await googleAdsService.executeQuery(customerId, query);

      if (!results || results.length === 0) {
        return "No geographic performance data found for the specified criteria.";
      }

      // Group by location
      const locationMap = new Map();
      
      results.forEach((row: any) => {
        const locationId = row.geographic_view.country_criterion_id;
        const existing = locationMap.get(locationId) || {
          location: row.geo_target_constant,
          campaigns: new Map(),
          totals: {
            impressions: 0,
            clicks: 0,
            cost: 0,
            conversions: 0,
            allConversions: 0,
            viewThroughConversions: 0
          }
        };

        // Add campaign data
        existing.campaigns.set(row.campaign.id, {
          id: row.campaign.id,
          name: row.campaign.name,
          metrics: row.metrics
        });

        // Update totals
        existing.totals.impressions += parseInt(row.metrics.impressions || 0);
        existing.totals.clicks += parseInt(row.metrics.clicks || 0);
        existing.totals.cost += parseInt(row.metrics.cost_micros || 0);
        existing.totals.conversions += parseFloat(row.metrics.conversions || 0);
        existing.totals.allConversions += parseFloat(row.metrics.all_conversions || 0);
        existing.totals.viewThroughConversions += parseFloat(row.metrics.view_through_conversions || 0);

        locationMap.set(locationId, existing);
      });

      // Format output
      let output = `📍 Geographic Performance Report
Date Range: ${dateRange}
${args.campaign_id ? `Campaign Filter: ${args.campaign_id}` : 'All Campaigns'}

`;

      // Sort by impressions
      const sortedLocations = Array.from(locationMap.entries())
        .sort((a, b) => b[1].totals.impressions - a[1].totals.impressions);

      sortedLocations.forEach(([locationId, data]) => {
        const location = data.location;
        const totals = data.totals;
        const avgCPC = totals.clicks > 0 ? totals.cost / totals.clicks / 1_000_000 : 0;
        const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
        const convRate = totals.clicks > 0 ? (totals.conversions / totals.clicks) * 100 : 0;
        const costPerConv = totals.conversions > 0 ? totals.cost / totals.conversions / 1_000_000 : 0;

        output += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 ${location.name} (${location.country_code})
   ${location.canonical_name}
   Type: ${location.target_type}
   Location ID: ${locationId}

   Performance Metrics:
   • Impressions: ${totals.impressions.toLocaleString()}
   • Clicks: ${totals.clicks.toLocaleString()}
   • CTR: ${ctr.toFixed(2)}%
   • Avg. CPC: $${avgCPC.toFixed(2)}
   • Cost: $${(totals.cost / 1_000_000).toFixed(2)}
   
   Conversions:
   • Conversions: ${totals.conversions.toFixed(2)}
   • Conv. Rate: ${convRate.toFixed(2)}%
   • Cost/Conv: $${costPerConv.toFixed(2)}
   • All Conversions: ${totals.allConversions.toFixed(2)}
   • View-through: ${totals.viewThroughConversions.toFixed(2)}

   Campaign Breakdown (${data.campaigns.size} campaigns):`;

        // Show top campaigns for this location
        const campaignArray = Array.from(data.campaigns.values())
          .sort((a, b) => parseInt(b.metrics.impressions) - parseInt(a.metrics.impressions))
          .slice(0, 3);

        campaignArray.forEach(campaign => {
          const m = campaign.metrics;
          output += `
   - ${campaign.name}
     Impressions: ${parseInt(m.impressions).toLocaleString()} | Clicks: ${m.clicks} | Cost: $${(parseInt(m.cost_micros) / 1_000_000).toFixed(2)}`;
        });
      });

      output += `

Summary:
Total Locations: ${locationMap.size}
Total Impressions: ${sortedLocations.reduce((sum, [_, data]) => sum + data.totals.impressions, 0).toLocaleString()}
Total Cost: $${(sortedLocations.reduce((sum, [_, data]) => sum + data.totals.cost, 0) / 1_000_000).toFixed(2)}`;

      return output;
    } catch (error: any) {
      console.error("Error getting geo performance:", error);
      return `Failed to get geographic performance: ${error.message || 'Unknown error'}\n\nPlease ensure you have:\n1. Set an active account using set_active_account\n2. The account has active campaigns with data`;
    }
    } catch (error: any) {
      console.error("Outer error in geo performance:", error);
      return `Error: ${error.message || 'Unknown error'}\n\nTip: Use list_accounts first, then set_active_account to select a client account.`;
    }
  };
}

// Get device performance breakdown
export function getDevicePerformanceHandler(
  googleAdsService: GoogleAdsService,
  getActiveCustomerId: () => string | undefined
) {
  return async (args: any): Promise<string> => {
    try {
      const customerId = args.customer_id || getActiveCustomerId();
      if (!customerId) {
        return "❌ No active account set. Please use:\n1. list_accounts - to see available accounts\n2. set_active_account - to choose an account";
      }

    const dateRange = args.date_range || "LAST_30_DAYS";
    const campaignFilter = args.campaign_id ? `AND campaign.id = ${args.campaign_id}` : "";

    try {
      const query = `
        SELECT
          campaign.id,
          campaign.name,
          ad_group.id,
          ad_group.name,
          segments.device,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.ctr,
          metrics.average_cpc,
          metrics.cost_per_conversion,
          metrics.average_cpm,
          metrics.interaction_rate,
          metrics.interactions,
          metrics.video_views,
          metrics.average_cpv,
          metrics.search_impression_share
        FROM ad_group
        WHERE segments.date DURING ${dateRange}
          ${campaignFilter}
          AND metrics.impressions > 0
        ORDER BY metrics.impressions DESC
      `;

      console.log(`Executing device performance query for customer ${customerId}`);
      const results = await googleAdsService.executeQuery(customerId, query);

      if (!results || results.length === 0) {
        return "No device performance data found for the specified criteria.";
      }

      // Group by device
      const deviceMap = new Map();
      const deviceNames = {
        2: "MOBILE",
        3: "DESKTOP", 
        4: "TABLET",
        5: "CONNECTED_TV",
        6: "OTHER"
      };

      results.forEach((row: any) => {
        const device = row.segments.device;
        const deviceName = deviceNames[device] || "UNKNOWN";
        
        const existing = deviceMap.get(deviceName) || {
          campaigns: new Map(),
          adGroups: new Map(),
          totals: {
            impressions: 0,
            clicks: 0,
            cost: 0,
            conversions: 0,
            interactions: 0,
            videoViews: 0,
            searchImpressionShare: 0,
            searchImpressionShareCount: 0
          }
        };

        // Track campaigns and ad groups
        existing.campaigns.set(row.campaign.id, row.campaign.name);
        existing.adGroups.set(row.ad_group.id, {
          name: row.ad_group.name,
          campaign: row.campaign.name
        });

        // Update totals
        existing.totals.impressions += parseInt(row.metrics.impressions || 0);
        existing.totals.clicks += parseInt(row.metrics.clicks || 0);
        existing.totals.cost += parseInt(row.metrics.cost_micros || 0);
        existing.totals.conversions += parseFloat(row.metrics.conversions || 0);
        existing.totals.interactions += parseInt(row.metrics.interactions || 0);
        existing.totals.videoViews += parseInt(row.metrics.video_views || 0);
        
        if (row.metrics.search_impression_share) {
          existing.totals.searchImpressionShare += parseFloat(row.metrics.search_impression_share);
          existing.totals.searchImpressionShareCount++;
        }

        // Store individual row for detailed breakdown
        if (!existing.rows) existing.rows = [];
        existing.rows.push(row);

        deviceMap.set(deviceName, existing);
      });

      // Format output
      let output = `📱 Device Performance Report
Date Range: ${dateRange}
${args.campaign_id ? `Campaign Filter: ${args.campaign_id}` : 'All Campaigns'}

`;

      // Sort by impressions
      const sortedDevices = Array.from(deviceMap.entries())
        .sort((a, b) => b[1].totals.impressions - a[1].totals.impressions);

      sortedDevices.forEach(([deviceName, data]) => {
        const totals = data.totals;
        const avgCPC = totals.clicks > 0 ? totals.cost / totals.clicks / 1_000_000 : 0;
        const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
        const convRate = totals.clicks > 0 ? (totals.conversions / totals.clicks) * 100 : 0;
        const costPerConv = totals.conversions > 0 ? totals.cost / totals.conversions / 1_000_000 : 0;
        const avgCPM = totals.impressions > 0 ? (totals.cost / totals.impressions) * 1000 / 1_000_000 : 0;
        const avgSearchIS = totals.searchImpressionShareCount > 0 
          ? totals.searchImpressionShare / totals.searchImpressionShareCount 
          : 0;

        const deviceEmoji = {
          MOBILE: "📱",
          DESKTOP: "💻",
          TABLET: "📱",
          CONNECTED_TV: "📺",
          OTHER: "📟"
        }[deviceName] || "📱";

        output += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${deviceEmoji} ${deviceName}

   Performance Metrics:
   • Impressions: ${totals.impressions.toLocaleString()}
   • Clicks: ${totals.clicks.toLocaleString()}
   • CTR: ${ctr.toFixed(2)}%
   • Avg. CPC: $${avgCPC.toFixed(2)}
   • Avg. CPM: $${avgCPM.toFixed(2)}
   • Cost: $${(totals.cost / 1_000_000).toFixed(2)}
   
   Conversions:
   • Conversions: ${totals.conversions.toFixed(2)}
   • Conv. Rate: ${convRate.toFixed(2)}%
   • Cost/Conv: $${costPerConv.toFixed(2)}
   
   Engagement:
   • Interactions: ${totals.interactions.toLocaleString()}
   • Video Views: ${totals.videoViews.toLocaleString()}
   
   Search Metrics:
   • Avg. Search Impression Share: ${(avgSearchIS * 100).toFixed(1)}%
   
   Coverage:
   • Campaigns: ${data.campaigns.size}
   • Ad Groups: ${data.adGroups.size}`;

        // Show top performing ad groups for this device
        const topAdGroups = data.rows
          .sort((a: any, b: any) => parseInt(b.metrics.impressions) - parseInt(a.metrics.impressions))
          .slice(0, 3);

        output += `

   Top Ad Groups:`;
        topAdGroups.forEach((row: any) => {
          const m = row.metrics;
          output += `
   - ${row.ad_group.name} (${row.campaign.name})
     Impressions: ${parseInt(m.impressions).toLocaleString()} | CTR: ${(parseFloat(m.ctr) * 100).toFixed(2)}% | Conv: ${m.conversions}`;
        });
      });

      // Calculate device share
      const totalImpressions = sortedDevices.reduce((sum, [_, data]) => sum + data.totals.impressions, 0);
      
      output += `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Device Share:`;
      
      sortedDevices.forEach(([deviceName, data]) => {
        const share = (data.totals.impressions / totalImpressions) * 100;
        output += `
   ${deviceName}: ${share.toFixed(1)}% (${data.totals.impressions.toLocaleString()} impressions)`;
      });

      output += `

Summary:
Total Devices: ${deviceMap.size}
Total Impressions: ${totalImpressions.toLocaleString()}
Total Cost: $${(sortedDevices.reduce((sum, [_, data]) => sum + data.totals.cost, 0) / 1_000_000).toFixed(2)}`;

      return output;
    } catch (error: any) {
      console.error("Error getting device performance:", error);
      return `Failed to get device performance: ${error.message || 'Unknown error'}\n\nPlease ensure you have:\n1. Set an active account using set_active_account\n2. The account has active campaigns with data`;
    }
    } catch (error: any) {
      console.error("Outer error in device performance:", error);
      return `Error: ${error.message || 'Unknown error'}\n\nTip: Use list_accounts first, then set_active_account to select a client account.`;
    }
  };
}

// Get demographic performance breakdown
export function getDemographicsHandler(
  googleAdsService: GoogleAdsService,
  getActiveCustomerId: () => string | undefined
) {
  return async (args: any): Promise<string> => {
    try {
      const customerId = args.customer_id || getActiveCustomerId();
      if (!customerId) {
        return "❌ No active account set. Please use:\n1. list_accounts - to see available accounts\n2. set_active_account - to choose an account";
      }

    const dateRange = args.date_range || "LAST_30_DAYS";
    const campaignFilter = args.campaign_id ? `AND campaign.id = ${args.campaign_id}` : "";

    try {
      // Query for age demographics
      const ageQuery = `
        SELECT
          campaign.id,
          campaign.name,
          age_range_view.resource_name,
          ad_group_criterion.age_range.type,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.ctr,
          metrics.average_cpc,
          metrics.conversion_rate,
          metrics.cost_per_conversion
        FROM age_range_view
        WHERE segments.date DURING ${dateRange}
          ${campaignFilter}
          AND metrics.impressions > 0
        ORDER BY metrics.impressions DESC
      `;

      // Query for gender demographics
      const genderQuery = `
        SELECT
          campaign.id,
          campaign.name,
          gender_view.resource_name,
          ad_group_criterion.gender.type,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.ctr,
          metrics.average_cpc,
          metrics.conversion_rate,
          metrics.cost_per_conversion
        FROM gender_view
        WHERE segments.date DURING ${dateRange}
          ${campaignFilter}
          AND metrics.impressions > 0
        ORDER BY metrics.impressions DESC
      `;

      console.log(`Executing demographic queries for customer ${customerId}`);
      const [ageResults, genderResults] = await Promise.all([
        googleAdsService.executeQuery(customerId, ageQuery),
        googleAdsService.executeQuery(customerId, genderQuery)
      ]);

      let output = `👥 Demographic Performance Report
Date Range: ${dateRange}
${args.campaign_id ? `Campaign Filter: ${args.campaign_id}` : 'All Campaigns'}

`;

      // Process age data
      if (ageResults && ageResults.length > 0) {
        output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 AGE BREAKDOWN
`;

        const ageMap = new Map();
        const ageNames = {
          503001: "18-24",
          503002: "25-34", 
          503003: "35-44",
          503004: "45-54",
          503005: "55-64",
          503006: "65+",
          503999: "Undetermined"
        };

        ageResults.forEach((row: any) => {
          // Extract age type from resource name
          const resourceParts = row.age_range_view.resource_name.split('~');
          const ageType = resourceParts[resourceParts.length - 1];
          const ageName = ageNames[ageType] || "Unknown";

          const existing = ageMap.get(ageName) || {
            impressions: 0,
            clicks: 0,
            cost: 0,
            conversions: 0,
            campaigns: new Set()
          };

          existing.impressions += parseInt(row.metrics.impressions || 0);
          existing.clicks += parseInt(row.metrics.clicks || 0);
          existing.cost += parseInt(row.metrics.cost_micros || 0);
          existing.conversions += parseFloat(row.metrics.conversions || 0);
          existing.campaigns.add(row.campaign.name);

          ageMap.set(ageName, existing);
        });

        // Sort by impressions
        const sortedAges = Array.from(ageMap.entries())
          .sort((a, b) => b[1].impressions - a[1].impressions);

        sortedAges.forEach(([age, data]) => {
          const ctr = data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0;
          const convRate = data.clicks > 0 ? (data.conversions / data.clicks) * 100 : 0;
          const avgCPC = data.clicks > 0 ? data.cost / data.clicks / 1_000_000 : 0;

          output += `
${age} Years:
   • Impressions: ${data.impressions.toLocaleString()}
   • Clicks: ${data.clicks.toLocaleString()}
   • CTR: ${ctr.toFixed(2)}%
   • Avg. CPC: $${avgCPC.toFixed(2)}
   • Cost: $${(data.cost / 1_000_000).toFixed(2)}
   • Conversions: ${data.conversions.toFixed(2)}
   • Conv. Rate: ${convRate.toFixed(2)}%
   • Campaigns: ${data.campaigns.size}
`;
        });
      }

      // Process gender data
      if (genderResults && genderResults.length > 0) {
        output += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 GENDER BREAKDOWN
`;

        const genderMap = new Map();
        const genderNames = {
          10: "Male",
          11: "Female",
          20: "Undetermined"
        };

        genderResults.forEach((row: any) => {
          // Extract gender type from resource name
          const resourceParts = row.gender_view.resource_name.split('~');
          const genderType = resourceParts[resourceParts.length - 1];
          const genderName = genderNames[genderType] || "Unknown";

          const existing = genderMap.get(genderName) || {
            impressions: 0,
            clicks: 0,
            cost: 0,
            conversions: 0,
            campaigns: new Set()
          };

          existing.impressions += parseInt(row.metrics.impressions || 0);
          existing.clicks += parseInt(row.metrics.clicks || 0);
          existing.cost += parseInt(row.metrics.cost_micros || 0);
          existing.conversions += parseFloat(row.metrics.conversions || 0);
          existing.campaigns.add(row.campaign.name);

          genderMap.set(genderName, existing);
        });

        // Sort by impressions
        const sortedGenders = Array.from(genderMap.entries())
          .sort((a, b) => b[1].impressions - a[1].impressions);

        sortedGenders.forEach(([gender, data]) => {
          const ctr = data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0;
          const convRate = data.clicks > 0 ? (data.conversions / data.clicks) * 100 : 0;
          const avgCPC = data.clicks > 0 ? data.cost / data.clicks / 1_000_000 : 0;
          const costPerConv = data.conversions > 0 ? data.cost / data.conversions / 1_000_000 : 0;

          output += `
${gender}:
   • Impressions: ${data.impressions.toLocaleString()}
   • Clicks: ${data.clicks.toLocaleString()}
   • CTR: ${ctr.toFixed(2)}%
   • Avg. CPC: $${avgCPC.toFixed(2)}
   • Cost: $${(data.cost / 1_000_000).toFixed(2)}
   • Conversions: ${data.conversions.toFixed(2)}
   • Conv. Rate: ${convRate.toFixed(2)}%
   • Cost/Conv: $${costPerConv.toFixed(2)}
   • Campaigns: ${data.campaigns.size}
`;
        });

        // Calculate gender share
        const totalImpressions = sortedGenders.reduce((sum, [_, data]) => sum + data.impressions, 0);
        
        output += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Demographics Summary:

Gender Distribution:`;
        
        sortedGenders.forEach(([gender, data]) => {
          const share = (data.impressions / totalImpressions) * 100;
          output += `
   ${gender}: ${share.toFixed(1)}%`;
        });
      }

      if ((!ageResults || ageResults.length === 0) && (!genderResults || genderResults.length === 0)) {
        output += "\nNo demographic data found. This might be because:\n";
        output += "- Demographic targeting is not enabled\n";
        output += "- The account doesn't have enough data\n";
        output += "- Privacy thresholds haven't been met";
      }

      return output;
    } catch (error: any) {
      console.error("Error getting demographics:", error);
      return `Failed to get demographic performance: ${error.message || 'Unknown error'}\n\nPlease ensure you have:\n1. Set an active account using set_active_account\n2. The account has active campaigns with data`;
    }
    } catch (error: any) {
      console.error("Outer error in demographics:", error);
      return `Error: ${error.message || 'Unknown error'}\n\nTip: Use list_accounts first, then set_active_account to select a client account.`;
    }
  };
}

// Get ad schedule (hour of day / day of week) performance
export function getAdScheduleHandler(
  googleAdsService: GoogleAdsService,
  getActiveCustomerId: () => string | undefined
) {
  return async (args: any): Promise<string> => {
    try {
      const customerId = args.customer_id || getActiveCustomerId();
      if (!customerId) {
        return "❌ No active account set. Please use:\n1. list_accounts - to see available accounts\n2. set_active_account - to choose an account";
      }

    const dateRange = args.date_range || "LAST_30_DAYS";
    const campaignFilter = args.campaign_id ? `AND campaign.id = ${args.campaign_id}` : "";

    try {
      const query = `
        SELECT
          campaign.id,
          campaign.name,
          segments.hour,
          segments.day_of_week,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.ctr,
          metrics.average_cpc,
          metrics.conversion_rate,
          metrics.cost_per_conversion
        FROM campaign
        WHERE segments.date DURING ${dateRange}
          ${campaignFilter}
          AND metrics.impressions > 0
        ORDER BY segments.day_of_week, segments.hour
      `;

      console.log(`Executing ad schedule query for customer ${customerId}`);
      const results = await googleAdsService.executeQuery(customerId, query);

      if (!results || results.length === 0) {
        return "No ad schedule performance data found for the specified criteria.";
      }

      // Process data by hour and day
      const hourMap = new Map();
      const dayMap = new Map();
      const dayNames = {
        2: "Monday",
        3: "Tuesday", 
        4: "Wednesday",
        5: "Thursday",
        6: "Friday",
        7: "Saturday",
        1: "Sunday"
      };

      results.forEach((row: any) => {
        const hour = row.segments.hour;
        const dayOfWeek = row.segments.day_of_week;
        const dayName = dayNames[dayOfWeek] || "Unknown";

        // Aggregate by hour
        const hourData = hourMap.get(hour) || {
          impressions: 0,
          clicks: 0,
          cost: 0,
          conversions: 0
        };
        
        hourData.impressions += parseInt(row.metrics.impressions || 0);
        hourData.clicks += parseInt(row.metrics.clicks || 0);
        hourData.cost += parseInt(row.metrics.cost_micros || 0);
        hourData.conversions += parseFloat(row.metrics.conversions || 0);
        
        hourMap.set(hour, hourData);

        // Aggregate by day
        const dayData = dayMap.get(dayName) || {
          impressions: 0,
          clicks: 0,
          cost: 0,
          conversions: 0,
          hourlyData: new Map()
        };
        
        dayData.impressions += parseInt(row.metrics.impressions || 0);
        dayData.clicks += parseInt(row.metrics.clicks || 0);
        dayData.cost += parseInt(row.metrics.cost_micros || 0);
        dayData.conversions += parseFloat(row.metrics.conversions || 0);
        
        // Store hourly breakdown for each day
        const hourlyMetrics = dayData.hourlyData.get(hour) || {
          impressions: 0,
          clicks: 0,
          conversions: 0
        };
        hourlyMetrics.impressions += parseInt(row.metrics.impressions || 0);
        hourlyMetrics.clicks += parseInt(row.metrics.clicks || 0);
        hourlyMetrics.conversions += parseFloat(row.metrics.conversions || 0);
        dayData.hourlyData.set(hour, hourlyMetrics);
        
        dayMap.set(dayName, dayData);
      });

      // Format output
      let output = `⏰ Ad Schedule Performance Report
Date Range: ${dateRange}
${args.campaign_id ? `Campaign Filter: ${args.campaign_id}` : 'All Campaigns'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 PERFORMANCE BY DAY OF WEEK
`;

      // Sort days in order
      const orderedDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      orderedDays.forEach(dayName => {
        const data = dayMap.get(dayName);
        if (!data) return;

        const ctr = data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0;
        const convRate = data.clicks > 0 ? (data.conversions / data.clicks) * 100 : 0;
        const avgCPC = data.clicks > 0 ? data.cost / data.clicks / 1_000_000 : 0;

        output += `
${dayName}:
   • Impressions: ${data.impressions.toLocaleString()}
   • Clicks: ${data.clicks.toLocaleString()}
   • CTR: ${ctr.toFixed(2)}%
   • Avg. CPC: $${avgCPC.toFixed(2)}
   • Conversions: ${data.conversions.toFixed(2)}
   • Conv. Rate: ${convRate.toFixed(2)}%
   
   Best Hours:`;

        // Show top 3 hours for this day
        const topHours = Array.from(data.hourlyData.entries())
          .sort((a, b) => b[1].impressions - a[1].impressions)
          .slice(0, 3);

        topHours.forEach(([hour, metrics]) => {
          const hourCtr = metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : 0;
          output += `
   - ${hour}:00: ${metrics.impressions.toLocaleString()} impr, ${hourCtr.toFixed(1)}% CTR`;
        });
      });

      output += `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🕐 PERFORMANCE BY HOUR OF DAY
`;

      // Find best and worst performing hours
      const sortedHours = Array.from(hourMap.entries())
        .sort((a, b) => a[0] - b[0]);

      // Calculate metrics for each hour
      const hourlyMetrics = sortedHours.map(([hour, data]) => {
        const ctr = data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0;
        const convRate = data.clicks > 0 ? (data.conversions / data.clicks) * 100 : 0;
        const avgCPC = data.clicks > 0 ? data.cost / data.clicks / 1_000_000 : 0;
        
        return {
          hour,
          data,
          ctr,
          convRate,
          avgCPC
        };
      });

      // Find peak hours
      const peakHours = hourlyMetrics
        .sort((a, b) => b.data.impressions - a.data.impressions)
        .slice(0, 5);

      output += `
Top 5 Peak Hours:`;
      peakHours.forEach(({ hour, data, ctr, convRate, avgCPC }) => {
        output += `
${hour}:00 - ${(hour + 1) % 24}:00
   • Impressions: ${data.impressions.toLocaleString()}
   • CTR: ${ctr.toFixed(2)}%
   • Conv. Rate: ${convRate.toFixed(2)}%
   • Avg. CPC: $${avgCPC.toFixed(2)}
`;
      });

      // Create hourly heatmap
      output += `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 HOURLY HEATMAP (Impressions)

Hour  00 01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19 20 21 22 23
      `;

      const maxImpressions = Math.max(...hourlyMetrics.map(h => h.data.impressions));
      let heatmapLine = "";
      
      for (let h = 0; h < 24; h++) {
        const hourData = hourMap.get(h);
        if (hourData) {
          const ratio = hourData.impressions / maxImpressions;
          if (ratio > 0.8) heatmapLine += "█ ";
          else if (ratio > 0.6) heatmapLine += "▓ ";
          else if (ratio > 0.4) heatmapLine += "▒ ";
          else if (ratio > 0.2) heatmapLine += "░ ";
          else heatmapLine += "· ";
        } else {
          heatmapLine += "  ";
        }
      }
      
      output += heatmapLine;

      // Summary stats
      const totalImpressions = Array.from(hourMap.values()).reduce((sum, data) => sum + data.impressions, 0);
      const totalCost = Array.from(hourMap.values()).reduce((sum, data) => sum + data.cost, 0);
      const totalConversions = Array.from(hourMap.values()).reduce((sum, data) => sum + data.conversions, 0);

      output += `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 INSIGHTS & RECOMMENDATIONS

Best Performing Times:`;

      // Find best CTR hours
      const bestCtrHours = hourlyMetrics
        .filter(h => h.data.impressions > 100) // Min threshold
        .sort((a, b) => b.ctr - a.ctr)
        .slice(0, 3);

      output += `
• Highest CTR: `;
      bestCtrHours.forEach(({ hour, ctr }) => {
        output += `${hour}:00 (${ctr.toFixed(2)}%), `;
      });

      // Find best conversion rate hours
      const bestConvHours = hourlyMetrics
        .filter(h => h.data.clicks > 10) // Min threshold
        .sort((a, b) => b.convRate - a.convRate)
        .slice(0, 3);

      output += `
• Best Conv. Rate: `;
      bestConvHours.forEach(({ hour, convRate }) => {
        output += `${hour}:00 (${convRate.toFixed(2)}%), `;
      });

      output += `

Summary:
Total Impressions: ${totalImpressions.toLocaleString()}
Total Cost: $${(totalCost / 1_000_000).toFixed(2)}
Total Conversions: ${totalConversions.toFixed(2)}`;

      return output;
    } catch (error: any) {
      console.error("Error getting ad schedule:", error);
      return `Failed to get ad schedule performance: ${error.message || 'Unknown error'}\n\nPlease ensure you have:\n1. Set an active account using set_active_account\n2. The account has active campaigns with data`;
    }
    } catch (error: any) {
      console.error("Outer error in ad schedule:", error);
      return `Error: ${error.message || 'Unknown error'}\n\nTip: Use list_accounts first, then set_active_account to select a client account.`;
    }
  };
}

// Get audience performance (remarketing, interests, etc.)
export function getAudiencesHandler(
  googleAdsService: GoogleAdsService,
  getActiveCustomerId: () => string | undefined
) {
  return async (args: any): Promise<string> => {
    try {
      const customerId = args.customer_id || getActiveCustomerId();
      if (!customerId) {
        return "❌ No active account set. Please use:\n1. list_accounts - to see available accounts\n2. set_active_account - to choose an account";
      }

    const dateRange = args.date_range || "LAST_30_DAYS";
    const campaignFilter = args.campaign_id ? `AND campaign.id = ${args.campaign_id}` : "";

    try {
      // Query for detailed audience data
      const query = `
        SELECT
          campaign.id,
          campaign.name,
          ad_group.id,
          ad_group.name,
          ad_group_criterion.criterion_id,
          ad_group_criterion.type,
          ad_group_criterion.user_interest.user_interest_category,
          ad_group_criterion.user_list.user_list,
          ad_group_criterion.custom_audience.custom_audience,
          ad_group_criterion.combined_audience.combined_audience,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.ctr,
          metrics.average_cpc,
          metrics.cost_per_conversion,
          metrics.all_conversions
        FROM ad_group_audience_view
        WHERE segments.date DURING ${dateRange}
          ${campaignFilter}
          AND metrics.impressions > 0
        ORDER BY metrics.impressions DESC
        LIMIT 200
      `;

      console.log(`Executing audience performance query for customer ${customerId}`);
      const results = await googleAdsService.executeQuery(customerId, query);

      if (!results || results.length === 0) {
        return "No audience performance data found. This might be because:\n- No audiences are currently targeted\n- The selected date range has no audience data\n- Audience targeting is not enabled for the campaigns";
      }

      // Group audiences by type
      const audienceTypes = {
        USER_INTEREST: "Interest-based",
        USER_LIST: "Remarketing Lists",
        CUSTOM_AUDIENCE: "Custom Audiences",
        COMBINED_AUDIENCE: "Combined Audiences",
        CUSTOM_INTENT: "Custom Intent",
        CUSTOM_AFFINITY: "Custom Affinity"
      };

      const audienceMap = new Map();

      results.forEach((row: any) => {
        const type = row.ad_group_criterion.type;
        const typeName = audienceTypes[type] || type;
        
        const existing = audienceMap.get(typeName) || {
          audiences: new Map(),
          totals: {
            impressions: 0,
            clicks: 0,
            cost: 0,
            conversions: 0,
            allConversions: 0
          }
        };

        // Create audience identifier
        let audienceName = "Unknown Audience";
        let audienceId = row.ad_group_criterion.criterion_id;
        
        if (row.ad_group_criterion.user_interest?.user_interest_category) {
          audienceName = row.ad_group_criterion.user_interest.user_interest_category.split('/').pop();
        } else if (row.ad_group_criterion.user_list?.user_list) {
          audienceName = `List: ${row.ad_group_criterion.user_list.user_list.split('/').pop()}`;
        } else if (row.ad_group_criterion.custom_audience?.custom_audience) {
          audienceName = `Custom: ${row.ad_group_criterion.custom_audience.custom_audience.split('/').pop()}`;
        }

        const audienceData = existing.audiences.get(audienceId) || {
          name: audienceName,
          campaigns: new Set(),
          adGroups: new Set(),
          metrics: {
            impressions: 0,
            clicks: 0,
            cost: 0,
            conversions: 0,
            allConversions: 0
          }
        };

        // Update audience data
        audienceData.campaigns.add(row.campaign.name);
        audienceData.adGroups.add(row.ad_group.name);
        audienceData.metrics.impressions += parseInt(row.metrics.impressions || 0);
        audienceData.metrics.clicks += parseInt(row.metrics.clicks || 0);
        audienceData.metrics.cost += parseInt(row.metrics.cost_micros || 0);
        audienceData.metrics.conversions += parseFloat(row.metrics.conversions || 0);
        audienceData.metrics.allConversions += parseFloat(row.metrics.all_conversions || 0);

        existing.audiences.set(audienceId, audienceData);

        // Update totals
        existing.totals.impressions += parseInt(row.metrics.impressions || 0);
        existing.totals.clicks += parseInt(row.metrics.clicks || 0);
        existing.totals.cost += parseInt(row.metrics.cost_micros || 0);
        existing.totals.conversions += parseFloat(row.metrics.conversions || 0);
        existing.totals.allConversions += parseFloat(row.metrics.all_conversions || 0);

        audienceMap.set(typeName, existing);
      });

      // Format output
      let output = `🎯 Audience Performance Report
Date Range: ${dateRange}
${args.campaign_id ? `Campaign Filter: ${args.campaign_id}` : 'All Campaigns'}

`;

      // Sort audience types by impressions
      const sortedTypes = Array.from(audienceMap.entries())
        .sort((a, b) => b[1].totals.impressions - a[1].totals.impressions);

      sortedTypes.forEach(([typeName, typeData]) => {
        const totals = typeData.totals;
        const avgCPC = totals.clicks > 0 ? totals.cost / totals.clicks / 1_000_000 : 0;
        const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
        const convRate = totals.clicks > 0 ? (totals.conversions / totals.clicks) * 100 : 0;
        const costPerConv = totals.conversions > 0 ? totals.cost / totals.conversions / 1_000_000 : 0;

        output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 ${typeName.toUpperCase()} (${typeData.audiences.size} audiences)

Overall Performance:
   • Impressions: ${totals.impressions.toLocaleString()}
   • Clicks: ${totals.clicks.toLocaleString()}
   • CTR: ${ctr.toFixed(2)}%
   • Avg. CPC: $${avgCPC.toFixed(2)}
   • Cost: $${(totals.cost / 1_000_000).toFixed(2)}
   • Conversions: ${totals.conversions.toFixed(2)}
   • Conv. Rate: ${convRate.toFixed(2)}%
   • Cost/Conv: $${costPerConv.toFixed(2)}
   • All Conversions: ${totals.allConversions.toFixed(2)}

Top Performing Audiences:
`;

        // Sort audiences by impressions
        const sortedAudiences = Array.from(typeData.audiences.entries())
          .sort((a, b) => b[1].metrics.impressions - a[1].metrics.impressions)
          .slice(0, 5);

        sortedAudiences.forEach(([audienceId, audienceData], index) => {
          const m = audienceData.metrics;
          const audCtr = m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0;
          const audConvRate = m.clicks > 0 ? (m.conversions / m.clicks) * 100 : 0;
          const audCPC = m.clicks > 0 ? m.cost / m.clicks / 1_000_000 : 0;

          output += `
${index + 1}. ${audienceData.name} (ID: ${audienceId})
   • Impressions: ${m.impressions.toLocaleString()}
   • CTR: ${audCtr.toFixed(2)}%
   • Conv. Rate: ${audConvRate.toFixed(2)}%
   • Avg. CPC: $${audCPC.toFixed(2)}
   • Campaigns: ${audienceData.campaigns.size}
   • Ad Groups: ${audienceData.adGroups.size}
`;
        });
      });

      // Calculate audience type distribution
      const totalImpressions = sortedTypes.reduce((sum, [_, data]) => sum + data.totals.impressions, 0);
      
      output += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 AUDIENCE TYPE DISTRIBUTION
`;
      
      sortedTypes.forEach(([typeName, data]) => {
        const share = (data.totals.impressions / totalImpressions) * 100;
        const bar = "█".repeat(Math.floor(share / 2));
        output += `
${typeName}: ${share.toFixed(1)}%
${bar} ${data.totals.impressions.toLocaleString()} impressions`;
      });

      // Performance insights
      output += `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 INSIGHTS & RECOMMENDATIONS

Performance Highlights:`;

      // Find best performing audience by CTR
      let bestCtrAudience = null;
      let bestCtr = 0;
      
      sortedTypes.forEach(([_, typeData]) => {
        typeData.audiences.forEach((audience, id) => {
          if (audience.metrics.impressions > 100) { // Min threshold
            const ctr = (audience.metrics.clicks / audience.metrics.impressions) * 100;
            if (ctr > bestCtr) {
              bestCtr = ctr;
              bestCtrAudience = audience;
            }
          }
        });
      });

      if (bestCtrAudience) {
        output += `
• Best CTR: ${bestCtrAudience.name} (${bestCtr.toFixed(2)}%)`;
      }

      // Find best converting audience
      let bestConvAudience = null;
      let bestConvRate = 0;
      
      sortedTypes.forEach(([_, typeData]) => {
        typeData.audiences.forEach((audience, id) => {
          if (audience.metrics.clicks > 10) { // Min threshold
            const convRate = (audience.metrics.conversions / audience.metrics.clicks) * 100;
            if (convRate > bestConvRate) {
              bestConvRate = convRate;
              bestConvAudience = audience;
            }
          }
        });
      });

      if (bestConvAudience) {
        output += `
• Best Conv. Rate: ${bestConvAudience.name} (${bestConvRate.toFixed(2)}%)`;
      }

      output += `

Summary:
Total Audience Types: ${audienceMap.size}
Total Unique Audiences: ${sortedTypes.reduce((sum, [_, data]) => sum + data.audiences.size, 0)}
Total Impressions: ${totalImpressions.toLocaleString()}
Total Cost: $${(sortedTypes.reduce((sum, [_, data]) => sum + data.totals.cost, 0) / 1_000_000).toFixed(2)}`;

      return output;
    } catch (error: any) {
      console.error("Error getting audience performance:", error);
      return `Failed to get audience performance: ${error.message || 'Unknown error'}\n\nNote: This might occur if:\n1. No audiences are currently targeted\n2. The account has no audience data\n3. You haven't set an active account yet`;
    }
    } catch (error: any) {
      console.error("Outer error in audiences:", error);
      return `Error: ${error.message || 'Unknown error'}\n\nTip: Use list_accounts first, then set_active_account to select a client account.`;
    }
  };
}