import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Settings as SettingsIcon, ArrowLeft, Database, Sliders, Zap, Package, ToggleLeft, Coins, Calendar, Percent, RefreshCw, Key, Battery } from 'lucide-react';
import { useFinancialSettings } from '../contexts/FinancialSettingsContext';
import { formatCurrency } from '../utils/formatters';
import { supabase } from '../lib/supabase';

export default function Settings() {
  const { settings, updateSettings, addInstallationPrice, removeInstallationPrice } = useFinancialSettings();
  const [newPower, setNewPower] = useState<string>('');
  const [newPrice, setNewPrice] = useState<string>('');
  const [batteryOptions, setBatteryOptions] = useState({
    physicalBattery: true,
    myBattery: true,
    smartBattery: true
  });
  const [subscriptionEnabled, setSubscriptionEnabled] = useState(true);
  const [enedisTokens, setEnedisTokens] = useState<any[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState({
    sellPrices: false,
    defaultValues: false,
    installationPrices: false,
    batteryOptions: false,
    subscriptionOptions: false,
    enedisTokens: false,
    usefulLinks: false
  });

  // Charger les options de batterie depuis le localStorage
  useEffect(() => {
    const savedOptions = localStorage.getItem('battery_options');
    if (savedOptions) {
      setBatteryOptions(JSON.parse(savedOptions));
    }
    
    const savedSubscriptionOption = localStorage.getItem('subscription_enabled');
    if (savedSubscriptionOption !== null) {
      setSubscriptionEnabled(savedSubscriptionOption === 'true');
    }
  }, []);

  // Charger les tokens Enedis depuis Supabase
  useEffect(() => {
    const fetchEnedisTokens = async () => {
      setIsLoadingTokens(true);
      setTokenError(null);
      
      try {
        const { data, error } = await supabase
          .from('enedis_tokens')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (error) throw error;
        
        setEnedisTokens(data || []);
      } catch (error) {
        console.error('Erreur lors du chargement des tokens Enedis:', error);
        setTokenError('Erreur lors du chargement des tokens Enedis');
      } finally {
        setIsLoadingTokens(false);
      }
    };
    
    fetchEnedisTokens();
  }, []);

  const handleSaveBatteryOptions = () => {
    localStorage.setItem('battery_options', JSON.stringify(batteryOptions));
    
    // Dispatch event to notify components
    window.dispatchEvent(new CustomEvent('batteryOptionsUpdated', {
      detail: batteryOptions
    }));
    
    alert('Options de batterie sauvegardées');
  };

  const handleToggleSubscription = () => {
    const newValue = !subscriptionEnabled;
    setSubscriptionEnabled(newValue);
    localStorage.setItem('subscription_enabled', newValue.toString());
    
    // Dispatch event to notify components
    window.dispatchEvent(new CustomEvent('subscriptionEnabledUpdated', {
      detail: newValue
    }));
  };

  const handleAddPrice = () => {
    const power = parseFloat(newPower);
    const price = parseFloat(newPrice);
    
    if (isNaN(power) || isNaN(price) || power <= 0 || price <= 0) {
      alert('Veuillez entrer des valeurs numériques valides');
      return;
    }
    
    addInstallationPrice(power, price);
    setNewPower('');
    setNewPrice('');
  };

  const handleRemovePrice = (power: number) => {
    if (power <= 9) {
      alert('Impossible de supprimer les prix standards');
      return;
    }
    
    if (confirm(`Êtes-vous sûr de vouloir supprimer le prix pour ${power} kWc ?`)) {
      removeInstallationPrice(power);
    }
  };

  const handleUpdateSellPrices = (e: React.FormEvent) => {
    e.preventDefault();
    
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const updates = {
      surplusSellPrices: {
        under9kw: parseFloat(formData.get('surplus_under9kw') as string),
        from9to36kw: parseFloat(formData.get('surplus_from9to36kw') as string),
        from36to100kw: parseFloat(formData.get('surplus_from36to100kw') as string)
      },
      totalSellPrices: {
        under9kw: parseFloat(formData.get('total_under9kw') as string),
        from9to36kw: parseFloat(formData.get('total_from9to36kw') as string),
        from36to100kw: parseFloat(formData.get('total_from36to100kw') as string)
      },
      sellPriceDate: formData.get('sell_price_date') as string
    };
    
    updateSettings(updates);
    alert('Prix de revente mis à jour');
  };

  const handleUpdateDefaultValues = (e: React.FormEvent) => {
    e.preventDefault();
    
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const updates = {
      baseKwhPrice: parseFloat(formData.get('base_kwh_price') as string),
      defaultAutoconsumption: parseFloat(formData.get('default_autoconsumption') as string),
      defaultEnergyRevaluation: parseFloat(formData.get('default_energy_revaluation') as string),
      defaultSellIndexation: parseFloat(formData.get('default_sell_indexation') as string),
      defaultPanelDegradation: parseFloat(formData.get('default_panel_degradation') as string)
    };
    
    updateSettings(updates);
    alert('Valeurs par défaut mises à jour');
  };

  const toggleSection = (section: string) => {
    setIsExpanded(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Retour au simulateur
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-8">
        <SettingsIcon className="h-8 w-8 text-blue-500" />
        <h1 className="text-2xl font-bold text-gray-900">Paramètres du simulateur</h1>
      </div>

      <div className="space-y-6">
        {/* Prix de revente */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleSection('sellPrices')}
          >
            <div className="flex items-center gap-3">
              <Coins className="h-6 w-6 text-green-500" />
              <h2 className="text-xl font-semibold text-gray-900">Prix de revente</h2>
            </div>
            <div className="text-gray-500">
              {isExpanded.sellPrices ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </div>
          </div>
          
          {isExpanded.sellPrices && (
            <form onSubmit={handleUpdateSellPrices} className="space-y-6 mt-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Tarifs de revente du surplus
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ≤ 9 kWc
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        name="surplus_under9kw"
                        defaultValue={settings.surplusSellPrices.under9kw}
                        step="0.001"
                        min="0"
                        max="1"
                        className="w-full pr-12 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">€/kWh</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      9-36 kWc
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        name="surplus_from9to36kw"
                        defaultValue={settings.surplusSellPrices.from9to36kw}
                        step="0.001"
                        min="0"
                        max="1"
                        className="w-full pr-12 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">€/kWh</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      36-100 kWc
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        name="surplus_from36to100kw"
                        defaultValue={settings.surplusSellPrices.from36to100kw}
                        step="0.001"
                        min="0"
                        max="1"
                        className="w-full pr-12 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">€/kWh</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Tarifs de revente totale
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ≤ 9 kWc
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        name="total_under9kw"
                        defaultValue={settings.totalSellPrices.under9kw}
                        step="0.001"
                        min="0"
                        max="1"
                        className="w-full pr-12 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">€/kWh</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      9-36 kWc
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        name="total_from9to36kw"
                        defaultValue={settings.totalSellPrices.from9to36kw}
                        step="0.001"
                        min="0"
                        max="1"
                        className="w-full pr-12 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">€/kWh</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      36-100 kWc
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        name="total_from36to100kw"
                        defaultValue={settings.totalSellPrices.from36to100kw}
                        step="0.001"
                        min="0"
                        max="1"
                        className="w-full pr-12 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">€/kWh</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de mise à jour des tarifs
                </label>
                <input
                  type="date"
                  name="sell_price_date"
                  defaultValue={settings.sellPriceDate}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Enregistrer les prix de revente
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Valeurs par défaut */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleSection('defaultValues')}
          >
            <div className="flex items-center gap-3">
              <Sliders className="h-6 w-6 text-blue-500" />
              <h2 className="text-xl font-semibold text-gray-900">Valeurs par défaut</h2>
            </div>
            <div className="text-gray-500">
              {isExpanded.defaultValues ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </div>
          </div>
          
          {isExpanded.defaultValues && (
            <form onSubmit={handleUpdateDefaultValues} className="space-y-6 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prix du kWh
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      name="base_kwh_price"
                      defaultValue={settings.baseKwhPrice}
                      step="0.01"
                      min="0"
                      max="1"
                      className="w-full pr-12 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">€/kWh</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Taux d'autoconsommation
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      name="default_autoconsumption"
                      defaultValue={settings.defaultAutoconsumption}
                      step="1"
                      min="0"
                      max="100"
                      className="w-full pr-8 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">%</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Revalorisation énergie
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      name="default_energy_revaluation"
                      defaultValue={settings.defaultEnergyRevaluation}
                      step="0.1"
                      min="0"
                      max="10"
                      className="w-full pr-8 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">%</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Indexation revente
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      name="default_sell_indexation"
                      defaultValue={settings.defaultSellIndexation}
                      step="0.1"
                      min="-5"
                      max="5"
                      className="w-full pr-8 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">%</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dégradation panneaux
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      name="default_panel_degradation"
                      defaultValue={settings.defaultPanelDegradation}
                      step="0.1"
                      min="-2"
                      max="0"
                      className="w-full pr-8 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Enregistrer les valeurs par défaut
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Prix des installations */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleSection('installationPrices')}
          >
            <div className="flex items-center gap-3">
              <Zap className="h-6 w-6 text-amber-500" />
              <h2 className="text-xl font-semibold text-gray-900">Prix des installations</h2>
            </div>
            <div className="text-gray-500">
              {isExpanded.installationPrices ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </div>
          </div>
          
          {isExpanded.installationPrices && (
            <div className="mt-4 space-y-6">
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Prix standards
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Puissance (kWc)
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Prix (€)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {settings.installationPrices
                        .filter(price => price.power <= 9)
                        .map((price, index) => (
                          <tr key={price.power} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {price.power.toFixed(1)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                              {formatCurrency(price.price)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Prix professionnels (&gt; 9 kWc)
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Puissance (kWc)
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Prix (€)
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {settings.installationPrices
                        .filter(price => price.power > 9)
                        .map((price, index) => (
                          <tr key={price.power} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {price.power.toFixed(1)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                              {formatCurrency(price.price)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                              <button
                                onClick={() => handleRemovePrice(price.power)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Supprimer
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Ajouter un prix professionnel
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Puissance (kWc)
                    </label>
                    <input
                      type="number"
                      value={newPower}
                      onChange={(e) => setNewPower(e.target.value)}
                      step="0.5"
                      min="9.5"
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prix (€)
                    </label>
                    <input
                      type="number"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      step="100"
                      min="0"
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleAddPrice}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Ajouter
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Options de batterie */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleSection('batteryOptions')}
          >
            <div className="flex items-center gap-3">
              <Battery className="h-6 w-6 text-blue-500" />
              <h2 className="text-xl font-semibold text-gray-900">Options de batterie</h2>
            </div>
            <div className="text-gray-500">
              {isExpanded.batteryOptions ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </div>
          </div>
          
          {isExpanded.batteryOptions && (
            <div className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Batterie physique
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={batteryOptions.physicalBattery}
                    onChange={(e) => setBatteryOptions({...batteryOptions, physicalBattery: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  MyBattery
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={batteryOptions.myBattery}
                    onChange={(e) => setBatteryOptions({...batteryOptions, myBattery: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Smart Battery
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={batteryOptions.smartBattery}
                    onChange={(e) => setBatteryOptions({...batteryOptions, smartBattery: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div className="pt-4">
                <button
                  onClick={handleSaveBatteryOptions}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Enregistrer les options
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Options d'abonnement */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleSection('subscriptionOptions')}
          >
            <div className="flex items-center gap-3">
              <ToggleLeft className="h-6 w-6 text-indigo-500" />
              <h2 className="text-xl font-semibold text-gray-900">Options d'abonnement</h2>
            </div>
            <div className="text-gray-500">
              {isExpanded.subscriptionOptions ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </div>
          </div>
          
          {isExpanded.subscriptionOptions && (
            <div className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Activer l'abonnement
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={subscriptionEnabled}
                    onChange={handleToggleSubscription}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <p className="text-sm text-gray-600">
                {subscriptionEnabled 
                  ? 'L\'option d\'abonnement est activée. Les utilisateurs peuvent choisir entre le paiement comptant et l\'abonnement.'
                  : 'L\'option d\'abonnement est désactivée. Seul le paiement comptant est disponible.'}
              </p>
            </div>
          )}
        </div>

        {/* Tokens Enedis */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleSection('enedisTokens')}
          >
            <div className="flex items-center gap-3">
              <Key className="h-6 w-6 text-purple-500" />
              <h2 className="text-xl font-semibold text-gray-900">Tokens Enedis</h2>
            </div>
            <div className="text-gray-500">
              {isExpanded.enedisTokens ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </div>
          </div>
          
          {isExpanded.enedisTokens && (
            <div className="mt-4">
              {isLoadingTokens ? (
                <div className="text-center py-4">
                  <div className="inline-block animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
                  <p className="mt-2 text-gray-600">Chargement des tokens...</p>
                </div>
              ) : tokenError ? (
                <div className="bg-red-50 p-4 rounded-lg text-red-800">
                  {tokenError}
                </div>
              ) : enedisTokens.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-600">Aucun token Enedis trouvé</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date de création
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Expiration
                        </th>
                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actif
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {enedisTokens.map((token, index) => (
                        <tr key={token.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(token.created_at).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(token.expires_at).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                            {token.is_active ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Actif
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                Inactif
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {token.token_type}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              <div className="mt-4 flex justify-end">
                <Link
                  to="/abie-link"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  Gérer les tokens Enedis
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Liens utiles */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleSection('usefulLinks')}
          >
            <div className="flex items-center gap-3">
              <Package className="h-6 w-6 text-orange-500" />
              <h2 className="text-xl font-semibold text-gray-900">Liens utiles</h2>
            </div>
            <div className="text-gray-500">
              {isExpanded.usefulLinks ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </div>
          </div>
          
          {isExpanded.usefulLinks && (
            <div className="space-y-4 mt-4">
              <Link
                to="/test-icoll"
                className="block px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Test iColl
              </Link>
              
              <Link
                to="/agence"
                className="block px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Informations agence
              </Link>
              
              <Link
                to="/pdf-generator"
                className="block px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Générateur de PDF
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}