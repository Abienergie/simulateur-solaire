import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapPin, Camera, Maximize, Minimize, RotateCw } from 'lucide-react';

interface LeafletMapViewProps {
  coordinates?: { lat: number; lon: number };
  onCoordinatesChange?: (coords: { lat: number; lon: number }) => void;
}

export default function LeafletMapView({ coordinates, onCoordinatesChange }: LeafletMapViewProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCaptureInProgress, setIsCaptureInProgress] = useState(false);
  const [captureSuccess, setCaptureSuccess] = useState(false);

  // 1. Récupération de la clé et vérification une seule fois
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  useEffect(() => {
    if (!apiKey) {
      setError('Clé API Google Maps manquante');
    }
  }, [apiKey]);

  // 2. Construire l'URL via useMemo (sans setState)
  const mapUrl = useMemo(() => {
    if (!coordinates || !apiKey) return '';
    const size = isExpanded ? '1200x800' : '600x400';
    return [
      `https://maps.googleapis.com/maps/api/staticmap`,
      `?center=${coordinates.lat},${coordinates.lon}`,
      `&zoom=18`,
      `&size=${size}`,
      `&maptype=satellite`,
      `&markers=color:red%7C${coordinates.lat},${coordinates.lon}`,
      `&key=${apiKey}`
    ].join('');
  }, [coordinates, apiKey, isExpanded]);

  // 3. Arrêter le loader quand l'URL change
  useEffect(() => {
    if (mapUrl) setIsLoading(false);
  }, [mapUrl]);

  // 4. Fonctions de capture / reset
  const toggleExpand = () => setIsExpanded(x => !x);
  const resetMap    = () => coordinates && onCoordinatesChange?.(coordinates);

  const captureMap = async () => {
    if (!mapUrl) {
      setError('Coordonnées ou clé manquantes pour la capture.');
      return;
    }
    try {
      setIsCaptureInProgress(true);
      // on test simplement le chargement de l'image
      await new Promise<void>((res, rej) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload  = () => res();
        img.onerror = () => rej(new Error('Échec chargement image'));
        img.src = mapUrl;
      });
      localStorage.setItem('satellite_image_url', mapUrl);
      setCaptureSuccess(true);
      setTimeout(() => setCaptureSuccess(false), 3000);
    } catch {
      setError("Impossible de capturer la carte satellite.");
    } finally {
      setIsCaptureInProgress(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow my-6">
      {/* En-tête */}
      <div className="p-4 flex items-center justify-between border-b border-gray-200">
        {/* Titre */}
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-blue-500" />
          <h3 className="text-lg font-medium text-gray-900">Vue satellite</h3>
        </div>

        {/* Boutons */}
        <div className="flex items-center gap-2">
          <button
            onClick={captureMap}
            disabled={isCaptureInProgress || !mapUrl}
            title="Capturer pour le rapport PDF"
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition"
          >
            {isCaptureInProgress
              ? <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent"></div>
              : <Camera className="h-5 w-5" />}
          </button>
          <button
            onClick={resetMap}
            disabled={!coordinates}
            title="Réinitialiser la vue"
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition"
          >
            <RotateCw className="h-5 w-5" />
          </button>
          <button
            onClick={toggleExpand}
            title={isExpanded ? 'Réduire' : 'Agrandir'}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition"
          >
            {isExpanded
              ? <Minimize className="h-5 w-5" />
              : <Maximize className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Conteneur de carte */}
      <div className={`relative ${isExpanded ? 'h-[calc(100vh-200px)]' : 'h-[300px]'}`}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 z-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10 text-center p-4">
            <p className="text-red-600">{error}</p>
            <button onClick={() => { setError(null); setIsLoading(true); }} className="ml-4 px-4 py-2 bg-blue-600 text-white rounded">Réessayer</button>
          </div>
        )}

        {!isLoading && !error && mapUrl && (
          <img
            src={mapUrl}
            alt="Vue satellite"
            className="w-full h-full object-contain"
            onError={() => setError('Impossible de charger la carte satellite.')}
          />
        )}

        {captureSuccess && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-green-100 text-green-800 px-4 py-2 rounded shadow flex items-center gap-2 z-20">
            <Camera className="h-4 w-4" /> Image capturée !
          </div>
        )}

        {coordinates && !error && (
          <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 px-3 py-2 rounded shadow z-10 text-xs text-gray-700">
            Coord : {coordinates.lat.toFixed(6)}, {coordinates.lon.toFixed(6)}
          </div>
        )}
      </div>
    </div>
  );
}
