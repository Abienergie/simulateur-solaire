import { serve } from "std/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

// Création du client Supabase avec les variables d'environnement
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Configuration de l'API Enedis
const ENEDIS_API_BASE = 'https://gw.ext.prod.api.enedis.fr';

// Configuration CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  // Gérer les requêtes OPTIONS pour CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  try {
    // Pour les requêtes POST, on attend un body JSON
    if (req.method === 'POST') {
      let body;
      try {
        body = await req.json();
      } catch (error) {
        console.error('Error parsing request body:', error);
        return new Response(
          JSON.stringify({ 
            error: true, 
            message: 'Invalid JSON body'
          }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          }
        );
      }
      
      // Vérifier que l'action est spécifiée
      if (!body.action) {
        throw new Error('Action non spécifiée');
      }
      
      // Traiter selon l'action demandée
      switch (body.action) {
        case 'get_consumption': {
          // Vérifier les paramètres requis
          if (!body.token || !body.prm || !body.startDate || !body.endDate) {
            throw new Error('Paramètres manquants: token, prm, startDate et endDate sont requis');
          }
          
          console.log(`Récupération des données pour le PDL ${body.prm} du ${body.startDate} au ${body.endDate}`);
          
          // Construire l'URL de l'API Enedis
          const apiUrl = `${ENEDIS_API_BASE}/metering_data_dc/v5/daily_consumption?usage_point_id=${body.prm}&start=${body.startDate}&end=${body.endDate}`;
          
          console.log(`Appel API Enedis: ${apiUrl}`);
          
          // Appeler l'API Enedis
          const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${body.token}`,
              'Accept': 'application/json'
            }
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Erreur API Enedis (${response.status}):`, errorText);
            
            // Gestion spécifique des erreurs d'autorisation
            if (response.status === 401 || response.status === 403) {
              return new Response(
                JSON.stringify({ 
                  error: true, 
                  code: 'AUTHORIZATION_ERROR',
                  message: 'Erreur d\'autorisation. Le token est peut-être expiré ou le PDL n\'est pas autorisé.'
                }),
                {
                  status: response.status,
                  headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders
                  }
                }
              );
            }
            
            throw new Error(`Erreur API Enedis: ${response.status}`);
          }
          
          const data = await response.json();
          
          // Stocker les données dans Supabase si possible
          if (data.meter_reading?.interval_reading) {
            try {
              // Formater les données pour le stockage
              const consumptionData = formatConsumptionData(data, body.prm);
              
              // Insérer les données dans la table consumption_data
              const { error: insertError } = await supabase
                .from('consumption_data')
                .upsert(consumptionData, { onConflict: 'prm,date' });
              
              if (insertError) {
                console.error('Erreur lors du stockage des données:', insertError);
              } else {
                console.log(`${consumptionData.length} enregistrements de consommation stockés avec succès`);
              }
            } catch (storageError) {
              console.error('Erreur lors du traitement des données pour le stockage:', storageError);
            }
          }
          
          // Retourner les données à l'application
          return new Response(JSON.stringify(data), {
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }
        
        case 'check_pdl_access': {
          // Vérifier si un PDL spécifique est accessible avec le token fourni
          if (!body.token || !body.prm) {
            throw new Error('Paramètres manquants: token et prm sont requis');
          }
          
          console.log(`Vérification de l'accès au PDL ${body.prm}`);
          
          // Utiliser une période courte pour tester l'accès
          const today = new Date();
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          
          const endDate = today.toISOString().split('T')[0];
          const startDate = yesterday.toISOString().split('T')[0];
          
          // Construire l'URL de l'API Enedis
          const apiUrl = `${ENEDIS_API_BASE}/metering_data_dc/v5/daily_consumption?usage_point_id=${body.prm}&start=${startDate}&end=${endDate}`;
          
          // Appeler l'API Enedis
          const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${body.token}`,
              'Accept': 'application/json'
            }
          });
          
          // Retourner le résultat de la vérification
          return new Response(
            JSON.stringify({ 
              hasAccess: response.ok,
              status: response.status,
              pdl: body.prm
            }),
            {
              headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
              }
            }
          );
        }
        
        default:
          throw new Error(`Action non supportée: ${body.action}`);
      }
    }
    
    // Pour les requêtes GET, on retourne une page de test
    return new Response(
      'Enedis Data Function is running! Cette fonction permet de récupérer les données de consommation Enedis.',
      { 
        headers: { 
          'Content-Type': 'text/plain',
          ...corsHeaders
        } 
      }
    );
    
  } catch (error) {
    console.error('Erreur de fonction:', error);
    
    return new Response(
      JSON.stringify({ 
        error: true, 
        message: error.message || 'Une erreur est survenue'
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  }
});

// Fonction pour formater les données de consommation pour le stockage
function formatConsumptionData(data: any, prm: string): any[] {
  if (!data.meter_reading?.interval_reading || !Array.isArray(data.meter_reading.interval_reading)) {
    return [];
  }
  
  const readings = data.meter_reading.interval_reading;
  const formattedData = [];
  
  // Regrouper les lectures par date et type (HP/HC)
  const readingsByDate: Record<string, { peakHours: number, offPeakHours: number }> = {};
  
  for (const reading of readings) {
    const date = reading.date;
    const value = parseFloat(reading.value);
    const measureType = reading.measure_type;
    
    if (!readingsByDate[date]) {
      readingsByDate[date] = { peakHours: 0, offPeakHours: 0 };
    }
    
    if (measureType === 'HP') {
      readingsByDate[date].peakHours += value;
    } else if (measureType === 'HC') {
      readingsByDate[date].offPeakHours += value;
    } else {
      // Si pas de distinction HP/HC, on considère que c'est en heures pleines
      readingsByDate[date].peakHours += value;
    }
  }
  
  // Convertir en tableau pour l'insertion
  for (const [date, values] of Object.entries(readingsByDate)) {
    formattedData.push({
      prm,
      date,
      peak_hours: values.peakHours,
      off_peak_hours: values.offPeakHours,
      created_at: new Date().toISOString()
    });
  }
  
  return formattedData;
}