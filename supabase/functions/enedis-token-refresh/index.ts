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
  tokenUrl: 'https://gw.ext.prod.api.enedis.fr/oauth2/v3/token',
  scope: 'fr_be_cons_detail_load_curve fr_be_cons_daily_consumption fr_be_cons_max_power fr_be_prod_daily_production fr_be_identity fr_be_address fr_be_contact'
};

// Création du client Supabase
import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

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
    // Initialiser le client Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      console.error('SUPABASE_URL:', supabaseUrl);
      console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Present' : 'Missing');
      throw new Error('Configuration Supabase manquante');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('Supabase client initialized with URL:', supabaseUrl);
    
    // Vérifier si c'est une demande de rafraîchissement programmée
    const url = new URL(req.url);
    const isScheduled = url.searchParams.get('scheduled') === 'true';
    
    // Obtenir un nouveau token API
    console.log('Requesting API token...');
    console.log('Using client_id:', ENEDIS_CONFIG.clientId);
    
    const formData = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: ENEDIS_CONFIG.clientId,
      client_secret: ENEDIS_CONFIG.clientSecret,
      scope: ENEDIS_CONFIG.scope
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
    console.log('Token response headers:', Object.fromEntries(tokenResponse.headers.entries()));
    
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
        details: errorData,
        config: {
          url: ENEDIS_CONFIG.tokenUrl,
          clientId: ENEDIS_CONFIG.clientId
        }
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
      console.log('Token data parsed successfully:', {
        token_type: data.token_type,
        expires_in: data.expires_in,
        scope: data.scope
      });
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
    
    // Calculer la date d'expiration
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (data.expires_in * 1000));
    
    // Stocker le token dans la base de données
    try {
      console.log('Storing token in database...');
      
      // Désactiver tous les tokens actifs
      const { error: updateError } = await supabase
        .from('enedis_tokens')
        .update({ is_active: false })
        .eq('is_active', true);
      
      if (updateError) {
        console.error('Error deactivating previous tokens:', updateError);
      }
      
      // Insérer le nouveau token
      const { data: insertedToken, error: insertError } = await supabase
        .from('enedis_tokens')
        .insert([{
          token_type: data.token_type,
          access_token: data.access_token,
          expires_in: data.expires_in,
          expires_at: expiresAt.toISOString(),
          scope: data.scope || null,
          is_active: true
        }])
        .select();
      
      if (insertError) {
        console.error('Error storing token in database:', insertError);
        
        // Vérifier si l'erreur est liée à la structure de la table
        if (insertError.message.includes('column') || insertError.message.includes('does not exist')) {
          console.log('Attempting to check table structure...');
          
          // Vérifier la structure de la table
          const { data: tableInfo, error: tableError } = await supabase
            .from('enedis_tokens')
            .select('*')
            .limit(1);
          
          if (tableError) {
            console.error('Error checking table structure:', tableError);
          } else {
            console.log('Table structure seems valid. Sample data:', tableInfo);
          }
        }
        
        throw new Error(`Erreur lors du stockage du token: ${insertError.message}`);
      }
      
      console.log('Token stored successfully in database with ID:', insertedToken?.[0]?.id);
    } catch (dbError) {
      console.error('Database error:', dbError);
      // On continue même en cas d'erreur de base de données
    }
    
    // Si c'est une demande programmée, retourner un message simple
    if (isScheduled) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Token refreshed and stored successfully',
        expires_at: expiresAt.toISOString()
      }), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // Sinon, retourner le token complet
    return new Response(JSON.stringify({
      ...data,
      expires_at: expiresAt.toISOString()
    }), {
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