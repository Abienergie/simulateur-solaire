import React from 'react';
import { Cpu, Info } from 'lucide-react';
import Tooltip from '../Tooltip';
import { formatCurrency } from '../../utils/formatters';

interface InstalledTechnologiesProps {
  financingMode: 'cash' | 'subscription';
  inverterType: 'central' | 'solenso' | 'enphase';
  onInverterChange: (type: 'central' | 'solenso' | 'enphase') => void;
  bifacial: boolean;
  onBifacialChange: (enabled: boolean) => void;
  installedPower: number;
}

export default function InstalledTechnologies({
  financingMode,
  inverterType,
  onInverterChange,
  bifacial,
  onBifacialChange,
  installedPower
}: InstalledTechnologiesProps) {
  // Calculer le surcoût Enphase
  const calculateEnphaseCost = (powerInKw: number): number => {
    const baseCost = powerInKw * 500; // 0.50€/Wc TTC
    return Math.ceil(baseCost / 100) * 100; // Arrondi à la centaine supérieure
  };

  const enphaseAdditionalCost = inverterType === 'enphase' ? 
    calculateEnphaseCost(installedPower) : 0;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-sm border border-blue-100 p-6">
      <div className="flex items-center gap-3 mb-6">
        <Cpu className="h-6 w-6 text-blue-600" />
        <h3 className="text-lg font-medium text-gray-900">
          Technologies installées
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Choix de l'onduleur */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Type d'onduleur
            </label>
            <Tooltip content="L'onduleur convertit le courant continu des panneaux en courant alternatif compatible avec votre installation électrique. Les micro-onduleurs optimisent la production de chaque panneau individuellement." />
          </div>
          <select
            value={inverterType}
            onChange={(e) => onInverterChange(e.target.value as 'central' | 'solenso' | 'enphase')}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="central">Onduleur centralisé</option>
            <option value="solenso">Micro-onduleur Solenso (1 pour 2 panneaux)</option>
            <option value="enphase" disabled={financingMode === 'subscription'}>
              Micro-onduleur Enphase (1 par panneau)
              {inverterType === 'enphase' && ` + ${formatCurrency(enphaseAdditionalCost)}`}
            </option>
          </select>
        </div>

        {/* Choix du panneau */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Type de panneau
            </label>
            <Tooltip content="Les panneaux bifaciaux captent la lumière des deux côtés, augmentant la production jusqu'à 10% selon les conditions d'installation." />
          </div>
          <select
            value={bifacial ? 'bifacial' : 'monofacial'}
            onChange={(e) => onBifacialChange(e.target.value === 'bifacial')}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="monofacial">Monofacial standard</option>
            <option value="bifacial">Bifacial haute performance</option>
          </select>
        </div>
      </div>
    </div>
  );
}