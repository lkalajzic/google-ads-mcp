import { google } from 'googleapis';
import { createServer } from 'http';
import { parse } from 'url';
import open from 'open';
import * as fs from 'fs';
import * as path from 'path';

// Load credentials from the root credentials.json file
const credentialsPath = path.join(__dirname, '..', 'credentials.json');

if (!fs.existsSync(credentialsPath)) {
  console.error('❌ Error: credentials.json not found!');
  console.error('Please download OAuth credentials from Google Cloud Console first.');
  process.exit(1);
}

const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
const { client_id, client_secret, redirect_uris } = credentials.installed;

const oauth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0]
);

const SCOPES = ['https://www.googleapis.com/auth/adwords'];

async function getRefreshToken() {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });

  console.log('🚀 Opening browser for Google Ads authorization...');
  console.log('\nIf browser doesn\'t open automatically, visit this URL:');
  console.log(authUrl);
  console.log('\n');
  
  // Try to open browser
  try {
    await open(authUrl);
  } catch (err) {
    console.log('Could not open browser automatically');
  }

  // Create a simple server to receive the auth code
  const server = createServer(async (req, res) => {
    const queryObject = parse(req.url!, true).query;
    const code = queryObject.code as string;

    if (code) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h1>✅ Authorization successful!</h1><p>You can close this window and return to the terminal.</p>');
      server.close();

      try {
        const { tokens } = await oauth2Client.getToken(code);
        console.log('\n✅ Success! Here are your credentials:\n');
        console.log('Add these to your .env file:');
        console.log('=====================================');
        console.log(`GOOGLE_ADS_CLIENT_ID=${client_id}`);
        console.log(`GOOGLE_ADS_CLIENT_SECRET=${client_secret}`);
        console.log(`GOOGLE_ADS_REFRESH_TOKEN=${tokens.refresh_token}`);
        console.log('=====================================\n');
        console.log('📝 Note: Keep your refresh token secure and never commit it to git!');
      } catch (error) {
        console.error('❌ Error getting tokens:', error);
      }
      process.exit(0);
    }
  });

  const PORT = 3000;
  server.listen(PORT, () => {
    console.log(`🔗 Listening on http://localhost:${PORT} for auth callback...`);
  });
}

getRefreshToken();