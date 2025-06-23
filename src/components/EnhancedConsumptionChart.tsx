import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { 
  RotateCcw, TrendingUp, Clock, Zap, Calendar, User, BarChart2, 
  PieChart as PieChartIcon, Activity, Calendar as CalendarIcon
} from 'lucide-react';
import type { ConsumptionData } from '../types/consumption';

interface EnhancedConsumptionChartProps {
  data: ConsumptionData[];
  onReset: () => void;
}

const PRICES = {
  peakHours: 0.2062,
  offPeakHours: 0.1547
};

const DAYS_OF_WEEK = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

const EnhancedConsumptionChart: React.FC<EnhancedConsumptionChartProps> = ({ data, onReset }) => {
  const [activeTab, setActiveTab] = useState<'monthly' | 'daily' | 'weekly' | 'patterns'>('monthly');

  // Si pas de données, afficher un message
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 text-center">
        <p className="text-gray-600">Aucune donnée de consommation disponible.</p>
        <button
          onClick={onReset}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
          Réinitialiser
        </button>
      </div>
    );
  }

  // Calcul des données mensuelles
  const monthlyData = useMemo(() => {
    const aggregated = data.reduce((acc, item) => {
      const date = new Date(item.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!acc[monthKey]) {
        acc[monthKey] = {
          date: monthKey,
          month: MONTHS[date.getMonth()],
          year: date.getFullYear(),
          peakHours: 0,
          offPeakHours: 0,
          peakCost: 0,
          offPeakCost: 0,
          totalConsumption: 0,
          totalCost: 0,
          daysCount: 0
        };
      }
      
      acc[monthKey].peakHours += item.peakHours;
      acc[monthKey].offPeakHours += item.offPeakHours;
      acc[monthKey].peakCost += item.peakHours * PRICES.peakHours;
      acc[monthKey].offPeakCost += item.offPeakHours * PRICES.offPeakHours;
      acc[monthKey].totalConsumption += item.peakHours + item.offPeakHours;
      acc[monthKey].totalCost += (item.peakHours * PRICES.peakHours) + (item.offPeakHours * PRICES.offPeakHours);
      acc[monthKey].daysCount += 1;
      
      return acc;
    }, {} as Record<string, any>);

    return Object.values(aggregated).map(month => ({
      ...month,
      displayDate: `${month.month} ${month.year}`,
      avgDailyConsumption: month.totalConsumption / month.daysCount
    })).sort((a, b) => a.date.localeCompare(b.date));
  }, [data]);

  // Calcul des données quotidiennes (365 derniers jours)
  const dailyData = useMemo(() => {
    return data
      .map(item => {
        const date = new Date(item.date);
        return {
          date: item.date,
          displayDate: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
          dayOfWeek: DAYS_OF_WEEK[date.getDay()],
          peakHours: item.peakHours,
          offPeakHours: item.offPeakHours,
          totalConsumption: item.peakHours + item.offPeakHours,
          totalCost: (item.peakHours * PRICES.peakHours) + (item.offPeakHours * PRICES.offPeakHours)
        };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [data]);

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

  // Calcul des statistiques globales
  const stats = useMemo(() => {
    const totalPeakHours = data.reduce((sum, item) => sum + item.peakHours, 0);
    const totalOffPeakHours = data.reduce((sum, item) => sum + item.offPeakHours, 0);
    const totalConsumption = totalPeakHours + totalOffPeakHours;
    const totalPeakCost = totalPeakHours * PRICES.peakHours;
    const totalOffPeakCost = totalOffPeakHours * PRICES.offPeakHours;
    const totalCost = totalPeakCost + totalOffPeakCost;

    // Calcul des moyennes journalières
    const nbDays = data.length;
    const avgDailyConsumption = totalConsumption / nbDays;
    const avgPeakHours = totalPeakHours / nbDays;
    const avgOffPeakHours = totalOffPeakHours / nbDays;

    // Analyse des pics de consommation
    const dailyConsumptions = data.map(day => ({
      date: day.date,
      total: day.peakHours + day.offPeakHours
    }));
    const maxConsumption = Math.max(...dailyConsumptions.map(d => d.total));
    const maxConsumptionDate = dailyConsumptions.find(d => d.total === maxConsumption)?.date;
    const formattedMaxDate = maxConsumptionDate 
      ? new Date(maxConsumptionDate).toLocaleDateString('fr-FR', { 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric' 
        })
      : '';

    // Calcul du ratio heures pleines/creuses
    const peakRatio = (totalPeakHours / totalConsumption) * 100;
    const offPeakRatio = (totalOffPeakHours / totalConsumption) * 100;

    return {
      totalPeakHours,
      totalOffPeakHours,
      totalConsumption,
      totalPeakCost,
      totalOffPeakCost,
      totalCost,
      nbDays,
      avgDailyConsumption,
      avgPeakHours,
      avgOffPeakHours,
      maxConsumption,
      maxConsumptionDate: formattedMaxDate,
      peakRatio,
      offPeakRatio
    };
  }, [data]);

  // Données pour le graphique en camembert
  const pieData = [
    { name: 'Heures pleines', value: stats.totalPeakHours, color: '#4F46E5' },
    { name: 'Heures creuses', value: stats.totalOffPeakHours, color: '#14B8A6' }
  ];

  // Calcul des données de consommation par saison
  const seasonalData = useMemo(() => {
    const byMonth = data.reduce((acc, item) => {
      const date = new Date(item.date);
      const month = date.getMonth(); // 0-11
      
      if (!acc[month]) {
        acc[month] = {
          month,
          monthName: MONTHS[month],
          peakHours: 0,
          offPeakHours: 0,
          totalConsumption: 0,
          count: 0
        };
      }
      
      acc[month].peakHours += item.peakHours;
      acc[month].offPeakHours += item.offPeakHours;
      acc[month].totalConsumption += item.peakHours + item.offPeakHours;
      acc[month].count += 1;
      
      return acc;
    }, {} as Record<number, any>);

    // Calculer les moyennes et trier par mois
    return Object.values(byMonth)
      .map(month => ({
        ...month,
        avgPeakHours: month.peakHours / month.count,
        avgOffPeakHours: month.offPeakHours / month.count,
        avgTotalConsumption: month.totalConsumption / month.count
      }))
      .sort((a, b) => a.month - b.month);
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          Analyse de consommation
        </h2>
        <div className="flex items-center gap-2 text-gray-600">
          <User className="h-5 w-5" />
          <span>Données sur {data.length} jours</span>
        </div>
      </div>

      {/* Statistiques de base */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium">Consommation totale</p>
          <p className="text-2xl font-bold text-blue-700">
            {Math.round(stats.totalConsumption).toLocaleString()} kWh
          </p>
          <div className="mt-1 text-sm">
            <p className="text-blue-600">HP: {Math.round(stats.totalPeakHours).toLocaleString()} kWh</p>
            <p className="text-blue-600">HC: {Math.round(stats.totalOffPeakHours).toLocaleString()} kWh</p>
          </div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium">Dépenses totales</p>
          <p className="text-2xl font-bold text-green-700">
            {Math.round(stats.totalCost).toLocaleString()} €
          </p>
          <p className="mt-1 text-sm text-green-600">
            {(stats.totalCost / monthlyData.length).toFixed(2)} €/mois
          </p>
        </div>
        
        <div className="bg-indigo-50 rounded-lg p-4">
          <p className="text-sm text-indigo-600 font-medium">Consommation moyenne</p>
          <p className="text-2xl font-bold text-indigo-700">
            {stats.avgDailyConsumption.toFixed(1)} kWh/j
          </p>
          <p className="mt-1 text-sm text-indigo-600">
            {(stats.avgDailyConsumption * 30.5).toFixed(0)} kWh/mois
          </p>
        </div>

        <div className="bg-amber-50 rounded-lg p-4">
          <p className="text-sm text-amber-600 font-medium">Pic de consommation</p>
          <p className="text-2xl font-bold text-amber-700">
            {stats.maxConsumption.toFixed(1)} kWh
          </p>
          <p className="mt-1 text-sm text-amber-600">
            {stats.maxConsumptionDate}
          </p>
        </div>
      </div>

      {/* Onglets pour les différents graphiques */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('monthly')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === 'monthly'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <BarChart2 className="h-4 w-4" />
                <span>Tendance mensuelle</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('daily')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === 'daily'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <span>Consommation quotidienne</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('weekly')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === 'weekly'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                <span>Jours de la semaine</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('patterns')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === 'patterns'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <PieChartIcon className="h-4 w-4" />
                <span>Répartition & Saisons</span>
              </div>
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Graphique mensuel */}
          {activeTab === 'monthly' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                Consommation électrique mensuelle (kWh)
              </h3>
              
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlyData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 20 }}
                    barSize={20}
                    barGap={0}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis 
                      dataKey="displayDate" 
                      angle={-45} 
                      textAnchor="end" 
                      height={60}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      unit=" kWh"
                      tick={{ fontSize: 12 }}
                      width={80}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        `${Math.round(value)} kWh`,
                        name === "peakHours" ? "Heures pleines" : "Heures creuses"
                      ]}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #E5E7EB',
                        borderRadius: '0.375rem',
                        padding: '8px 12px'
                      }}
                      cursor={{ fill: 'rgba(229, 231, 235, 0.2)' }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      height={36}
                      formatter={(value) => value === "peakHours" ? "Heures pleines" : "Heures creuses"}
                    />
                    <Bar
                      dataKey="peakHours"
                      name="peakHours"
                      stackId="consumption"
                      fill="#4F46E5"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="offPeakHours"
                      name="offPeakHours"
                      stackId="consumption"
                      fill="#14B8A6"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  Consommation moyenne journalière par mois (kWh/jour)
                </h3>
                
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={monthlyData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis 
                        dataKey="displayDate" 
                        angle={-45} 
                        textAnchor="end" 
                        height={60}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        unit=" kWh/j"
                        tick={{ fontSize: 12 }}
                        width={80}
                      />
                      <Tooltip
                        formatter={(value: number) => [`${value.toFixed(1)} kWh/jour`, "Consommation moyenne"]}
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
                        dataKey="avgDailyConsumption"
                        name="Consommation moyenne"
                        stroke="#8B5CF6"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Graphique quotidien */}
          {activeTab === 'daily' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                Consommation quotidienne sur l'année (kWh)
              </h3>
              
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={dailyData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis 
                      dataKey="displayDate" 
                      angle={-45} 
                      textAnchor="end" 
                      height={60}
                      tick={{ fontSize: 12 }}
                      interval={Math.floor(dailyData.length / 12)}
                    />
                    <YAxis 
                      unit=" kWh"
                      tick={{ fontSize: 12 }}
                      width={80}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        `${value.toFixed(1)} kWh`,
                        name === "totalConsumption" ? "Consommation totale" : 
                        name === "peakHours" ? "Heures pleines" : "Heures creuses"
                      ]}
                      labelFormatter={(label) => {
                        const item = dailyData.find(d => d.displayDate === label);
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
                      dataKey="totalConsumption"
                      name="Consommation totale"
                      stroke="#8B5CF6"
                      fill="#8B5CF6"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  Répartition heures pleines / heures creuses (kWh)
                </h3>
                
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={dailyData.slice(-30)} // Afficher seulement les 30 derniers jours
                      margin={{ top: 5, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis 
                        dataKey="displayDate" 
                        angle={-45} 
                        textAnchor="end" 
                        height={60}
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
                          name === "peakHours" ? "Heures pleines" : "Heures creuses"
                        ]}
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
              </div>
            </div>
          )}

          {/* Graphique par jour de la semaine */}
          {activeTab === 'weekly' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                Consommation moyenne par jour de la semaine (kWh)
              </h3>
              
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={weekdayData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 20 }}
                    barSize={30}
                    barGap={0}
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
                        name === "avgPeakHours" ? "Heures pleines" : "Heures creuses"
                      ]}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #E5E7EB',
                        borderRadius: '0.375rem',
                        padding: '8px 12px'
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="avgPeakHours"
                      name="Heures pleines"
                      stackId="a"
                      fill="#4F46E5"
                    />
                    <Bar
                      dataKey="avgOffPeakHours"
                      name="Heures creuses"
                      stackId="a"
                      fill="#14B8A6"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  Profil de consommation hebdomadaire
                </h3>
                
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart outerRadius={150} data={weekdayData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="dayName" />
                      <PolarRadiusAxis angle={30} domain={[0, 'auto']} />
                      <Radar
                        name="Consommation moyenne"
                        dataKey="avgTotalConsumption"
                        stroke="#8884d8"
                        fill="#8884d8"
                        fillOpacity={0.6}
                      />
                      <Tooltip
                        formatter={(value: number) => [`${value.toFixed(1)} kWh`, "Consommation moyenne"]}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #E5E7EB',
                          borderRadius: '0.375rem',
                          padding: '8px 12px'
                        }}
                      />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Graphiques de répartition et saisonnalité */}
          {activeTab === 'patterns' && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">
                    Répartition HP/HC
                  </h3>
                  
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => [`${value.toFixed(1)} kWh`, ""]}
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #E5E7EB',
                            borderRadius: '0.375rem',
                            padding: '8px 12px'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">
                    Consommation par saison
                  </h3>
                  
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={seasonalData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 20 }}
                        barSize={20}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis 
                          dataKey="monthName" 
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
                            name === "avgTotalConsumption" ? "Consommation moyenne" : ""
                          ]}
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #E5E7EB',
                            borderRadius: '0.375rem',
                            padding: '8px 12px'
                          }}
                        />
                        <Legend />
                        <Bar
                          dataKey="avgTotalConsumption"
                          name="Consommation moyenne"
                          fill="#8B5CF6"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  Analyse des tendances saisonnières
                </h3>
                
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <p className="text-indigo-800">
                    <strong>Interprétation des données :</strong>
                  </p>
                  <ul className="mt-2 space-y-2 text-sm text-indigo-700">
                    <li>• La consommation est {seasonalData.length >= 12 ? 'plus élevée pendant les mois d\'hiver (chauffage)' : 'variable selon les mois disponibles'}</li>
                    <li>• {stats.peakRatio.toFixed(0)}% de la consommation se fait en heures pleines</li>
                    <li>• La consommation moyenne journalière est de {stats.avgDailyConsumption.toFixed(1)} kWh</li>
                    <li>• Le pic de consommation a été atteint le {stats.maxConsumptionDate}</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bouton de réinitialisation */}
      <div className="flex justify-center">
        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
          Réinitialiser les données
        </button>
      </div>
    </div>
  );
};

export default EnhancedConsumptionChart;