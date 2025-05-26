import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';

interface SmartBatteryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SmartBatteryModal({ isOpen, onClose }: SmartBatteryModalProps) {
  const [videoError, setVideoError] = useState(false);
  
  // Direct Supabase URL for the GIF
  const SMART_BATTERY_GIF_URL = 'https://xpxbxfuckljqdvkajlmx.supabase.co/storage/v1/object/public/smartbattery/MySmartBattery%20-%20French%20version.gif';
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-4xl w-full mx-auto relative">
        <button
          onClick={onClose}
          className="absolute -top-4 -right-4 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors"
        >
          <X className="h-5 w-5 text-gray-600" />
        </button>
        
        <div className="aspect-video rounded-lg overflow-hidden bg-black">
          {videoError ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 p-4">
              <AlertCircle className="h-10 w-10 text-amber-500 mb-2" />
              <p className="text-gray-700 text-center">
                La vidéo n'a pas pu être chargée. Veuillez réessayer ultérieurement.
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Vous pouvez également accéder directement à la vidéo via <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">ce lien</a>.
              </p>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <img 
                src={SMART_BATTERY_GIF_URL}
                alt="Smart Battery Demonstration" 
                className="max-w-full max-h-full object-contain"
                onError={() => setVideoError(true)}
              />
            </div>
          )}
        </div>
        
        <div className="mt-6 text-center">
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            Smart Battery : l'innovation au service de votre autonomie
          </h3>
          <p className="text-sm text-gray-600 max-w-2xl mx-auto">
            Découvrez comment la Smart Battery optimise votre consommation d'énergie en pilotant intelligemment vos équipements pour maximiser l'autoconsommation sans batterie physique. Récupérez la nuit, en hiver, le surplus solaire stocké avec un rendement optimal : <strong>1kWh stocké = 1kWh restitué</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}