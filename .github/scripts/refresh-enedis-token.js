/**
 * Script pour rafraîchir automatiquement le token API Enedis
 * Ce script est exécuté par GitHub Actions toutes les 3 heures
 */

// Utiliser import au lieu de require pour la compatibilité ES modules
import https from 'https';

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://xpxbxfuckljqdvkajlmx.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const REQUEST_TIMEOUT = 60000; // 60 seconds timeout

if (!SUPABASE_ANON_KEY) {
  console.error('SUPABASE_ANON_KEY ou VITE_SUPABASE_ANON_KEY environment variable is required');
  process.exit(1);
}

console.log('Starting Enedis token refresh process...');
console.log(`Using Supabase URL: ${SUPABASE_URL}`);

// Exécuter la fonction avec gestion des erreurs et retries
async function executeWithRetry(fn, maxRetries = 3) {
  // Add a delay before starting to avoid rate limiting
  console.log('Waiting 2 seconds before starting...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Add a delay before starting to avoid rate limiting
  console.log('Waiting 2 seconds before starting...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      return await fn();
    } catch (error) {
      retries++;
      console.error(`Attempt ${retries}/${maxRetries} failed:`, error.message);
      
      if (retries >= maxRetries) {
        throw error;
      }
      
      // Exponential backoff
      const delay = Math.pow(2, retries) * 1000;
      console.log(`Retrying in ${delay / 1000} seconds... (Attempt ${retries})`);
      
      // Add extra delay for better reliability
      const actualDelay = delay + 2000;
      console.log(`Adding extra delay buffer, actual wait: ${actualDelay / 1000} seconds`);
      
      
      // Add extra delay for better reliability
      const actualDelay = delay + 2000;
      console.log(`Adding extra delay buffer, actual wait: ${actualDelay / 1000} seconds`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Appeler la fonction Edge Supabase pour rafraîchir le token
async function refreshEnedisToken() {
  const requestId = Math.random().toString(36).substring(2, 15);
  
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/functions/v1/enedis-token-refresh`);
    url.searchParams.append('scheduled', 'true');
    url.searchParams.append('request_id', requestId);
    
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'User-Agent': 'AbieSolarSimulator/1.0 (GitHub-Action)',
        'Cache-Control': 'no-cache, no-store',
        'Pragma': 'no-cache',
        'X-Request-ID': requestId
      },
      timeout: REQUEST_TIMEOUT
    };
    
    console.log(`Calling Edge Function: ${url.toString().replace(/Bearer [^&]+/, 'Bearer ***')}`);
    
    const req = https.request(url, options, (res) => {
      let data = '';
      
      console.log(`Response status code: ${res.statusCode}`);
      console.log(`Response headers: ${JSON.stringify(res.headers)}`);
      
      console.log(`Response status code: ${res.statusCode}`);
      console.log(`Response headers: ${JSON.stringify(res.headers)}`);
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const jsonData = JSON.parse(data);
            console.log('Token refresh successful:', {
              access_token: jsonData.access_token ? 'Present' : 'Missing',
              access_token_length: jsonData.access_token ? jsonData.access_token.length : 0,
              access_token: jsonData.access_token ? 'Present' : 'Missing',
              success: jsonData.success,
              expires_at: jsonData.expires_at
            });
            resolve(jsonData);
          } catch (e) {
            console.log('Response is not JSON:', data);
            resolve(data);
          }
        } else {
          console.error(`HTTP Error: ${res.statusCode}`);
          console.error('Response:', data);
          reject(new Error(`HTTP Error: ${res.statusCode} - ${data}`));
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('Request error:', error);
      reject(error);
    });
    
    req.end();
  });
}

// Exécuter la fonction
executeWithRetry(refreshEnedisToken)
  .then(() => {
    console.log('Token refresh completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error refreshing token:', error.message);
    process.exit(1);
  });
