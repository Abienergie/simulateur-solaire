/**
 * Script pour rafraîchir automatiquement le token API Enedis
 * Ce script est exécuté par GitHub Actions toutes les 3 heures
 */

const https = require('https');
const http = require('http');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xpxbxfuckljqdvkajlmx.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_ANON_KEY) {
  console.error('SUPABASE_ANON_KEY environment variable is required');
  process.exit(1);
}

console.log('Starting Enedis token refresh process...');
console.log(`Using Supabase URL: ${SUPABASE_URL}`);

// Fonction pour appeler la fonction Edge Supabase
async function callEdgeFunction(functionName, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/functions/v1/${functionName}`);
    
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    };
    
    const httpModule = url.protocol === 'https:' ? https : http;
    
    const req = httpModule.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const jsonData = JSON.parse(data);
            resolve(jsonData);
          } catch (e) {
            resolve(data);
          }
        } else {
          reject(new Error(`HTTP Error: ${res.statusCode} - ${data}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

// Fonction principale
async function refreshEnedisToken() {
  try {
    console.log('Requesting new Enedis API token...');
    
    const tokenData = await callEdgeFunction('enedis-token-refresh', 'GET', {
      scheduled: true
    });
    
    if (!tokenData.success && !tokenData.access_token) {
      throw new Error('Token refresh failed: ' + (tokenData.message || 'Unknown error'));
    }
    
    console.log('Successfully refreshed Enedis API token');
    console.log(`Token will expire at: ${tokenData.expires_at || 'Unknown'}`);
    console.log('Token refresh completed successfully');
    
    return tokenData;
  } catch (error) {
    console.error('Error refreshing Enedis token:', error.message);
    process.exit(1);
  }
}

// Exécuter la fonction principale
refreshEnedisToken();
