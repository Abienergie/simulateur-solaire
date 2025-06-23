import React, { useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { Calendar, Clock } from 'lucide-react';
import type { ConsumptionData } from '../types/consumption';

interface DailyConsumptionPatternsProps {
  data: ConsumptionData[];
}

const DAYS_OF_WEEK = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

const DailyConsumptionPatterns: React.FC<DailyConsumptionPatternsProps> = ({ data }) => {
  // Calcul des données par jour de la semaine
  const weekdayData = useMemo(() => {
    const byDayOfWeek = data.reduce((acc, item) => {
      const date = new Date(item.date);
      const dayOfWeek = date.getDay(); // 0 = Dimanche, 1 = Lundi, etc.
      
      if (!acc[dayOfWeek]) {
        acc[dayOfWeek] = {
          dayOfWeek,
          dayName: DAYS_OF_WEEK[dayOfWeek],
          peakHours: 0,
          offPeakHours: 0,
          totalConsumption: 0,
          count: 0
        };
      }
      
      acc[dayOfWeek].peakHours += item.peakHours;
      acc[dayOfWeek].offPeakHours += item.offPeakHours;
      acc[dayOfWeek].totalConsumption += item.peakHours + item.offPeakHours;
      acc[dayOfWeek].count += 1;
      
      return acc;
    }, {} as Record<number, any>);

    // Calculer les moyennes et trier par jour de la semaine
    return Object.values(byDayOfWeek)
      .map(day => ({
        ...day,
        avgPeakHours: day.peakHours / day.count,
        avgOffPeakHours: day.offPeakHours / day.count,
        avgTotalConsumption: day.totalConsumption / day.count
      }))
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  }, [data]);

  // Calcul des données de tendance sur les 30 derniers jours
  const recentTrendData = useMemo(() => {
    return data
      .slice(-30)
      .map(item => {
        const date = new Date(item.date);
        return {
          date: item.date,
          displayDate: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
          dayOfWeek: DAYS_OF_WEEK[date.getDay()],
          totalConsumption: item.peakHours + item.offPeakHours,
          peakHours: item.peakHours,
          offPeakHours: item.offPeakHours
        };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [data]);

  // Calcul des statistiques par jour de la semaine
  const weekdayStats = useMemo(() => {
    if (weekdayData.length === 0) return null;
    
    const maxDay = weekdayData.reduce((max, day) => 
      day.avgTotalConsumption > max.avgTotalConsumption ? day : max, weekdayData[0]);
    
    const minDay = weekdayData.reduce((min, day) => 
      day.avgTotalConsumption < min.avgTotalConsumption ? day : min, weekdayData[0]);
    
    const weekdayAvg = weekdayData
      .filter(day => day.dayOfWeek >= 1 && day.dayOfWeek <= 5)
      .reduce((sum, day) => sum + day.avgTotalConsumption, 0) / 5;
    
    const weekendAvg = weekdayData
      .filter(day => day.dayOfWeek === 0 || day.dayOfWeek === 6)
      .reduce((sum, day) => sum + day.avgTotalConsumption, 0) / 2;
    
    return {
      maxDay,
      minDay,
      weekdayAvg,
      weekendAvg,
      weekdayWeekendDiff: ((weekdayAvg - weekendAvg) / weekendAvg) * 100
    };
  }, [weekdayData]);

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 text-center">
        <p className="text-gray-600">Aucune donnée de consommation disponible.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="h-6 w-6 text-blue-500" />
          <h3 className="text-lg font-semibold text-gray-900">
            Habitudes de consommation par jour de la semaine
          </h3>
        </div>
        
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={weekdayData}
              margin={{ top: 5, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="dayName" 
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                unit=" kWh"
                tick={{ fontSize: 12 }}
                width={80}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  `${value.toFixed(1)} kWh`,
                  name === "avgPeakHours" ? "Heures pleines" : 
                  name === "avgOffPeakHours" ? "Heures creuses" : 
                  "Consommation totale"
                ]}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '0.375rem',
                  padding: '8px 12px'
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="avgTotalConsumption"
                name="Consommation totale"
                stroke="#8B5CF6"
                strokeWidth={2}
                dot={{ r: 5 }}
                activeDot={{ r: 7 }}
              />
              <Line
                type="monotone"
                dataKey="avgPeakHours"
                name="Heures pleines"
                stroke="#4F46E5"
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="avgOffPeakHours"
                name="Heures creuses"
                stroke="#14B8A6"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {weekdayStats && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-indigo-50 p-4 rounded-lg">
              <h4 className="font-medium text-indigo-900 mb-2">Analyse hebdomadaire</h4>
              <ul className="space-y-2 text-sm text-indigo-800">
                <li>• Jour de plus forte consommation : <strong>{weekdayStats.maxDay.dayName}</strong> ({weekdayStats.maxDay.avgTotalConsumption.toFixed(1)} kWh/jour)</li>
                <li>• Jour de plus faible consommation : <strong>{weekdayStats.minDay.dayName}</strong> ({weekdayStats.minDay.avgTotalConsumption.toFixed(1)} kWh/jour)</li>
                <li>• Moyenne en semaine : {weekdayStats.weekdayAvg.toFixed(1)} kWh/jour</li>
                <li>• Moyenne en weekend : {weekdayStats.weekendAvg.toFixed(1)} kWh/jour</li>
                <li>• Différence semaine/weekend : {Math.abs(weekdayStats.weekdayWeekendDiff).toFixed(1)}% {weekdayStats.weekdayWeekendDiff > 0 ? 'de plus' : 'de moins'} en semaine</li>
              </ul>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Recommandations</h4>
              <ul className="space-y-2 text-sm text-blue-800">
                <li>• Optimisez votre production solaire pour les jours de forte consommation ({weekdayStats.maxDay.dayName})</li>
                <li>• Programmez vos appareils énergivores pendant les heures d'ensoleillement</li>
                <li>• Utilisez le stockage virtuel pour équilibrer votre consommation entre semaine et weekend</li>
                <li>• Envisagez de déplacer certaines consommations vers les jours de faible activité</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <Clock className="h-6 w-6 text-green-500" />
          <h3 className="text-lg font-semibold text-gray-900">
            Tendance récente (30 derniers jours)
          </h3>
        </div>
        
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={recentTrendData}
              margin={{ top: 5, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="displayDate" 
                tick={{ fontSize: 12 }}
                interval={2}
              />
              <YAxis 
                unit=" kWh"
                tick={{ fontSize: 12 }}
                width={80}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  `${value.toFixed(1)} kWh`,
                  name === "peakHours" ? "Heures pleines" : 
                  name === "offPeakHours" ? "Heures creuses" : 
                  "Consommation totale"
                ]}
                labelFormatter={(label) => {
                  const item = recentTrendData.find(d => d.displayDate === label);
                  return `${item?.displayDate} (${item?.dayOfWeek})`;
                }}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '0.375rem',
                  padding: '8px 12px'
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="peakHours"
                name="Heures pleines"
                stackId="1"
                stroke="#4F46E5"
                fill="#4F46E5"
                fillOpacity={0.6}
              />
              <Area
                type="monotone"
                dataKey="offPeakHours"
                name="Heures creuses"
                stackId="1"
                stroke="#14B8A6"
                fill="#14B8A6"
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-6 bg-green-50 p-4 rounded-lg">
          <h4 className="font-medium text-green-900 mb-2">Analyse des tendances récentes</h4>
          <p className="text-sm text-green-800">
            Ce graphique montre votre consommation quotidienne sur les 30 derniers jours, 
            permettant d'identifier les périodes d'absence (vacances), les pics de consommation 
            exceptionnels et les tendances récentes. Utilisez ces informations pour optimiser 
            votre dimensionnement solaire et adapter vos habitudes de consommation.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DailyConsumptionPatterns;