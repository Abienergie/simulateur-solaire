import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Maximize, Minimize, RotateCw } from 'lucide-react';

interface GoogleMapsViewProps {
  coordinates: { lat: number; lon: number } | undefined;
  onCoordinatesChange?: (coordinates: { lat: number; lon: number }) => void;
}

// Keep track of the script loading state globally
let isScriptLoading = false;
let scriptLoadPromise: Promise<void> | null = null;

const loadGoogleMapsScript = (): Promise<void> => {
  if (window.google?.maps) {
    return Promise.resolve();
  }

  if (scriptLoadPromise) {
    return scriptLoadPromise;
  }

  scriptLoadPromise = new Promise((resolve, reject) => {
    if (isScriptLoading) return;
    
    isScriptLoading = true;
    
    // Get API key from environment variables
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.error('Google Maps API key is not defined in environment variables');
      reject(new Error('Google Maps API key is missing'));
      isScriptLoading = false;
      scriptLoadPromise = null;
      return;
    }
    
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      isScriptLoading = false;
      scriptLoadPromise = null;
      resolve();
    };
    
    script.onerror = () => {
      isScriptLoading = false;
      scriptLoadPromise = null;
      reject(new Error("Failed to load Google Maps API"));
    };
    
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
};

export default function GoogleMapsView({ coordinates, onCoordinatesChange }: GoogleMapsViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [marker, setMarker] = useState<google.maps.Marker | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCaptureInProgress, setIsCaptureInProgress] = useState(false);
  const [captureSuccess, setCaptureSuccess] = useState(false);

  // Initialize map when component mounts
  useEffect(() => {
    let isMounted = true;

    const initializeMap = async () => {
      if (!mapRef.current) return;

      try {
        setIsLoading(true);
        await loadGoogleMapsScript();

        if (!isMounted) return;

        // Create map instance if it doesn't exist
        if (!map) {
          const initialCenter = coordinates 
            ? { lat: coordinates.lat, lng: coordinates.lon }
            : { lat: 48.8566, lng: 2.3522 }; // Default to Paris if no coordinates
          
          const newMap = new google.maps.Map(mapRef.current, {
            center: initialCenter,
            zoom: 18,
            mapTypeId: 'satellite',
            mapTypeControl: true,
            mapTypeControlOptions: {
              style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
              position: google.maps.ControlPosition.TOP_RIGHT,
              mapTypeIds: ['roadmap', 'satellite']
            },
            fullscreenControl: false,
            streetViewControl: true,
            zoomControl: true,
            tilt: 0 // Force a top-down view (0 degrees tilt)
          });
          
          setMap(newMap);
          
          // Only create marker if coordinates exist
          if (coordinates) {
            const newMarker = new google.maps.Marker({
              position: { lat: coordinates.lat, lng: coordinates.lon },
              map: newMap,
              draggable: true,
              animation: google.maps.Animation.DROP,
              title: 'Votre installation'
            });
            
            setMarker(newMarker);
            
            newMarker.addListener('dragend', () => {
              const position = newMarker.getPosition();
              if (position && onCoordinatesChange) {
                onCoordinatesChange({
                  lat: position.lat(),
                  lon: position.lng()
                });
                
                // Generate and save static map image when marker is moved
                generateStaticMapImage(position.lat(), position.lng());
              }
            });
            
            newMap.addListener('click', (e: google.maps.MapMouseEvent) => {
              if (e.latLng && newMarker) {
                newMarker.setPosition(e.latLng);
                if (onCoordinatesChange) {
                  onCoordinatesChange({
                    lat: e.latLng.lat(),
                    lon: e.latLng.lng()
                  });
                  
                  // Generate and save static map image when map is clicked
                  generateStaticMapImage(e.latLng.lat(), e.latLng.lng());
                }
              }
            });
            
            // Generate initial static map image
            generateStaticMapImage(coordinates.lat, coordinates.lon);
          }
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error initializing map:', err);
        if (isMounted) {
          setError('Error initializing map');
          setIsLoading(false);
        }
      }
    };

    initializeMap();

    return () => {
      isMounted = false;
      if (marker) {
        marker.setMap(null);
      }
      if (map) {
        // Clean up event listeners
        google.maps.event.clearInstanceListeners(map);
      }
    };
  }, []);

  // Separate effect to update map and marker when coordinates change
  useEffect(() => {
    if (map && coordinates) {
      map.setCenter({ lat: coordinates.lat, lng: coordinates.lon });
      if (marker) {
        marker.setPosition({ lat: coordinates.lat, lng: coordinates.lon });
      } else {
        const newMarker = new google.maps.Marker({
          position: { lat: coordinates.lat, lng: coordinates.lon },
          map: map,
          draggable: true,
          animation: google.maps.Animation.DROP,
          title: 'Votre installation'
        });
        
        setMarker(newMarker);
        
        newMarker.addListener('dragend', () => {
          const position = newMarker.getPosition();
          if (position && onCoordinatesChange) {
            onCoordinatesChange({
              lat: position.lat(),
              lon: position.lng()
            });
            
            // Generate and save static map image when marker is moved
            generateStaticMapImage(position.lat(), position.lng());
          }
        });
      }
      
      // Generate static map image when coordinates change
      generateStaticMapImage(coordinates.lat, coordinates.lon);
    }
  }, [coordinates, map, onCoordinatesChange]);

  useEffect(() => {
    if (map) {
      const handleResize = () => {
        google.maps.event.trigger(map, 'resize');
        if (coordinates) {
          map.setCenter({ lat: coordinates.lat, lng: coordinates.lon });
        }
      };
      
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [map, coordinates]);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
    setTimeout(() => {
      if (map) {
        google.maps.event.trigger(map, 'resize');
        if (coordinates) {
          map.setCenter({ lat: coordinates.lat, lng: coordinates.lon });
        }
      }
    }, 300);
  };

  const resetMap = () => {
    if (map && coordinates) {
      map.setCenter({ lat: coordinates.lat, lng: coordinates.lon });
      map.setZoom(18);
      if (marker) {
        marker.setPosition({ lat: coordinates.lat, lng: coordinates.lon });
        if (onCoordinatesChange) {
          onCoordinatesChange(coordinates);
        }
        
        // Generate static map image when map is reset
        generateStaticMapImage(coordinates.lat, coordinates.lon);
      }
    }
  };
  
  // Function to generate and save static map image
  const generateStaticMapImage = (lat: number, lng: number) => {
    try {
      // Get API key from environment variables
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      
      if (!apiKey) {
        console.error('Google Maps API key is missing');
        return;
      }
      
      // Create static map URL
      const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=20&size=600x400&maptype=satellite&markers=color:red%7C${lat},${lng}&key=${apiKey}`;
      
      console.log('Generated static map URL for PDF');
      
      // Store the URL in localStorage for PDF generation
      localStorage.setItem('satellite_image_url', staticMapUrl);
      
      // Create an image to test if the URL is valid
      const img = new Image();
      img.onload = () => {
        console.log('Static map image loaded successfully');
      };
      img.onerror = () => {
        console.error('Failed to load static map image');
      };
      img.src = staticMapUrl;
    } catch (error) {
      console.error('Error generating static map image:', error);
    }
  };

  const captureMap = async () => {
    if (!coordinates) {
      setError("Impossible de capturer la carte. Coordonnées non disponibles.");
      return;
    }

    try {
      setIsCaptureInProgress(true);
      setCaptureSuccess(false);
      
      // Créer une URL pour la carte statique
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      
      if (!apiKey) {
        throw new Error('Clé API Google Maps manquante');
      }
      
      const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${coordinates.lat},${coordinates.lon}&zoom=20&size=600x400&maptype=satellite&markers=color:red%7C${coordinates.lat},${coordinates.lon}&key=${apiKey}`;
      
      // Stocker l'URL dans localStorage pour la génération PDF
      localStorage.setItem('satellite_image_url', staticMapUrl);
      
      // Créer une image pour tester si l'URL est valide
      const img = new Image();
      img.onload = () => {
        setIsCaptureInProgress(false);
        setCaptureSuccess(true);
        setTimeout(() => setCaptureSuccess(false), 3000);
      };
      img.onerror = () => {
        setIsCaptureInProgress(false);
        setError("Impossible de capturer la carte. Vérifiez votre clé API Google Maps.");
      };
      img.src = staticMapUrl;
      
    } catch (err) {
      console.error('Erreur lors de la capture de la carte:', err);
      setIsCaptureInProgress(false);
      setError("Impossible de capturer la carte satellite.");
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow transition-all duration-300 ${isExpanded ? 'fixed inset-4 z-50' : ''}`}>
      <div className="p-4 flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-blue-500" />
          <h3 className="text-lg font-medium text-gray-900">Vue satellite</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={resetMap}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
            title="Réinitialiser la vue"
          >
            <RotateCw className="h-5 w-5" />
          </button>
          <button
            onClick={toggleExpand}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
            title={isExpanded ? "Réduire" : "Agrandir"}
          >
            {isExpanded ? (
              <Minimize className="h-5 w-5" />
            ) : (
              <Maximize className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
      
      <div className={`relative ${isExpanded ? 'h-[calc(100%-60px)]' : 'h-[300px]'}`}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 z-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
            <div className="text-center p-4">
              <div className="bg-red-100 p-2 rounded-full inline-flex items-center justify-center mb-2">
                <MapPin className="h-6 w-6 text-red-500" />
              </div>
              <p className="text-red-600">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Réessayer
              </button>
            </div>
          </div>
        )}
        
        <div 
          ref={mapRef} 
          className="w-full h-full"
        />
        
        {!isLoading && !error && (
          <div className="absolute top-4 left-4 bg-white bg-opacity-90 px-3 py-2 rounded-lg shadow-md z-10">
            <p className="text-sm text-gray-700 flex items-center gap-1">
              <MapPin className="h-4 w-4 text-blue-500" />
              Cliquez pour positionner votre maison
            </p>
          </div>
        )}
        
        {captureSuccess && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-green-100 text-green-800 px-4 py-2 rounded-lg shadow-md z-[1000] flex items-center gap-2">
            <span>Image capturée avec succès pour le rapport PDF</span>
          </div>
        )}
        
        {coordinates && !error && (
          <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 px-3 py-2 rounded-lg shadow-md z-10">
            <p className="text-xs text-gray-700">
              Coordonnées: {coordinates.lat.toFixed(6)}, {coordinates.lon.toFixed(6)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}