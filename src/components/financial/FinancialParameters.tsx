import React, { useState, useEffect } from 'react';
import { FinancialParametersType } from '../../types/financial';
import FormField from '../FormField';
import FormFieldWithTooltip from '../FormFieldWithTooltip';
import { formatCurrency } from '../../utils/formatters';
import { getPriceFromPower, calculateFinalPrice } from '../../utils/calculations/priceCalculator';
import Tooltip from '../Tooltip';
import { Info } from 'lucide-react';
import { useFinancialSettings } from '../../contexts/FinancialSettingsContext';
import BatterySelector from '../BatterySelector';

const CONNECTION_OPTIONS = [
  { value: 'surplus', label: 'Auto-consommation + revente de surplus' },
  { value: 'total_auto', label: 'Auto-consommation totale' },
  { value: 'total_sale', label: 'Revente totale' }
];

interface FinancialParametersProps {
  parameters: FinancialParametersType;
  onParameterChange: (updates: Partial<FinancialParametersType>) => void;
  puissanceCrete: number;
}

export default function FinancialParameters({ 
  parameters, 
  onParameterChange,
  puissanceCrete
}: FinancialParametersProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const { settings } = useFinancialSettings();
  
  // Initialize connection type and calculate prime on mount
  useEffect(() => {
    if (!settings) return;

    const initialUpdates: Partial<FinancialParametersType> = {
      connectionType: 'surplus'
    };

    // Calculate initial prime for surplus connection
    const primeAmount = calculateSubsidy(puissanceCrete, settings);
    initialUpdates.primeAutoconsommation = primeAmount;

    onParameterChange(initialUpdates);
  }, [settings]);

  useEffect(() => {
    if (!settings) return;

    const connectionType = parameters.connectionType || 'surplus';
    let tariff = 0;

    if (connectionType === 'surplus' && settings.surplusSellPrices) {
      if (puissanceCrete <= 9) {
        tariff = settings.surplusSellPrices.under9kw;
      } else if (puissanceCrete <= 36) {
        tariff = settings.surplusSellPrices.from9to36kw;
      } else if (puissanceCrete <= 100) {
        tariff = settings.surplusSellPrices.from36to100kw;
      }
    } else if (connectionType === 'total_sale' && settings.totalSellPrices) {
      if (puissanceCrete <= 9) {
        tariff = settings.totalSellPrices.under9kw;
      } else if (puissanceCrete <= 36) {
        tariff = settings.totalSellPrices.from9to36kw;
      } else if (puissanceCrete <= 100) {
        tariff = settings.totalSellPrices.from36to100kw;
      }
    }

    const updates: Partial<FinancialParametersType> = {
      tarifRevente: Number(tariff.toFixed(3))
    };

    if (connectionType === 'total_sale') {
      updates.autoconsommation = 0;
      // Reset battery selection when switching to total sale
      updates.batterySelection = null;
    } else if (parameters.autoconsommation === 0) {
      updates.autoconsommation = 75;
    }

    // Calculate prime only for surplus connection
    const primeAmount = connectionType === 'surplus' ? calculateSubsidy(puissanceCrete, settings) : 0;
    updates.primeAutoconsommation = primeAmount;

    onParameterChange(updates);
  }, [parameters.connectionType, puissanceCrete, settings]);

  const calculateSubsidy = (power: number, settings: any): number => {
    if (!settings) return 0;
    
    let primeAmount = 0;
    if (power <= 3) {
      primeAmount = settings.defaultSubsidyUnder3kw * power;
    } else if (power <= 9) {
      primeAmount = settings.defaultSubsidyOver3kw * power;
    } else if (power <= 36) {
      primeAmount = settings.defaultSubsidy9to36kw * power;
    } else if (power <= 100) {
      primeAmount = settings.defaultSubsidy36to100kw * power;
    }
    return Math.round(primeAmount);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let parsedValue = parseFloat(value);

    switch (name) {
      case 'remiseCommerciale':
        parsedValue = Math.min(Math.max(0, parsedValue), 10000);
        break;
      case 'revalorisationEnergie':
        parsedValue = Math.min(Math.max(0, parsedValue), 10);
        break;
      case 'indexationProduction':
        parsedValue = Math.min(Math.max(-5, parsedValue), 3);
        break;
    }

    onParameterChange({ [name]: parsedValue });
  };

  const handleConnectionTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onParameterChange({ connectionType: e.target.value });
  };

  const handleBatteryChange = (batterySelection: any) => {
    onParameterChange({ 
      batterySelection,
      autoconsommation: batterySelection.resetAutoconsumption || parameters.autoconsommation
    });
  };

  const basePrice = getPriceFromPower(puissanceCrete);
  const remiseAmount = parameters.remiseCommerciale;
  const priceAfterRemise = basePrice - remiseAmount;
  const primeAmount = parameters.primeAutoconsommation;
  const finalPrice = calculateFinalPrice(
    puissanceCrete,
    parameters.primeAutoconsommation,
    parameters.remiseCommerciale
  );

  let formattedSellPriceDate = '';
  let formattedSubsidyDate = '';
  try {
    if (settings?.sellPriceDate) {
      const sellPriceDate = new Date(settings.sellPriceDate);
      if (!isNaN(sellPriceDate.getTime())) {
        formattedSellPriceDate = new Intl.DateTimeFormat('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }).format(sellPriceDate);
      }
    }
    if (settings?.subsidyDate) {
      const subsidyDate = new Date(settings.subsidyDate);
      if (!isNaN(subsidyDate.getTime())) {
        formattedSubsidyDate = new Intl.DateTimeFormat('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }).format(subsidyDate);
      }
    }
  } catch (error) {
    console.error('Erreur lors du formatage des dates:', error);
    formattedSellPriceDate = 'Date non disponible';
    formattedSubsidyDate = 'Date non disponible';
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Type de raccordement</h3>
      
      <div className="grid grid-cols-1 gap-6">
        <div>
          <select
            value={parameters.connectionType || 'surplus'}
            onChange={handleConnectionTypeChange}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            {CONNECTION_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {parameters.financingMode === 'cash' && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-700">Prix de base TTC</span>
              <span className="font-semibold">{formatCurrency(basePrice)}</span>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Remise commerciale
                </label>
                <div className="relative mt-1 rounded-md shadow-sm">
                  <input
                    type="number"
                    name="remiseCommerciale"
                    value={parameters.remiseCommerciale}
                    onChange={handleChange}
                    min={0}
                    max={basePrice}
                    step={100}
                    className="block w-full rounded-md border-gray-300 pl-3 pr-12 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-gray-500 sm:text-sm">€</span>
                  </div>
                </div>
              </div>

              {parameters.remiseCommerciale > 0 && (
                <div className="flex justify-between items-center text-gray-700">
                  <span>Prix TTC remisé</span>
                  <span className="font-semibold">{formatCurrency(priceAfterRemise)}</span>
                </div>
              )}
              
              {parameters.connectionType === 'surplus' && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-700">Prime à l'autoconsommation</span>
                    <Tooltip content={`Prime en vigueur au ${formattedSubsidyDate} pour les installations en autoconsommation avec revente de surplus`}>
                      <Info className="h-4 w-4 text-gray-400 cursor-help" />
                    </Tooltip>
                  </div>
                  <span className="font-semibold text-green-600">
                    -{formatCurrency(primeAmount)}
                  </span>
                </div>
              )}
              
              <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
                <span className="text-gray-700">Prix final TTC</span>
                <span className="text-xl font-bold text-blue-600">
                  {formatCurrency(finalPrice)}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FormField
            label="Prix du kWh"
            name="prixKwh"
            value={parameters.prixKwh}
            onChange={handleChange}
            min={0}
            max={1}
            step={0.01}
            unit="€/kWh"
          />

          <div>
            <div className="flex items-center gap-2 mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Tarif de revente
              </label>
              <div className="relative">
                <Info 
                  className="h-4 w-4 text-gray-400 cursor-help"
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                />
                {showTooltip && (
                  <div className="absolute z-10 w-72 p-3 bg-gray-900 text-white text-sm rounded-lg -right-2 top-6">
                    <div className="absolute -top-1 right-3 w-2 h-2 bg-gray-900 rotate-45"></div>
                    <p>Tarif en vigueur au {formattedSellPriceDate}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="relative">
              <input
                type="number"
                name="tarifRevente"
                value={(parameters.tarifRevente || 0).toFixed(3)}
                disabled
                className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 text-gray-500 shadow-sm focus:border-gray-300 focus:ring-0 cursor-not-allowed disabled:bg-gray-100"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <span className="text-gray-500 sm:text-sm">€/kWh</span>
              </div>
            </div>
          </div>

          <FormField
            label="Niveau d'autoconsommation"
            name="autoconsommation"
            value={parameters.autoconsommation}
            onChange={handleChange}
            min={0}
            max={100}
            unit="%"
            disabled={parameters.connectionType === 'total_sale'}
          />

          <FormField
            label="Revalorisation annuelle"
            name="revalorisationEnergie"
            value={parameters.revalorisationEnergie}
            onChange={handleChange}
            min={0}
            max={10}
            unit="%"
          />

          <FormFieldWithTooltip
            label="Indexation revente"
            name="indexationProduction"
            value={parameters.indexationProduction}
            onChange={handleChange}
            min={-5}
            max={3}
            step={0.1}
            unit="%"
            tooltipContent="Évolution annuelle du tarif de revente de l'électricité"
          />

          <FormFieldWithTooltip
            label="Dégradation panneaux"
            name="degradationPanneau"
            value={parameters.degradationPanneau}
            onChange={handleChange}
            min={-2}
            max={0}
            step={0.1}
            unit="%"
            tooltipContent="Dégradation annuelle de la production des panneaux solaires (-0.2% par défaut)"
          />
        </div>

        <BatterySelector
  value={parameters.batterySelection || { type: null }}
  onChange={handleBatteryChange}
  subscriptionDuration={parameters.dureeAbonnement || 20}
  installedPower={puissanceCrete}
  initialAutoconsumption={75}
  connectionType={parameters.connectionType}
  batteryFormula={parameters.financingMode === 'subscription' ? 'abonnement' : 'comptant'} // ← AJOUT ESSENTIEL
/>
      </div>
    </div>
  );
}