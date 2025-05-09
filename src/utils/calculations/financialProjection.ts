import { FinancialParameters, FinancialProjection, YearlyProjection } from '../../types/financial';
import { getSubscriptionPrice, getPriceFromPower, calculateFinalPrice } from './priceCalculator';
import { PHYSICAL_BATTERIES, VIRTUAL_BATTERIES } from '../constants/batteryOptions';

function calculateYearlyValues(
  params: FinancialParameters,
  year: number,
  baseProduction: number,
  puissanceCrete: number,
  microOnduleurs: boolean = false
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
      case 'virtual':
        // Smart Battery achieves 100% autoconsumption
        autoconsommationRate = 1;
        break;
      case 'mybattery':
        // MyBattery keeps original autoconsommation rate
        autoconsommationRate = params.autoconsommation / 100;
        break;
      case 'physical':
        // Physical battery increases autoconsumption by its specified amount
        if (params.batterySelection.model) {
          const increase = params.batterySelection.model.autoconsumptionIncrease / 100;
          autoconsommationRate = Math.min(1, autoconsommationRate + increase);
        }
        break;
    }
  }

  // Increase autoconsumption by 5% with Enphase microinverters
  if (microOnduleurs) {
    autoconsommationRate = Math.min(1, autoconsommationRate + 0.05);
  }

  // Calculate energy distribution
  const autoconsommation = production * autoconsommationRate;
  const revente = production * (1 - autoconsommationRate);
  
  // Price calculations
  const prixKwhActualise = params.prixKwh * coefficientPrix;
  const economiesAutoconsommation = autoconsommation * prixKwhActualise;
  
  // Calculate revenue from surplus/resale
  let revenusRevente = 0;
  if (params.batterySelection?.type === 'mybattery') {
    // For MyBattery: surplus = (kWh price - 0.0996€) * surplus amount
    const prixSurplus = Math.max(0, prixKwhActualise - 0.0996);
    revenusRevente = revente * prixSurplus;
  } else {
    // Standard feed-in tariff for other cases
    const tarifReventeActualise = year <= 20 ? params.tarifRevente * coefficientIndexation : 0;
    revenusRevente = revente * tarifReventeActualise;
  }

  // Subscription costs
  const dureeAbonnement = params.dureeAbonnement || 20;
  let coutAbonnement = 0;
  if (params.financingMode === 'subscription' && year <= dureeAbonnement) {
    coutAbonnement = getSubscriptionPrice(puissanceCrete, dureeAbonnement) * 12;
  }

  // Add monthly cost of physical battery in subscription mode
  if (
    params.financingMode === 'subscription' &&
    params.batterySelection?.type === 'physical' &&
    params.batterySelection.model?.monthlyPrice &&
    year <= dureeAbonnement
  ) {
    coutAbonnement += params.batterySelection.model.monthlyPrice * 12;
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

  const gainTotal = economiesAutoconsommation + revenusRevente - coutAbonnement - coutMyLight;

  return {
    annee: year,
    production,
    autoconsommation,
    revente,
    economiesAutoconsommation,
    revenusRevente,
    coutAbonnement,
    coutMyLight,
    gainTotal
  };
}

export function generateFinancialProjection(
  params: FinancialParameters,
  productionAnnuelle: number,
  puissanceCrete: number,
  microOnduleurs: boolean = false
): FinancialProjection {
  const projectionAnnuelle: YearlyProjection[] = [];
  let totalAutoconsommation = 0;
  let totalRevente = 0;
  let totalAbonnement = 0;
  let totalMyLight = 0;
  let totalGains = 0;

  for (let year = 1; year <= 30; year++) {
    const yearlyValues = calculateYearlyValues(params, year, productionAnnuelle, puissanceCrete, microOnduleurs);
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

  // Calculate installation price including physical battery if present
  let prixInstallation = getPriceFromPower(puissanceCrete);
  if (params.financingMode === 'cash') {
    if (params.batterySelection?.type === 'physical' && params.batterySelection.model) {
      prixInstallation += params.batterySelection.model.oneTimePrice;
    }
    if (microOnduleurs) {
      // Add Enphase cost (0.50€/Wc)
      prixInstallation += Math.ceil((puissanceCrete * 500) / 100) * 100;
    }
  }

  const prixFinal = calculateFinalPrice(
    puissanceCrete,
    params.primeAutoconsommation,
    params.remiseCommerciale,
    microOnduleurs
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