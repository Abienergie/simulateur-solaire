/**
 * Script pour rafraîchir automatiquement le token API Enedis
 * Ce script est exécuté par GitHub Actions toutes les 3 heures
 */

// Utiliser import au lieu de require pour la compatibilité ES modules
import https from 'https';

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://xpxbxfuckljqdvkajlmx.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_ANON_KEY) {
  console.error('SUPABASE_ANON_KEY ou VITE_SUPABASE_ANON_KEY environment variable is required');
  process.exit(1);
}

console.log('Starting Enedis token refresh process...');
console.log(`Using Supabase URL: ${SUPABASE_URL}`);

// Appeler la fonction Edge Supabase pour rafraîchir le token
async function refreshEnedisToken() {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/functions/v1/enedis-token-refresh`);
    url.searchParams.append('scheduled', 'true');
    
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    };
    
    console.log(`Calling Edge Function: ${url.toString().replace(/Bearer [^&]+/, 'Bearer ***')}`);
    
    const req = https.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const jsonData = JSON.parse(data);
            console.log('Token refresh successful:', {
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
refreshEnedisToken()
  .then(() => {
    console.log('Token refresh completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error refreshing token:', error.message);
    process.exit(1);
  });
