import { createClient } from "npm:@supabase/supabase-js@2.39.3";

// Configuration CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Configuration de l'API Enedis
const ENEDIS_CONFIG = {
  clientId: 'Y_LuB7HsQW3JWYudw7HRmN28FN8a',
  clientSecret: 'Pb9H1p8zJ4IfX0xca5c7lficGo4a',
  tokenUrl: 'https://gw.ext.prod.api.enedis.fr/oauth2/v3/token'
};

// Création du client Supabase avec les variables d'environnement
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('Enedis Token Refresh Function Starting...');

Deno.serve(async (req) => {
  console.log('Received request:', req.url, 'Method:', req.method);
  
  // Gérer les requêtes OPTIONS pour CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  try {
    // Vérifier si c'est une demande de rafraîchissement programmée
    const url = new URL(req.url);
    const isScheduled = url.searchParams.get('scheduled') === 'true';
    
    // Obtenir un nouveau token API
    console.log('Requesting API token...');
    
    const formData = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: ENEDIS_CONFIG.clientId,
      client_secret: ENEDIS_CONFIG.clientSecret
    });
    
    console.log('Request form data:', formData.toString());
    
    const tokenResponse = await fetch(ENEDIS_CONFIG.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: formData
    });
    
    const responseText = await tokenResponse.text();
    console.log('Token response status:', tokenResponse.status);
    
    if (!tokenResponse.ok) {
      console.error('API token request error:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        body: responseText
      });
      
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { error: 'Unknown error', error_description: responseText };
      }
      
      return new Response(JSON.stringify({
        error: 'API token request failed',
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        details: errorData
      }), {
        status: tokenResponse.status,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Error parsing token response:', parseError);
      return new Response(JSON.stringify({
        error: 'Invalid response format',
        details: parseError.message,
        response: responseText
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    console.log('API token obtained successfully');
    
    // Stocker le token dans la table enedis_tokens
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (data.expires_in * 1000));
    
    const { error: insertError } = await supabase
      .from('enedis_tokens')
      .insert({
        token_type: data.token_type,
        access_token: data.access_token,
        expires_in: data.expires_in,
        expires_at: expiresAt.toISOString(),
        scope: data.scope,
        is_active: true,
        created_at: now.toISOString()
      });
    
    if (insertError) {
      console.error('Error storing token in database:', insertError);
    } else {
      console.log('Token stored in database successfully');
    }
    
    // Désactiver les anciens tokens
    const { error: updateError } = await supabase
      .from('enedis_tokens')
      .update({ is_active: false })
      .lt('created_at', now.toISOString())
      .neq('access_token', data.access_token);
    
    if (updateError) {
      console.error('Error deactivating old tokens:', updateError);
    } else {
      console.log('Old tokens deactivated successfully');
    }
    
    // Si c'est une demande programmée, retourner un message simple
    if (isScheduled) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Token refreshed successfully',
        expires_at: expiresAt.toISOString()
      }), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // Sinon, retourner le token complet
    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
    
  } catch (error) {
    console.error('Function error:', error);
    
    return new Response(JSON.stringify({ 
      error: true, 
      message: error.message || 'Une erreur est survenue'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
});