import React, { useState, useEffect, useRef } from 'react';
import { User, MapPin, Phone, Mail, FileText, Zap, MapPinned, Calendar, Home, Info, ExternalLink, Building, Plug } from 'lucide-react';

interface EnedisInfoDisplayProps {
  additionalInfo: any;
}

const EnedisInfoDisplay: React.FC<EnedisInfoDisplayProps> = ({ additionalInfo }) => {
  const [coordinates, setCoordinates] = useState<{lat: number, lon: number} | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);
  const infoRef = useRef<HTMLDivElement>(null);

  // Récupérer les coordonnées du localStorage si disponibles
  useEffect(() => {
    const storedAddress = localStorage.getItem('solar_client_data');
    
    if (storedAddress) {
      try {
        const parsedAddress = JSON.parse(storedAddress);
        if (parsedAddress.address?.coordinates) {
          setCoordinates(parsedAddress.address.coordinates);
        }
      } catch (e) {
        console.error('Erreur lors de la récupération des coordonnées:', e);
      }
    }
  }, []);

  // Activer le mode debug avec 5 clics rapides
  const handleDebugClick = () => {
    const now = Date.now();
    
    if (now - lastClickTime < 500) {
      // Clics rapides
      setClickCount(prev => prev + 1);
      if (clickCount >= 4) {
        setDebugMode(true);
        setClickCount(0);
      }
    } else {
      // Réinitialiser le compteur si trop de temps s'est écoulé
      setClickCount(1);
    }
    
    setLastClickTime(now);
  };

  if (!additionalInfo) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Info className="h-5 w-5 text-amber-500" />
          <span onClick={handleDebugClick}>Aucune information disponible</span>
        </h3>
        <p className="text-gray-500">
          Aucune information supplémentaire n'est disponible pour ce PDL. 
          Veuillez actualiser les données ou vérifier votre connexion à Enedis.
        </p>
      </div>
    );
  }

  // Afficher les données brutes en mode debug
  if (debugMode) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Info className="h-5 w-5 text-amber-500" />
          Mode Debug
        </h3>
        <button 
          onClick={() => setDebugMode(false)}
          className="mb-4 px-3 py-1 bg-blue-600 text-white rounded-md text-sm"
        >
          Désactiver le mode debug
        </button>
        <pre className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-[500px] text-xs">
          {JSON.stringify(additionalInfo, null, 2)}
        </pre>
      </div>
    );
  }

  // Extraire les informations client
  const identity = additionalInfo?.identity || {};
  const address = additionalInfo?.address || {};
  const contract = additionalInfo?.contract || {};
  const contact = additionalInfo?.contact || {};

  console.log("Données d'identité:", identity);
  console.log("Données d'adresse:", address);
  console.log("Données de contrat:", contract);
  console.log("Données de contact:", contact);

  return (
    <div className="space-y-6" ref={infoRef}>
      {/* Informations client */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-blue-500" />
          <span onClick={handleDebugClick}>Informations client</span>
        </h3>
        
        {identity && Object.keys(identity).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Nom</p>
              <p className="text-base text-gray-900">
                {identity.customer?.identity?.natural_person?.title || ''} {identity.customer?.identity?.natural_person?.name || ''} {identity.customer?.identity?.natural_person?.first_name || ''}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Type de client</p>
              <p className="text-base text-gray-900">{identity.customer?.customer_type || 'Particulier'}</p>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Informations d'identité non disponibles</p>
        )}
      </div>

      {/* Adresse */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Home className="h-5 w-5 text-green-500" />
          Adresse
        </h3>
        
        {address && Object.keys(address).length > 0 ? (
          <div>
            {address.usage_points?.usage_point?.usage_point_addresses ? (
              <>
                <p className="text-base text-gray-900">
                  {address.usage_points?.usage_point?.usage_point_addresses?.street_number || ''} {address.usage_points?.usage_point?.usage_point_addresses?.street || ''}
                </p>
                <p className="text-base text-gray-900">
                  {address.usage_points?.usage_point?.usage_point_addresses?.post_code || ''} {address.usage_points?.usage_point?.usage_point_addresses?.city || ''}
                </p>
                {address.usage_points?.usage_point?.usage_point_addresses?.country && (
                  <p className="text-base text-gray-900">
                    {address.usage_points?.usage_point?.usage_point_addresses?.country}
                  </p>
                )}
                {address.usage_points?.usage_point?.usage_point_addresses?.insee_code && (
                  <p className="text-sm text-gray-500 mt-2">
                    Code INSEE: {address.usage_points?.usage_point?.usage_point_addresses?.insee_code}
                  </p>
                )}
              </>
            ) : (
              <p className="text-gray-500 text-sm">Détails d'adresse non disponibles</p>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Informations d'adresse non disponibles</p>
        )}
      </div>

      {/* Coordonnées géographiques */}
      {coordinates && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MapPinned className="h-5 w-5 text-red-500" />
            Coordonnées géographiques
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Latitude</p>
              <p className="text-base text-gray-900">{coordinates.lat.toFixed(6)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Longitude</p>
              <p className="text-base text-gray-900">{coordinates.lon.toFixed(6)}</p>
            </div>
          </div>
          
          <div className="mt-4">
            <a 
              href={`https://www.google.com/maps?q=${coordinates.lat},${coordinates.lon}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Voir sur Google Maps</span>
            </a>
          </div>
        </div>
      )}

      {/* Contact */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Phone className="h-5 w-5 text-purple-500" />
          Contact
        </h3>
        
        {contact && Object.keys(contact).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contact.customer?.contact_data?.phone && (
              <div>
                <p className="text-sm font-medium text-gray-500">Téléphone</p>
                <p className="text-base text-gray-900">{contact.customer?.contact_data?.phone}</p>
              </div>
            )}
            {contact.customer?.contact_data?.email && (
              <div>
                <p className="text-sm font-medium text-gray-500">Email</p>
                <p className="text-base text-gray-900">{contact.customer?.contact_data?.email}</p>
              </div>
            )}
            {(!contact.customer?.contact_data?.phone && !contact.customer?.contact_data?.email) && (
              <p className="text-gray-500 text-sm">Aucune information de contact disponible</p>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Informations de contact non disponibles</p>
        )}
      </div>

      {/* Contrat */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-amber-500" />
          Contrat
        </h3>
        
        {contract && Object.keys(contract).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Point de livraison (PDL)</p>
              <p className="text-base text-gray-900">{contract.usage_points?.usage_point?.usage_point_id || 'Non disponible'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Type de compteur</p>
              <p className="text-base text-gray-900">{contract.usage_points?.usage_point?.meter_type || 'Non disponible'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Puissance souscrite</p>
              <p className="text-base text-gray-900">{contract.usage_points?.usage_point?.subscribed_power || 'Non disponible'} kVA</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Segment</p>
              <p className="text-base text-gray-900">{contract.usage_points?.usage_point?.segment || 'Non disponible'}</p>
            </div>
            {contract.usage_points?.usage_point?.contracts?.map((contractItem: any, index: number) => (
              <div key={index} className="md:col-span-2 bg-gray-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-gray-500">Contrat {index + 1}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                  {contractItem.contract_type && (
                    <div>
                      <p className="text-xs font-medium text-gray-500">Type</p>
                      <p className="text-sm text-gray-900">{contractItem.contract_type}</p>
                    </div>
                  )}
                  {contractItem.contract_status && (
                    <div>
                      <p className="text-xs font-medium text-gray-500">Statut</p>
                      <p className="text-sm text-gray-900">{contractItem.contract_status}</p>
                    </div>
                  )}
                  {contractItem.subscribed_power && (
                    <div>
                      <p className="text-xs font-medium text-gray-500">Puissance</p>
                      <p className="text-sm text-gray-900">{contractItem.subscribed_power} kVA</p>
                    </div>
                  )}
                  {contractItem.last_activation_date && (
                    <div>
                      <p className="text-xs font-medium text-gray-500">Dernière activation</p>
                      <p className="text-sm text-gray-900">{new Date(contractItem.last_activation_date).toLocaleDateString('fr-FR')}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Informations de contrat non disponibles</p>
        )}
      </div>

      {/* Caractéristiques techniques */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5 text-blue-500" />
          Caractéristiques techniques
        </h3>
        
        {contract && Object.keys(contract).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Type de compteur</p>
              <p className="text-base text-gray-900">
                {contract.usage_points?.usage_point?.meter_type === 'AMM' ? 'Linky' : 
                 contract.usage_points?.usage_point?.meter_type === 'PME-PMI' ? 'Professionnel' : 
                 contract.usage_points?.usage_point?.meter_type || 'Non disponible'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Offre tarifaire</p>
              <p className="text-base text-gray-900">
                {contract.usage_points?.usage_point?.tarif ? 
                  (contract.usage_points?.usage_point?.tarif.includes('HC') ? 'Heures Pleines / Heures Creuses' : 'Base') : 
                  'Non disponible'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Puissance souscrite</p>
              <p className="text-base text-gray-900">{contract.usage_points?.usage_point?.subscribed_power || 'Non disponible'} kVA</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Type de raccordement</p>
              <p className="text-base text-gray-900">
                {contract.usage_points?.usage_point?.meter_type === 'AMM' ? 'Linky' : 
                 contract.usage_points?.usage_point?.meter_type === 'PME-PMI' ? 'Professionnel' : 
                 'Standard'}
              </p>
            </div>
            {contract.usage_points?.usage_point?.usage_point_status && (
              <div>
                <p className="text-sm font-medium text-gray-500">Statut du point de livraison</p>
                <p className="text-base text-gray-900">{contract.usage_points?.usage_point?.usage_point_status}</p>
              </div>
            )}
            {contract.usage_points?.usage_point?.segment && (
              <div>
                <p className="text-sm font-medium text-gray-500">Segment</p>
                <p className="text-base text-gray-900">{contract.usage_points?.usage_point?.segment}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Caractéristiques techniques non disponibles</p>
        )}
      </div>

      {/* Bâtiment */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Building className="h-5 w-5 text-indigo-500" />
          Informations bâtiment
        </h3>
        
        {address && Object.keys(address).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {address.usage_points?.usage_point?.usage_point_addresses?.insee_code && (
              <div>
                <p className="text-sm font-medium text-gray-500">Code INSEE</p>
                <p className="text-base text-gray-900">{address.usage_points?.usage_point?.usage_point_addresses?.insee_code}</p>
              </div>
            )}
            {address.usage_points?.usage_point?.usage_point_addresses?.street_code && (
              <div>
                <p className="text-sm font-medium text-gray-500">Code rue</p>
                <p className="text-base text-gray-900">{address.usage_points?.usage_point?.usage_point_addresses?.street_code}</p>
              </div>
            )}
            {address.usage_points?.usage_point?.usage_point_addresses?.street_number && (
              <div>
                <p className="text-sm font-medium text-gray-500">Numéro</p>
                <p className="text-base text-gray-900">{address.usage_points?.usage_point?.usage_point_addresses?.street_number}</p>
              </div>
            )}
            {address.usage_points?.usage_point?.usage_point_addresses?.street && (
              <div>
                <p className="text-sm font-medium text-gray-500">Rue</p>
                <p className="text-base text-gray-900">{address.usage_points?.usage_point?.usage_point_addresses?.street}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Informations bâtiment non disponibles</p>
        )}
      </div>

      {/* Raccordement */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Plug className="h-5 w-5 text-orange-500" />
          Raccordement
        </h3>
        
        {contract && Object.keys(contract).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Type de compteur</p>
              <p className="text-base text-gray-900">
                {contract.usage_points?.usage_point?.meter_type === 'AMM' ? 'Linky' : 
                 contract.usage_points?.usage_point?.meter_type || 'Non disponible'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Type de branchement</p>
              <p className="text-base text-gray-900">
                {contract.usage_points?.usage_point?.subscribed_power && 
                 Number(contract.usage_points?.usage_point?.subscribed_power) <= 9 ? 'Monophasé' : 'Triphasé'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Puissance maximale</p>
              <p className="text-base text-gray-900">
                {contract.usage_points?.usage_point?.subscribed_power && 
                 Number(contract.usage_points?.usage_point?.subscribed_power) <= 9 ? '9 kVA' : '36 kVA'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Puissance installable en photovoltaïque</p>
              <p className="text-base text-gray-900">
                {contract.usage_points?.usage_point?.subscribed_power && 
                 Number(contract.usage_points?.usage_point?.subscribed_power) <= 9 ? '6 kWc' : '9 kWc'}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Informations de raccordement non disponibles</p>
        )}
      </div>

      {/* Informations supplémentaires */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Info className="h-5 w-5 text-gray-500" />
          Informations supplémentaires
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-500">PDL</p>
            <p className="text-base text-gray-900">{localStorage.getItem('enedis_usage_point_id') || 'Non disponible'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Date de dernière mise à jour</p>
            <p className="text-base text-gray-900">{new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
        
        <div className="mt-4 bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-800">
            Ces informations sont récupérées directement depuis votre compteur Linky via les API Enedis DataConnect.
            Elles sont utilisées uniquement pour optimiser votre installation solaire et ne sont pas partagées avec des tiers.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EnedisInfoDisplay;