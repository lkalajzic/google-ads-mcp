#!/usr/bin/env bun
import { GoogleAdsApi } from 'google-ads-api';
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env') });

async function testConnection() {
  console.log('🔍 Testing Google Ads API connection...\n');

  // Check environment variables
  const required = [
    'GOOGLE_ADS_DEVELOPER_TOKEN',
    'GOOGLE_ADS_CLIENT_ID', 
    'GOOGLE_ADS_CLIENT_SECRET',
    'GOOGLE_ADS_REFRESH_TOKEN'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.log('\n📝 Please check your .env file');
    process.exit(1);
  }

  console.log('✅ All required environment variables found\n');

  try {
    // Initialize Google Ads client
    const client = new GoogleAdsApi({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!
    });

    const customer = client.Customer({
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
      login_customer_id: process.env.GOOGLE_ADS_MCC_ID,
      customer_id: process.env.GOOGLE_ADS_MCC_ID || process.env.GOOGLE_ADS_DEFAULT_CUSTOMER_ID
    });

    console.log('🔄 Attempting to connect to Google Ads API...\n');

    // Try to list accessible customers
    const query = `
      SELECT 
        customer_client.id,
        customer_client.descriptive_name,
        customer_client.manager
      FROM customer_client
      WHERE customer_client.status = 'ENABLED'
    `;

    const results = await customer.query(query);
    
    console.log('✅ Connection successful!\n');
    console.log('📊 Accessible accounts:');
    
    for (const row of results) {
      const type = row.customer_client?.manager ? 'Manager' : 'Client';
      console.log(`   - [${type}] ${row.customer_client?.descriptive_name} (${row.customer_client?.id})`);
    }

    console.log('\n🎉 Everything is working! You can now use the MCP server.');
    
  } catch (error: any) {
    console.error('❌ Connection failed!\n');
    
    if (error.message?.includes('NOT_ADS_USER')) {
      console.error('⚠️  The authenticated user does not have access to Google Ads.');
      console.error('    Please ensure you\'re using the correct Google account.');
    } else if (error.message?.includes('PERMISSION_DENIED')) {
      console.error('⚠️  Permission denied. Check that:');
      console.error('    1. Your developer token is approved');
      console.error('    2. The MCC ID is correct');
      console.error('    3. Your account has proper access');
    } else if (error.message?.includes('UNAUTHENTICATED')) {
      console.error('⚠️  Authentication failed. Your refresh token may be expired.');
      console.error('    Run: bun run generate-token');
    } else {
      console.error('Error details:', error.message || error);
    }
    
    process.exit(1);
  }
}

// Run the test
testConnection().catch(console.error);