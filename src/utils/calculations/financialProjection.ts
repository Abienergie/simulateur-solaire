import { FinancialParameters, FinancialProjection, YearlyProjection } from '../../types/financial';
import { getSubscriptionPrice, getPriceFromPower, calculateFinalPrice } from './priceCalculator';
import { PHYSICAL_BATTERIES, VIRTUAL_BATTERIES } from '../constants/batteryOptions';

function calculateYearlyValues(
  params: FinancialParameters,
  year: number,
  baseProduction: number,
  puissanceCrete: number
): YearlyProjection {
  // Basic coefficients
  const coefficientDegradation = Math.pow(1 + params.degradationPanneau / 100, year - 1);
  const coefficientIndexation = Math.pow(1 + params.indexationProduction / 100, year - 1);
  const coefficientPrix = Math.pow(1 + params.revalorisationEnergie / 100, year - 1);
  
  // Production with degradation
  const production = baseProduction * coefficientDegradation;

  // Calculate base autoconsumption rate
  let autoconsommationRate = params.autoconsommation / 100;

  // Adjust autoconsumption based on battery type and capacity
  if (params.batterySelection) {
    switch (params.batterySelection.type) {
      case 'physical':
        if (params.batterySelection.model) {
          // Physical battery increases autoconsumption based on capacity
          const capacityFactor = params.batterySelection.model.capacity / puissanceCrete;
          const maxIncrease = params.batterySelection.model.autoconsumptionIncrease / 100;
          // Apply diminishing returns based on battery size relative to system size
          const actualIncrease = maxIncrease * (1 - Math.exp(-capacityFactor * 2));
          autoconsommationRate = Math.min(0.95, autoconsommationRate + actualIncrease);
        }
        break;
      case 'virtual':
        // Smart Battery achieves high autoconsumption through load shifting
        const virtualCapacity = params.batterySelection.virtualCapacity || 0;
        const capacityRatio = virtualCapacity / (production / 365); // Daily capacity ratio
        autoconsommationRate = Math.min(0.95, 0.75 + (capacityRatio * 0.2));
        break;
      case 'mybattery':
        // MyBattery provides 100% effective storage
        autoconsommationRate = 1;
        break;
    }
  }

  const autoconsommation = production * autoconsommationRate;
  const revente = production - autoconsommation;
  
  // Price calculations
  const prixKwhActualise = params.prixKwh * coefficientPrix;
  const economiesAutoconsommation = autoconsommation * prixKwhActualise;
  
  // Calculate revenue from surplus/resale
  let revenusRevente = 0;
  if (params.batterySelection?.type === 'mybattery') {
    // For MyBattery: surplus = (kWh price - 0.0995€) * surplus amount
    const prixSurplus = Math.max(0, prixKwhActualise - 0.0995);
    revenusRevente = revente * prixSurplus;
  } else {
    // Standard feed-in tariff for other cases
    const tarifReventeActualise = year <= 20 ? params.tarifRevente * coefficientIndexation : 0;
    revenusRevente = revente * tarifReventeActualise;
  }

  // Subscription and battery costs
  const dureeAbonnement = params.dureeAbonnement || 20;
  let coutAbonnement = 0;
  if (params.financingMode === 'subscription' && year <= dureeAbonnement) {
    coutAbonnement = getSubscriptionPrice(puissanceCrete, dureeAbonnement) * 12;
    
    // Add physical battery subscription cost if applicable
    if (params.batterySelection?.type === 'physical' && params.batterySelection.model) {
      const batteryDuration = params.batterySelection.model.duration;
      if (year <= batteryDuration) {
        coutAbonnement += params.batterySelection.model.monthlyPrice * 12;
      }
    }
  }

  // MyLight/Battery costs
  let coutMyLight = 0;
  if (params.batterySelection?.type === 'virtual' || params.batterySelection?.type === 'mybattery') {
    if (params.batterySelection.type === 'virtual') {
      // Smart Battery costs
      const virtualBattery = VIRTUAL_BATTERIES.find(b => b.capacity === params.batterySelection?.virtualCapacity);
      if (virtualBattery) {
        coutMyLight = virtualBattery.monthlyPrice * 12;
        if (year === 1) {
          coutMyLight += 2000; // Installation fee
          if (params.batterySelection.includeSmartCharger) {
            coutMyLight += 1500; // Smart charger
          }
        }
      }
    } else if (params.batterySelection.type === 'mybattery') {
      // MyBattery: 1.055€/kWc/month + setup fee first year
      coutMyLight = puissanceCrete * 1.055 * 12;
      if (year === 1) {
        coutMyLight += 179; // Setup fee
      }
    }
  }

  return {
    annee: year,
    production,
    autoconsommation,
    revente,
    economiesAutoconsommation,
    revenusRevente,
    coutAbonnement,
    coutMyLight,
    gainTotal: economiesAutoconsommation + revenusRevente - coutAbonnement - coutMyLight
  };
}

export function generateFinancialProjection(
  params: FinancialParameters,
  productionAnnuelle: number,
  puissanceCrete: number
): FinancialProjection {
  const projectionAnnuelle: YearlyProjection[] = [];
  let totalAutoconsommation = 0;
  let totalRevente = 0;
  let totalAbonnement = 0;
  let totalMyLight = 0;
  let totalGains = 0;

  for (let year = 1; year <= 30; year++) {
    const yearlyValues = calculateYearlyValues(params, year, productionAnnuelle, puissanceCrete);
    projectionAnnuelle.push(yearlyValues);

    totalAutoconsommation += yearlyValues.economiesAutoconsommation;
    totalRevente += yearlyValues.revenusRevente;
    totalAbonnement += yearlyValues.coutAbonnement;
    totalMyLight += yearlyValues.coutMyLight;
    totalGains += yearlyValues.gainTotal;
  }

  const moyenneAnnuelle = {
    autoconsommation: totalAutoconsommation / 30,
    revente: totalRevente / 30,
    abonnement: totalAbonnement / 30,
    myLight: totalMyLight / 30,
    total: totalGains / 30
  };

  const prixInstallation = getPriceFromPower(puissanceCrete);
  const prixFinal = calculateFinalPrice(
    puissanceCrete,
    params.primeAutoconsommation,
    params.remiseCommerciale
  );

  let cumulGains = 0;
  let anneeRentabilite = 0;
  for (let i = 0; i < projectionAnnuelle.length; i++) {
    cumulGains += projectionAnnuelle[i].gainTotal;
    if (cumulGains >= prixFinal && anneeRentabilite === 0) {
      anneeRentabilite = i + 1;
    }
  }

  return {
    projectionAnnuelle,
    totalAutoconsommation,
    totalRevente,
    totalAbonnement,
    totalMyLight,
    totalGains,
    moyenneAnnuelle,
    anneeRentabilite,
    prixInstallation,
    primeAutoconsommation: params.primeAutoconsommation,
    remiseCommerciale: params.remiseCommerciale,
    prixFinal
  };
}