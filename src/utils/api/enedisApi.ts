import { ConsumptionData } from '../../types/consumption';

class EnedisAPI {
  private static instance: EnedisAPI;
  private accessToken: string | null = null;
  
  private readonly config = {
    clientId: 'Y_LuB7HsQW3JWYudw7HRmN28FN8a',
    clientSecret: 'Pb9H1p8zJ4IfX0xca5c7lficGo4a',
    // URL de redirection modifiée pour pointer vers l'environnement de production
    redirectUri: 'https://abienergie.github.io/simulateur-solaire/#/oauth/callback',
    authUrl: 'https://mon-compte-particulier.enedis.fr/dataconnect/v1/oauth2/authorize',
    tokenUrl: 'https://gw.ext.prod.api.enedis.fr/oauth2/v3/token',
    apiUrl: 'https://gw.ext.prod.api.enedis.fr/metering_data_dc/v5',
    scope: 'fr_be_cons_detail_load_curve'
  };

  private constructor() {
    // Récupérer le token du localStorage s'il existe
    this.accessToken = localStorage.getItem('enedis_access_token');
    console.log('Token récupéré du localStorage:', this.accessToken ? 'Présent' : 'Absent');
    console.log('URL de redirection configurée:', this.config.redirectUri);
  }

  public static getInstance(): EnedisAPI {
    if (!EnedisAPI.instance) {
      EnedisAPI.instance = new EnedisAPI();
    }
    return EnedisAPI.instance;
  }

