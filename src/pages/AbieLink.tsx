import React, { useState, useEffect } from 'react';
import { Link as LinkIcon, Lock, Info, Search, ExternalLink, AlertCircle, Download, Loader2, CheckCircle, RefreshCw, BarChart2, Calendar, User, FileText } from 'lucide-react';
import { useEnedisData } from '../hooks/useEnedisData';
import EnhancedConsumptionChart from '../components/EnhancedConsumptionChart';
import DailyConsumptionPatterns from '../components/DailyConsumptionPatterns';
import EnedisInfoDisplay from '../components/EnedisInfoDisplay';
import { useLocation } from 'react-router-dom';

const AbieLink: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [rawData, setRawData] = useState<string | null>(null);
  const [manualPdl, setManualPdl] = useState('');
  const [activeView, setActiveView] = useState<'overview' | 'patterns' | 'info'>('overview');
  const location = useLocation();
  const { 
    consumptionData, 
    isConnected, 
    fetchConsumptionData, 
    testConnection, 
    resetData, 
    additionalInfo 
  } = useEnedisData();

  useEffect(() => {
    // Vérifier les paramètres d'URL pour les messages de succès/erreur
    if (location.state) {
      if (location.state.success) {
        setSuccess(location.state.message || 'Connexion réussie');
        
        // Si on a un PDL, l'afficher dans le message de succès et le stocker
        if (location.state.pdl) {
          console.log('PDL reçu dans les paramètres d\'URL:', location.state.pdl);
          setSuccess(`Connexion réussie sur le PDL n°${location.state.pdl}`);
          localStorage.setItem('enedis_usage_point_id', location.state.pdl);
          setManualPdl(location.state.pdl);
        }
      } else if (location.state.error) {
        setError(location.state.error);
      }
    }
  }, [location]);

  // Récupérer le PDL du localStorage au chargement
  useEffect(() => {
    const storedPdl = localStorage.getItem('enedis_usage_point_id');
    if (storedPdl) {
      setManualPdl(storedPdl);
    }
  }, []);

  const handleEnedisClick = () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // URL directe vers l'authentification Enedis
      const authUrl = "https://mon-compte-particulier.enedis.fr/dataconnect/v1/oauth2/authorize?client_id=Y_LuB7HsQW3JWYudw7HRmN28FN8a&duration=P1Y&response_type=code&state=AbieLink1&scope=fr_be_cons_detail_load_curve+fr_be_cons_daily_consumption+fr_be_cons_max_power+fr_be_prod_daily_production+fr_be_identity+fr_be_address+fr_be_contact";
      
      // Ouvrir dans un nouvel onglet pour éviter les problèmes de redirection
      window.open(authUrl, '_blank');
      
      setSuccess('Redirection vers Enedis...');
      setIsLoading(false);
    } catch (err) {
      setError('Erreur lors de la redirection');
      console.error('Erreur:', err);
      setIsLoading(false);
    }
  };

  const handleFetchData = async () => {
    setIsLoading(true);
    setError(null);
    setRawData(null);
    
    try {
      // Utiliser le PDL saisi manuellement ou celui du localStorage
      const pdl = manualPdl || localStorage.getItem('enedis_usage_point_id');
      
      if (!pdl) {
        throw new Error('Aucun PDL disponible. Veuillez saisir un PDL ou vous connecter à Enedis.');
      }
      
      // Tester d'abord si le PDL est accessible
      const isAccessible = await testConnection(pdl);
      
      if (!isAccessible) {
        throw new Error(`Le PDL ${pdl} n'est pas accessible. Veuillez vérifier le numéro ou vous connecter à Enedis.`);
      }
      
      // Si le PDL est accessible, récupérer les données
      const data = await fetchConsumptionData(pdl);
      
      // Stocker la réponse brute pour le débogage
      if (data.rawResponse) {
        setRawData(JSON.stringify(data.rawResponse, null, 2));
        // Sauvegarder dans le localStorage pour référence
        localStorage.setItem('enedis_raw_response', JSON.stringify(data.rawResponse));
      }
      
      setSuccess('Données récupérées avec succès');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la récupération des données');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePdlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Accepter uniquement les chiffres et limiter à 14 caractères
    const value = e.target.value.replace(/\D/g, '').slice(0, 14);
    setManualPdl(value);
  };

  const handleSavePdl = () => {
    if (manualPdl.length === 14) {
      localStorage.setItem('enedis_usage_point_id', manualPdl);
      setSuccess(`PDL n°${manualPdl} enregistré`);
    } else {
      setError('Le PDL doit comporter 14 chiffres');
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
          {/* Onglets pour basculer entre les vues */}
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveView('overview')}
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                  activeView === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <BarChart2 className="h-4 w-4" />
                  <span>Vue d'ensemble</span>
                </div>
              </button>
              <button
                onClick={() => setActiveView('patterns')}
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                  activeView === 'patterns'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Habitudes de consommation</span>
                </div>
              </button>
              <button
                onClick={() => setActiveView('info')}
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                  activeView === 'info'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>Informations PDL</span>
                </div>
              </button>
            </nav>
          </div>
          
          {activeView === 'overview' && (
            <EnhancedConsumptionChart data={consumptionData} onReset={resetData} />
          )}
          
          {activeView === 'patterns' && (
            <DailyConsumptionPatterns data={consumptionData} />
          )}
          
          {activeView === 'info' && (
            <EnedisInfoDisplay additionalInfo={additionalInfo} />
          )}
          
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
                <span className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Actualiser les données
                </span>
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
              {/* Saisie manuelle du PDL */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-medium text-blue-900 mb-2">Point de Livraison (PDL)</h3>
                <p className="text-sm text-blue-800 mb-4">
                  Saisissez votre numéro de Point de Livraison (PDL) à 14 chiffres. 
                  Vous le trouverez sur votre facture d'électricité ou sur votre compteur Linky.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-grow">
                    <input
                      type="text"
                      value={manualPdl}
                      onChange={handlePdlChange}
                      placeholder="14 chiffres"
                      className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      maxLength={14}
                    />
                    <p className="mt-1 text-xs text-blue-600">
                      {manualPdl.length}/14 chiffres
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSavePdl}
                      disabled={manualPdl.length !== 14}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Enregistrer
                    </button>
                    <button
                      onClick={handleFetchData}
                      disabled={isLoading || manualPdl.length !== 14}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Chargement...
                        </span>
                      ) : (
                        'Récupérer les données'
                      )}
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-gray-600 mb-4">- OU -</p>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h3 className="font-medium text-green-900 mb-2">Connexion automatique</h3>
                <p className="text-sm text-green-800 mb-4">
                  Connectez-vous à votre compte Enedis pour donner votre consentement à l'accès à vos données.
                  Cette méthode récupère automatiquement votre PDL et vous donne accès à toutes vos données de consommation.
                </p>
                
                <div className="flex justify-center">
                  <button
                    onClick={handleEnedisClick}
                    disabled={isLoading}
                    className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    <ExternalLink className="h-5 w-5 mr-2" />
                    Se connecter à Enedis
                  </button>
                </div>
              </div>

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