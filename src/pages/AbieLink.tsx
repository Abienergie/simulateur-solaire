import React, { useState, useEffect } from 'react';
import { Link as LinkIcon, Lock, Info, Search, ExternalLink, AlertCircle, Download, Loader2, CheckCircle } from 'lucide-react';
import { useEnedisData } from '../hooks/useEnedisData';
import ConsumptionChart from '../components/ConsumptionChart';
import { useLocation } from 'react-router-dom';
import { enedisApi } from '../utils/api/enedisApi';

const AbieLink: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [rawData, setRawData] = useState<string | null>(null);
  const [pdlInput, setPdlInput] = useState('');
  const location = useLocation();
  const { consumptionData, isConnected, fetchConsumptionData, testConnection, resetData } = useEnedisData();

  useEffect(() => {
    // Vérifier les paramètres d'URL pour les messages de succès/erreur
    if (location.state) {
      if (location.state.success) {
        setSuccess(location.state.message || 'Connexion réussie');
        
        // Si on a un PDL, essayer de récupérer les données
        if (location.state.pdl) {
          console.log('PDL reçu dans les paramètres d\'URL:', location.state.pdl);
          fetchConsumptionData(location.state.pdl).catch(err => {
            console.error('Erreur lors de la récupération des données:', err);
            setError(err instanceof Error ? err.message : 'Erreur lors de la récupération des données');
          });
        } else {
          // Sinon, utiliser le PDL stocké dans le localStorage
          const storedPdl = localStorage.getItem('enedis_usage_point_id');
          if (storedPdl) {
            console.log('Utilisation du PDL stocké:', storedPdl);
            fetchConsumptionData(storedPdl).catch(err => {
              console.error('Erreur lors de la récupération des données:', err);
              setError(err instanceof Error ? err.message : 'Erreur lors de la récupération des données');
            });
          } else {
            console.log('Aucun PDL disponible');
            setError('Aucun point de livraison (PDL) disponible');
          }
        }
      } else if (location.state.error) {
        setError(location.state.error);
      }
    }
  }, [location, fetchConsumptionData]);

  const handleEnedisClick = () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // URL directe vers l'authentification Enedis
      const authUrl = "https://mon-compte-particulier.enedis.fr/dataconnect/v1/oauth2/authorize?client_id=Y_LuB7HsQW3JWYudw7HRmN28FN8a&duration=P1Y&response_type=code&state=AbieLink1";
      window.open(authUrl, '_blank');
      
      setSuccess('Redirection vers Enedis...');
    } catch (err) {
      setError('Erreur lors de la redirection');
      console.error('Erreur:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestPDL = async () => {
    if (!pdlInput || pdlInput.length !== 14) {
      setError('Veuillez saisir un numéro PDL valide (14 chiffres)');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Tester l'accès au PDL
      const hasAccess = await testConnection(pdlInput);
      
      if (hasAccess) {
        setSuccess(`Accès confirmé au PDL ${pdlInput}`);
        // Récupérer les données
        await fetchConsumptionData(pdlInput);
      } else {
        setError(`Impossible d'accéder au PDL ${pdlInput}. Vérifiez que vous avez donné votre consentement pour ce point de livraison.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la vérification du PDL');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchData = async () => {
    setIsLoading(true);
    setError(null);
    setRawData(null);
    
    try {
      const pdl = localStorage.getItem('enedis_usage_point_id');
      if (!pdl) {
        throw new Error('Aucun PDL disponible. Veuillez d\'abord vous connecter à Enedis.');
      }
      
      const data = await fetchConsumptionData(pdl);
      
      // Afficher les données brutes
      setRawData(JSON.stringify(data, null, 2));
      setSuccess('Données récupérées avec succès');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la récupération des données');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadRawData = () => {
    if (!rawData) return;
    
    const blob = new Blob([rawData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'enedis-data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Récupérer les données brutes du localStorage
  useEffect(() => {
    const storedRawData = localStorage.getItem('enedis_raw_response');
    if (storedRawData) {
      try {
        // Vérifier si c'est un JSON valide
        JSON.parse(storedRawData);
        setRawData(storedRawData);
      } catch (e) {
        console.error('Données brutes stockées invalides:', e);
      }
    }
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg shadow-lg p-6 mb-8">
        <div className="flex items-center gap-3 text-white mb-4">
          <LinkIcon className="h-8 w-8" />
          <h1 className="text-2xl font-bold">Abie Link</h1>
        </div>
        <p className="text-blue-100">
          Connectez votre compteur Linky pour suivre votre consommation d'énergie en temps réel
          et optimiser votre installation solaire.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
          <p className="text-green-700">{success}</p>
        </div>
      )}

      {consumptionData ? (
        <div className="space-y-6">
          <ConsumptionChart data={consumptionData} onReset={resetData} />
          
          <div className="flex justify-center space-x-4">
            <button
              onClick={handleFetchData}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Chargement...
                </span>
              ) : (
                'Récupérer vos données'
              )}
            </button>
            
            <button
              onClick={resetData}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Réinitialiser
            </button>
          </div>
          
          {rawData && (
            <div className="mt-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-medium text-gray-900">Données brutes</h3>
                <button
                  onClick={handleDownloadRawData}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                >
                  <Download className="h-4 w-4" />
                  Télécharger
                </button>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 overflow-auto max-h-96">
                <pre className="text-xs text-gray-800 whitespace-pre-wrap">{rawData}</pre>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Search className="h-5 w-5 text-blue-500" />
                <h3 className="font-medium text-gray-900">Suivi en temps réel</h3>
              </div>
              <p className="text-sm text-gray-600">
                Visualisez votre consommation d'énergie au jour le jour
              </p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="h-5 w-5 text-green-500" />
                <h3 className="font-medium text-gray-900">Sécurisé</h3>
              </div>
              <p className="text-sm text-gray-600">
                Vos données sont protégées et confidentielles
              </p>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Info className="h-5 w-5 text-purple-500" />
                <h3 className="font-medium text-gray-900">Optimisation</h3>
              </div>
              <p className="text-sm text-gray-600">
                Optimisez votre installation solaire selon vos besoins
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Connecter mon compteur Linky
            </h2>

            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-medium text-blue-900 mb-2">Étape 1: Authentification Enedis</h3>
                <p className="text-sm text-blue-800 mb-4">
                  Connectez-vous à votre compte Enedis pour donner votre consentement à l'accès à vos données.
                  Cette étape est nécessaire pour autoriser l'application à accéder à vos données de consommation.
                </p>
                
                <div className="flex justify-center">
                  <button
                    onClick={handleEnedisClick}
                    disabled={isLoading}
                    className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <ExternalLink className="h-5 w-5 mr-2" />
                    Se connecter à Enedis
                  </button>
                </div>
              </div>

              {isConnected && (
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                  <h3 className="font-medium text-amber-900 mb-2">Étape 2: Accéder à un point de livraison (PDL)</h3>
                  <p className="text-sm text-amber-800 mb-4">
                    Saisissez votre numéro de PDL pour accéder à vos données de consommation.
                    Vous devez avoir donné votre consentement pour ce PDL lors de l'étape 1.
                  </p>
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={pdlInput}
                      onChange={(e) => setPdlInput(e.target.value.replace(/\D/g, '').slice(0, 14))}
                      placeholder="Numéro PDL (14 chiffres)"
                      className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      maxLength={14}
                    />
                    <button
                      onClick={handleTestPDL}
                      disabled={isLoading || pdlInput.length !== 14}
                      className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50"
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Vérification...
                        </span>
                      ) : (
                        'Vérifier l\'accès'
                      )}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-amber-700">
                    Le numéro PDL (Point De Livraison) est un identifiant à 14 chiffres qui se trouve sur votre facture d'électricité.
                  </p>
                </div>
              )}

              {isLoading && (
                <div className="flex justify-center mt-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <h3 className="text-lg font-medium text-blue-900 mb-4">
              Pourquoi connecter votre compteur Linky ?
            </h3>
            <p className="text-blue-800 mb-4">
              En connectant votre compteur Linky, vous pourrez visualiser votre consommation d'énergie en détail et optimiser votre installation solaire en fonction de vos habitudes de consommation.
            </p>
            <p className="text-sm text-blue-700">
              Vos données sont sécurisées et ne sont utilisées que pour vous fournir des recommandations personnalisées.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AbieLink;