  public async initiateAuth(): Promise<string> {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      duration: 'P1Y',
      state: 'AbieLink1'
    });

    return `${this.config.authUrl}?${params.toString()}`;
  }

  public async handleCallback(code: string): Promise<void> {
    try {
      console.log('Échange du code contre un token...');
      
      // Utiliser la fonction Edge Supabase pour l'échange de token
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const functionUrl = `${supabaseUrl}/functions/v1/enedis-auth?code=${code}&state=AbieLink1`;
      
      console.log('Appel de la fonction Edge:', functionUrl);
      
      const response = await fetch(functionUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erreur réponse fonction Edge:', errorText);
        throw new Error(`Échec de l'échange du token: ${response.status} ${response.statusText}`);
      }
      
      // La fonction Edge redirige directement vers l'application avec les tokens
      // Nous n'avons pas besoin de traiter la réponse ici
      console.log('Redirection en cours via la fonction Edge');
      
    } catch (error) {
      console.error('Erreur détaillée dans handleCallback:', error);
      throw error;
    }
  }

  // Méthode pour obtenir un token d'API directement (sans passer par l'authentification utilisateur)
  public async getApiToken(): Promise<string> {
    try {
      console.log('Demande d\'un token d\'API...');
      
      // Utiliser la fonction Edge Supabase pour obtenir un token
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const functionUrl = `${supabaseUrl}/functions/v1/enedis-token-refresh`;
      
      const response = await fetch(functionUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erreur lors de la demande de token API:', errorText);
        throw new Error(`Échec de l'obtention du token API: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.access_token) {
        throw new Error('Token API non reçu');
      }
      
      // Sauvegarder le token
      this.accessToken = data.access_token;
      localStorage.setItem('enedis_access_token', data.access_token);
      
      // Sauvegarder la date d'expiration (3h30 = 12600 secondes)
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + (data.expires_in || 12600));
      localStorage.setItem('enedis_token_expires', expiresAt.toISOString());
      
      console.log('Token API obtenu avec succès, valable jusqu\'à', expiresAt.toLocaleString());
      
      return data.access_token;
    } catch (error) {
      console.error('Erreur lors de l\'obtention du token API:', error);
      throw error;
    }
  }

  public async testConnection(prm: string): Promise<boolean> {
    try {
      console.log('Test de connexion pour le PDL:', prm);
      const token = await this.getValidToken();
      if (!token) {
        console.log('Pas de token valide disponible');
        return false;
      }

      // Utiliser la fonction Edge Supabase pour vérifier l'accès au PDL
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const functionUrl = `${supabaseUrl}/functions/v1/enedis-data`;
      
      console.log('Appel de la fonction Edge pour tester l\'accès au PDL');
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          action: 'check_pdl_access',
          token,
          prm
        })
      });

      if (!response.ok) {
        console.error('Erreur lors de la vérification du PDL:', response.status);
        return false;
      }
      
      const result = await response.json();
      console.log('Résultat de la vérification du PDL:', result);
      
      // Si le PDL est accessible, le sauvegarder
      if (result.hasAccess) {
        localStorage.setItem('enedis_usage_point_id', prm);
      }
      
      return result.hasAccess;
    } catch (error) {
      console.error('Erreur lors du test de connexion:', error);
      return false;
    }
  }

  public async getConsumptionData(prm: string, startDate: string, endDate: string) {
    try {
      console.log('Récupération des données de consommation pour le PDL:', prm);
      const token = await this.getValidToken();
      if (!token) {
        console.error('Pas de token valide disponible');
        throw new Error('Non authentifié');
      }

      console.log('Récupération des données de consommation réelles...');
      
      // Créer une date de début et de fin si non fournies
      if (!startDate) {
        // Selon la doc, on peut remonter jusqu'à 36 mois et 15 jours
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        startDate = oneYearAgo.toISOString().split('T')[0];
      }
      
      if (!endDate) {
        // La date de fin doit être le lendemain de la dernière date souhaitée
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        endDate = tomorrow.toISOString().split('T')[0];
      }

      console.log(`PDL: ${prm}, Période: ${startDate} à ${endDate}`);

      // Utiliser la fonction Edge Supabase pour l'appel API
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const functionUrl = `${supabaseUrl}/functions/v1/enedis-data`;
      
      console.log('Appel de la fonction Edge pour récupérer les données');
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          action: 'get_consumption',
          token,
          prm,
          startDate,
          endDate
        })
      });
      
      console.log('Réponse reçue, status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erreur API:', response.status, errorText);
        
        // Si le token est expiré, essayer de le rafraîchir et réessayer
        if (response.status === 401) {
          console.log('Token expiré, tentative de rafraîchissement');
          await this.getApiToken(); // Obtenir un nouveau token
          return this.getConsumptionData(prm, startDate, endDate);
        }
        
        throw new Error(`Erreur API Enedis: ${response.status}`);
      }
      
      const responseData = await response.json();
      console.log('Données reçues:', responseData);
      
      // Sauvegarder la réponse brute dans le localStorage pour le débogage
      localStorage.setItem('enedis_raw_response', JSON.stringify(responseData));
      
      if (!responseData?.meter_reading?.interval_reading) {
        console.error('Format de données invalide:', responseData);
        throw new Error('Format de données invalide');
      }
      
      const formattedData = this.formatConsumptionData(responseData, prm);
      return {
        rawResponse: responseData,
        ...formattedData
      };
      
    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error);
      throw error;
    }
  }

  private async getValidToken(): Promise<string | null> {
    // Si on a déjà un token en mémoire, on l'utilise
    if (this.accessToken) {
      console.log('Utilisation du token en mémoire');
      return this.accessToken;
    }
    
    // Sinon on vérifie dans le localStorage
    const token = localStorage.getItem('enedis_access_token');
    const expiresAt = localStorage.getItem('enedis_token_expires');
    
    if (!token || !expiresAt) {
      console.log('Pas de token dans le localStorage, tentative d\'obtention d\'un nouveau token');
      try {
        return await this.getApiToken();
      } catch (error) {
        console.error('Erreur lors de l\'obtention d\'un nouveau token:', error);
        return null;
      }
    }

    console.log('Token trouvé dans le localStorage, expiration:', expiresAt);

    // Vérifier si le token est expiré
    if (new Date(expiresAt) <= new Date()) {
      console.log('Token expiré, tentative de rafraîchissement');
      // Token expiré, essayer de le rafraîchir
      try {
        return await this.getApiToken();
      } catch (error) {
        console.error('Erreur lors de l\'obtention d\'un nouveau token:', error);
        return null;
      }
    }

    this.accessToken = token;
    return token;
  }

  private formatConsumptionData(data: any, prm: string) {
    console.log('Formatage des données de consommation');
    try {
      if (!data?.meter_reading?.interval_reading) {
        console.error('Format de données invalide:', data);
        throw new Error('Format de données invalide');
      }

      // Traiter les données pour les adapter au format attendu
      const readings = data.meter_reading.interval_reading;
      console.log(`Nombre de relevés: ${readings.length}`);
      
      // D'après la documentation, les données de consommation quotidienne
      // sont fournies avec une valeur par jour, et peuvent inclure un champ measure_type
      // pour distinguer les heures pleines (HP) et heures creuses (HC)
      const readingsByDate: Record<string, { peakHours: number, offPeakHours: number }> = {};
      
      readings.forEach((reading: any) => {
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
      });
      
      // Convertir le dictionnaire en tableau
      const consumption = Object.entries(readingsByDate).map(([date, values]) => ({
        date,
        peakHours: values.peakHours,
        offPeakHours: values.offPeakHours,
        prm: data.meter_reading.usage_point_id || prm
      }));

      console.log(`Données formatées: ${consumption.length} jours`);
      return { consumption };
    } catch (error) {
      console.error('Erreur lors du formatage des données:', error);
      throw error;
    }
  }
}

export const enedisApi = EnedisAPI.getInstance();