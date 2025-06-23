import { ConsumptionData } from '../../types/consumption';

const STORAGE_KEY = 'enedis_consumption_data';

export async function saveConsumptionData(data: ConsumptionData[]): Promise<ConsumptionData[]> {
  try {
    console.log(`Sauvegarde de ${data.length} jours de données de consommation`);
    const existingData = getStoredData();
    const mergedData = mergeConsumptionData(existingData, data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedData));
    return mergedData;
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des données:', error);
    throw error;
  }
}

export async function getConsumptionData(prm: string, startDate: string, endDate: string): Promise<ConsumptionData[]> {
  try {
    console.log(`Récupération des données pour le PDL ${prm} du ${startDate} au ${endDate}`);
    const data = getStoredData();
    return filterConsumptionData(data, prm, startDate, endDate);
  } catch (error) {
    console.error('Erreur lors de la récupération des données:', error);
    throw error;
  }
}

function getStoredData(): ConsumptionData[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    console.log('Aucune donnée stockée dans le localStorage');
    return [];
  }
  
  try {
    const data = JSON.parse(stored);
    console.log(`${data.length} jours de données trouvés dans le localStorage`);
    return data;
  } catch (error) {
    console.error('Erreur lors du parsing des données stockées:', error);
    return [];
  }
}

function mergeConsumptionData(existing: ConsumptionData[], newData: ConsumptionData[]): ConsumptionData[] {
  console.log(`Fusion de ${existing.length} jours existants avec ${newData.length} nouveaux jours`);
  const dataMap = new Map(existing.map(item => [`${item.prm}-${item.date}`, item]));
  
  newData.forEach(item => {
    dataMap.set(`${item.prm}-${item.date}`, item);
  });

  const result = Array.from(dataMap.values());
  console.log(`Résultat de la fusion: ${result.length} jours`);
  return result;
}

function filterConsumptionData(
  data: ConsumptionData[],
  prm: string,
  startDate: string,
  endDate: string
): ConsumptionData[] {
  console.log(`Filtrage des données pour le PDL ${prm} du ${startDate} au ${endDate}`);
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const filtered = data.filter(item => {
    const date = new Date(item.date);
    return (
      item.prm === prm &&
      date >= start &&
      date <= end
    );
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  console.log(`${filtered.length} jours après filtrage`);
  return filtered;
}

// Fonction pour générer des données de consommation fictives (pour les tests)
export function generateMockConsumptionData(prm: string, days: number = 365): ConsumptionData[] {
  const data: ConsumptionData[] = [];
  const today = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateString = date.toISOString().split('T')[0];
    
    // Générer des valeurs qui varient selon le jour de la semaine et la saison
    const dayOfWeek = date.getDay(); // 0 = dimanche, 6 = samedi
    const month = date.getMonth(); // 0 = janvier, 11 = décembre
    
    // Facteur saisonnier (plus élevé en hiver)
    const seasonFactor = month >= 10 || month <= 2 ? 1.5 : // Hiver
                         month >= 3 && month <= 5 ? 1.0 :  // Printemps
                         month >= 6 && month <= 8 ? 0.8 :  // Été
                         1.2;                              // Automne
    
    // Facteur jour de semaine (plus bas le weekend)
    const weekdayFactor = dayOfWeek === 0 || dayOfWeek === 6 ? 0.9 : 1.1;
    
    // Base de consommation avec variation aléatoire
    const baseConsumption = 10 * seasonFactor * weekdayFactor;
    const randomVariation = 0.8 + Math.random() * 0.4; // Entre 0.8 et 1.2
    
    // Répartition heures pleines / heures creuses
    const totalConsumption = baseConsumption * randomVariation;
    const peakRatio = 0.7; // 70% en heures pleines
    
    data.push({
      prm,
      date: dateString,
      peakHours: Math.round(totalConsumption * peakRatio * 100) / 100,
      offPeakHours: Math.round(totalConsumption * (1 - peakRatio) * 100) / 100
    });
  }
  
  return data;
}