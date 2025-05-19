import React, { useState, useEffect } from 'react';
import { Euro, Save, Calculator, Trash2, ChevronDown, ChevronRight, Building, Database, AlertCircle, Battery, CloudLightning, CloudSun, Clock, Ticket } from 'lucide-react';
import { useFinancialSettings } from '../contexts/FinancialSettingsContext';
import { supabase } from '../lib/supabase';
import { PromoCode } from '../hooks/usePromoCode';

interface SubsidyData {
  id: string;
  power_range: string;
  amount: number;
  effective_date: string;
}

export default function Settings() {
  const { settings, updateSettings, addInstallationPrice, removeInstallationPrice } = useFinancialSettings();
  const [tempSettings, setTempSettings] = useState(settings);
  const [showSuccess, setShowSuccess] = useState(false);
  const [newPower, setNewPower] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);
  const [subsidies, setSubsidies] = useState<SubsidyData[]>([]);
  const [loadingSubsidies, setLoadingSubsidies] = useState(false);
  const [subsidyError, setSubsidyError] = useState<string | null>(null);
  
  // Promo code state
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoDiscount, setNewPromoDiscount] = useState('');
  const [promoCodeError, setPromoCodeError] = useState<string | null>(null);
  const [promoCodeSuccess, setPromoCodeSuccess] = useState(false);
  
  const [batteryOptions, setBatteryOptions] = useState({
    physicalBattery: true,
    myBattery: true,
    smartBattery: true
  });
  
  const [subscriptionEnabled, setSubscriptionEnabled] = useState(true);
  
  const [openSections, setOpenSections] = useState<{
    financial: boolean;
    prices: boolean;
    proPrices: boolean;
    subsidies: boolean;
    options: boolean;
    promoCodes: boolean;
  }>({
    financial: false,
    prices: false,
    proPrices: false,
    subsidies: false,
    options: false,
    promoCodes: false
  });

  useEffect(() => {
    const savedBatteryOptions = localStorage.getItem('battery_options');
    if (savedBatteryOptions) {
      setBatteryOptions(JSON.parse(savedBatteryOptions));
    }
    
    const savedSubscriptionOption = localStorage.getItem('subscription_enabled');
    if (savedSubscriptionOption !== null) {
      setSubscriptionEnabled(savedSubscriptionOption === 'true');
    }
    
    // Load local promo codes
    const localPromoCodes = localStorage.getItem('local_promo_codes');
    if (localPromoCodes) {
      try {
        setPromoCodes(JSON.parse(localPromoCodes));
      } catch (e) {
        console.error('Error parsing local promo codes:', e);
        setPromoCodes([]);
      }
    }
  }, []);

  useEffect(() => {
    const fetchSubsidies = async () => {
      setLoadingSubsidies(true);
      setSubsidyError(null);
      try {
        const { data, error } = await supabase
          .from('subsidies')
          .select('*')
          .order('effective_date', { ascending: false });

        if (error) throw error;
        setSubsidies(data || []);
      } catch (error) {
        console.error('Error fetching subsidies:', error);
        setSubsidyError('Error retrieving subsidies');
      } finally {
        setLoadingSubsidies(false);
      }
    };

    if (openSections.subsidies) {
      fetchSubsidies();
    }
  }, [openSections.subsidies]);

  const handleNumberChange = (field: keyof typeof tempSettings) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      setTempSettings(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSellPriceChange = (type: 'surplus' | 'total', range: 'under9kw' | 'from9to36kw' | 'from36to100kw') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      setTempSettings(prev => ({
        ...prev,
        [type === 'surplus' ? 'surplusSellPrices' : 'totalSellPrices']: {
          ...prev[type === 'surplus' ? 'surplusSellPrices' : 'totalSellPrices'],
          [range]: value
        }
      }));
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempSettings(prev => ({ ...prev, sellPriceDate: e.target.value }));
  };

  const handlePriceChange = (index: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      const newPrices = [...tempSettings.installationPrices];
      newPrices[index] = { ...newPrices[index], price: value };
      setTempSettings(prev => ({ ...prev, installationPrices: newPrices }));
      
      const savedPrices = localStorage.getItem('installation_prices');
      const existingPrices = savedPrices ? JSON.parse(savedPrices) : [];
      const power = newPrices[index].power;
      
      const priceIndex = existingPrices.findIndex((p: any) => Math.abs(p.power - power) < 0.01);
      if (priceIndex >= 0) {
        existingPrices[priceIndex].price = value;
      } else {
        existingPrices.push({ power, price: value });
      }
      
      localStorage.setItem('installation_prices', JSON.stringify(existingPrices));
      console.log('Updated price in localStorage:', { power, price: value });
    }
  };

  const handleAddPrice = () => {
    const power = parseFloat(newPower);
    const price = parseFloat(newPrice);

    if (isNaN(power) || isNaN(price) || power <= 0 || price <= 0) {
      setError('Please enter valid values');
      return;
    }

    if (power <= 9) {
      setError('Power must be greater than 9 kWc');
      return;
    }

    try {
      addInstallationPrice(power, price);
      
      const savedPrices = localStorage.getItem('installation_prices');
      const existingPrices = savedPrices ? JSON.parse(savedPrices) : [];
      
      const updatedPrices = existingPrices.filter((p: any) => Math.abs(p.power - power) >= 0.01);
      
      updatedPrices.push({ power, price });
      
      updatedPrices.sort((a: any, b: any) => a.power - b.power);
      
      localStorage.setItem('installation_prices', JSON.stringify(updatedPrices));
      
      console.log('Updated custom prices in localStorage:', updatedPrices);
      
      setNewPower('');
      setNewPrice('');
      setError(null);
      setAddSuccess(true);
      
      const successTimeout = setTimeout(() => setAddSuccess(false), 3000);
      return () => clearTimeout(successTimeout);
    } catch (error) {
      console.error('Error saving custom price:', error);
      setError('Failed to save custom price');
    }
  };
  
  // Add a new promo code
  const handleAddPromoCode = () => {
    if (!newPromoCode || !newPromoDiscount) {
      setPromoCodeError('Veuillez remplir tous les champs');
      return;
    }
    
    const discount = parseFloat(newPromoDiscount);
    if (isNaN(discount) || discount <= 0) {
      setPromoCodeError('La remise doit être un nombre positif');
      return;
    }
    
    // Check if code already exists
    const existingCode = promoCodes.find(
      code => code.code.toUpperCase() === newPromoCode.toUpperCase()
    );
    
    if (existingCode) {
      setPromoCodeError('Ce code promo existe déjà');
      return;
    }
    
    // Create new promo code
    const newCode: PromoCode = {
      id: crypto.randomUUID(),
      code: newPromoCode.toUpperCase(),
      discount,
      active: true,
      expiration_date: null,
      created_at: new Date().toISOString()
    };
    
    // Add to state and localStorage
    const updatedCodes = [...promoCodes, newCode];
    setPromoCodes(updatedCodes);
    localStorage.setItem('local_promo_codes', JSON.stringify(updatedCodes));
    
    // Reset form
    setNewPromoCode('');
    setNewPromoDiscount('');
    setPromoCodeError(null);
    setPromoCodeSuccess(true);
    
    // Clear success message after 3 seconds
    setTimeout(() => setPromoCodeSuccess(false), 3000);
  };
  
  // Delete a promo code
  const handleDeletePromoCode = (id: string) => {
    const updatedCodes = promoCodes.filter(code => code.id !== id);
    setPromoCodes(updatedCodes);
    localStorage.setItem('local_promo_codes', JSON.stringify(updatedCodes));
  };
  
  // Toggle promo code active status
  const handleTogglePromoCode = (id: string) => {
    const updatedCodes = promoCodes.map(code => 
      code.id === id ? { ...code, active: !code.active } : code
    );
    setPromoCodes(updatedCodes);
    localStorage.setItem('local_promo_codes', JSON.stringify(updatedCodes));
  };

  const handleBatteryOptionChange = (option: keyof typeof batteryOptions) => {
    const newOptions = { ...batteryOptions, [option]: !batteryOptions[option] };
    setBatteryOptions(newOptions);
    localStorage.setItem('battery_options', JSON.stringify(newOptions));
    
    window.dispatchEvent(new CustomEvent('batteryOptionsUpdated', {
      detail: newOptions
    }));
  };
  
  const handleSubscriptionToggle = () => {
    const newValue = !subscriptionEnabled;
    setSubscriptionEnabled(newValue);
    localStorage.setItem('subscription_enabled', newValue.toString());
    
    window.dispatchEvent(new CustomEvent('subscriptionEnabledUpdated', {
      detail: newValue
    }));
  };

  const handleApplySettings = () => {
    updateSettings(tempSettings);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Réglages
        </h1>
        <button
          onClick={handleApplySettings}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Save className="h-4 w-4 mr-2" />
          Appliquer les modifications
        </button>
      </div>

      {showSuccess && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-600">
            Modifications appliquées avec succès
          </p>
        </div>
      )}

      <div className="space-y-6">
        {/* Codes promo */}
        <div className="bg-white rounded-lg shadow">
          <button
            onClick={() => toggleSection('promoCodes')}
            className="w-full px-6 py-4 flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-3">
              <Ticket className="h-5 w-5 text-purple-500" />
              <h2 className="text-lg font-medium text-gray-900">Codes promo</h2>
            </div>
            {openSections.promoCodes ? (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-400" />
            )}
          </button>

          {openSections.promoCodes && (
            <div className="px-6 pb-6 space-y-6">
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-purple-800">
                  Créez des codes promo pour offrir des remises à vos clients. Les codes sont stockés localement et peuvent être utilisés dans le menu latéral.
                </p>
              </div>
              
              {/* Liste des codes promo existants */}
              {promoCodes.length > 0 && (
                <div>
                  <h3 className="text-base font-medium text-gray-900 mb-3">Codes promo existants</h3>
                  <div className="space-y-2">
                    {promoCodes.map(code => (
                      <div 
                        key={code.id} 
                        className={`p-3 rounded-lg border flex items-center justify-between ${
                          code.active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{code.code}</span>
                            {!code.active && (
                              <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full">
                                Inactif
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            Remise: {code.discount.toLocaleString()} €
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleTogglePromoCode(code.id)}
                            className={`p-2 rounded-full ${
                              code.active 
                                ? 'text-gray-500 hover:bg-gray-100' 
                                : 'text-green-500 hover:bg-green-50'
                            }`}
                            title={code.active ? 'Désactiver' : 'Activer'}
                          >
                            {code.active ? (
                              <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">Actif</span>
                            ) : (
                              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded-full">Inactif</span>
                            )}
                          </button>
                          <button
                            onClick={() => handleDeletePromoCode(code.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-full"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Formulaire d'ajout de code promo */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h3 className="text-base font-medium text-gray-900 mb-3">Ajouter un code promo</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Code
                    </label>
                    <input
                      type="text"
                      value={newPromoCode}
                      onChange={(e) => setNewPromoCode(e.target.value.toUpperCase())}
                      placeholder="SOLEIL2025"
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Montant de la remise (€)
                    </label>
                    <input
                      type="number"
                      value={newPromoDiscount}
                      onChange={(e) => setNewPromoDiscount(e.target.value)}
                      placeholder="500"
                      min="0"
                      step="50"
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
                    />
                  </div>
                </div>
                
                {promoCodeError && (
                  <p className="mt-2 text-sm text-red-600">{promoCodeError}</p>
                )}
                
                {promoCodeSuccess && (
                  <p className="mt-2 text-sm text-green-600">Code promo ajouté avec succès</p>
                )}
                
                <button
                  onClick={handleAddPromoCode}
                  className="mt-4 w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                >
                  Ajouter
                </button>
              </div>
              
              {/* Codes promo spéciaux */}
              <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                <h3 className="text-base font-medium text-indigo-900 mb-3">Codes promo spéciaux</h3>
                <p className="text-sm text-indigo-700 mb-4">
                  Ces codes promo spéciaux sont intégrés au système et ne peuvent pas être modifiés. Ils offrent des avantages spécifiques.
                </p>
                
                <div className="space-y-2">
                  <div className="p-3 rounded-lg bg-white border border-indigo-200">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-indigo-900">CAUTIONFREE</span>
                      <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full">
                        Spécial abonnement
                      </span>
                    </div>
                    <p className="text-sm text-indigo-700 mt-1">
                      Caution offerte (équivalent à 2 mois d'abonnement)
                    </p>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-white border border-indigo-200">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-indigo-900">BATTERYFREE</span>
                      <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full">
                        Spécial offre MyBattery
                      </span>
                    </div>
                    <p className="text-sm text-indigo-700 mt-1">
                      Frais d'activation MyBattery offerts (179€)
                    </p>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-white border border-indigo-200">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-indigo-900">ABO3MOIS</span>
                      <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full">
                        Spécial abonnement
                      </span>
                    </div>
                    <p className="text-sm text-indigo-700 mt-1">
                      3 premiers mois d'abonnement offerts
                    </p>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-white border border-indigo-200">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-indigo-900">ABO2MOIS</span>
                      <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full">
                        Spécial abonnement
                      </span>
                    </div>
                    <p className="text-sm text-indigo-700 mt-1">
                      2 premiers mois d'abonnement offerts
                    </p>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-white border border-indigo-200">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-indigo-900">ABO1MOIS</span>
                      <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full">
                        Spécial abonnement
                      </span>
                    </div>
                    <p className="text-sm text-indigo-700 mt-1">
                      Premier mois d'abonnement offert
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Options disponibles */}
        <div className="bg-white rounded-lg shadow">
          <button
            onClick={() => toggleSection('options')}
            className="w-full px-6 py-4 flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-green-500" />
              <h2 className="text-lg font-medium text-gray-900">Options disponibles</h2>
            </div>
            {openSections.options ? (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-400" />
            )}
          </button>

          {openSections.options && (
            <div className="px-6 pb-6 space-y-6">
              {/* Option d'abonnement */}
              <div className="border-b border-gray-200 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-blue-500" />
                    <h3 className="text-base font-medium text-gray-900">Option d'abonnement</h3>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={subscriptionEnabled} 
                      onChange={handleSubscriptionToggle}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  Activer ou désactiver l'option de financement par abonnement dans l'application
                </p>
              </div>
              
              {/* Options de batterie */}
              <div>
                <h3 className="text-base font-medium text-gray-900 mb-4">Options de batterie</h3>
                
                <div className="space-y-4">
                  {/* Batterie physique */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Battery className="h-5 w-5 text-gray-500" />
                      <span className="text-sm text-gray-700">Batterie physique</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={batteryOptions.physicalBattery} 
                        onChange={() => handleBatteryOptionChange('physicalBattery')}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  {/* MyBattery */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CloudSun className="h-5 w-5 text-gray-500" />
                      <span className="text-sm text-gray-700">MyBattery</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={batteryOptions.myBattery} 
                        onChange={() => handleBatteryOptionChange('myBattery')}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  {/* Smart Battery */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CloudLightning className="h-5 w-5 text-gray-500" />
                      <span className="text-sm text-gray-700">Smart Battery</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={batteryOptions.smartBattery} 
                        onChange={() => handleBatteryOptionChange('smartBattery')}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Paramètres financiers */}
        <div className="bg-white rounded-lg shadow">
          <button
            onClick={() => toggleSection('financial')}
            className="w-full px-6 py-4 flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-3">
              <Euro className="h-5 w-5 text-blue-500" />
              <h2 className="text-lg font-medium text-gray-900">Paramètres financiers</h2>
            </div>
            {openSections.financial ? (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-400" />
            )}
          </button>

          {openSections.financial && (
            <div className="px-6 pb-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prix du kWh par défaut
                </label>
                <div className="relative mt-1 rounded-md shadow-sm">
                  <input
                    type="number"
                    value={tempSettings.baseKwhPrice}
                    onChange={handleNumberChange('baseKwhPrice')}
                    step="0.0001"
                    min="0"
                    className="block w-full rounded-md border-gray-300 pl-3 pr-12 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-gray-500 sm:text-sm">€/kWh</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de validité des prix
                </label>
                <input
                  type="date"
                  value={tempSettings.sellPriceDate}
                  onChange={handleDateChange}
                  className="block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-900">Prix de vente du surplus</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    0-9 kWc
                  </label>
                  <div className="relative mt-1 rounded-md shadow-sm">
                    <input
                      type="number"
                      value={tempSettings.surplusSellPrices.under9kw}
                      onChange={handleSellPriceChange('surplus', 'under9kw')}
                      step="0.0001"
                      min="0"
                      className="block w-full rounded-md border-gray-300 pl-3 pr-12 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <span className="text-gray-500 sm:text-sm">€/kWh</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    9-36 kWc
                  </label>
                  <div className="relative mt-1 rounded-md shadow-sm">
                    <input
                      type="number"
                      value={tempSettings.surplusSellPrices.from9to36kw}
                      onChange={handleSellPriceChange('surplus', 'from9to36kw')}
                      step="0.0001"
                      min="0"
                      className="block w-full rounded-md border-gray-300 pl-3 pr-12 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <span className="text-gray-500 sm:text-sm">€/kWh</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    36-100 kWc
                  </label>
                  <div className="relative mt-1 rounded-md shadow-sm">
                    <input
                      type="number"
                      value={tempSettings.surplusSellPrices.from36to100kw}
                      onChange={handleSellPriceChange('surplus', 'from36to100kw')}
                      step="0.0001"
                      min="0"
                      className="block w-full rounded-md border-gray-300 pl-3 pr-12 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <span className="text-gray-500 sm:text-sm">€/kWh</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-900">Prix de vente totale</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    0-9 kWc
                  </label>
                  <div className="relative mt-1 rounded-md shadow-sm">
                    <input
                      type="number"
                      value={tempSettings.totalSellPrices.under9kw}
                      onChange={handleSellPriceChange('total', 'under9kw')}
                      step="0.0001"
                      min="0"
                      className="block w-full rounded-md border-gray-300 pl-3 pr-12 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <span className="text-gray-500 sm:text-sm">€/kWh</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    9-36 kWc
                  </label>
                  <div className="relative mt-1 rounded-md shadow-sm">
                    <input
                      type="number"
                      value={tempSettings.totalSellPrices.from9to36kw}
                      onChange={handleSellPriceChange('total', 'from9to36kw')}
                      step="0.0001"
                      min="0"
                      className="block w-full rounded-md border-gray-300 pl-3 pr-12 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <span className="text-gray-500 sm:text-sm">€/kWh</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    36-100 kWc
                  </label>
                  <div className="relative mt-1 rounded-md shadow-sm">
                    <input
                      type="number"
                      value={tempSettings.totalSellPrices.from36to100kw}
                      onChange={handleSellPriceChange('total', 'from36to100kw')}
                      step="0.0001"
                      min="0"
                      className="block w-full rounded-md border-gray-300 pl-3 pr-12 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <span className="text-gray-500 sm:text-sm">€/kWh</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Niveau d'autoconsommation par défaut
                </label>
                <div className="relative mt-1 rounded-md shadow-sm">
                  <input
                    type="number"
                    value={tempSettings.defaultAutoconsumption}
                    onChange={handleNumberChange('defaultAutoconsumption')}
                    step="1"
                    min="0"
                    max="100"
                    className="block w-full rounded-md border-gray-300 pl-3 pr-12 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-gray-500 sm:text-sm">%</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Revalorisation annuelle par défaut
                </label>
                <div className="relative mt-1 rounded-md shadow-sm">
                  <input
                    type="number"
                    value={tempSettings.defaultEnergyRevaluation}
                    onChange={handleNumberChange('defaultEnergyRevaluation')}
                    step="0.1"
                    className="block w-full rounded-md border-gray-300 pl-3 pr-12 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-gray-500 sm:text-sm">%</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Indexation des ventes par défaut
                </label>
                <div className="relative mt-1 rounded-md shadow-sm">
                  <input
                    type="number"
                    value={tempSettings.defaultSellIndexation}
                    onChange={handleNumberChange('defaultSellIndexation')}
                    step="0.1"
                    className="block w-full rounded-md border-gray-300 pl-3 pr-12 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-gray-500 sm:text-sm">%</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dégradation des panneaux par défaut
                </label>
                <div className="relative mt-1 rounded-md shadow-sm">
                  <input
                    type="number"
                    value={tempSettings.defaultPanelDegradation}
                    onChange={handleNumberChange('defaultPanelDegradation')}
                    step="0.1"
                    className="block w-full rounded-md border-gray-300 pl-3 pr-12 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-gray-500 sm:text-sm">%</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Prix des installations */}
        <div className="bg-white rounded-lg shadow">
          <button
            onClick={() => toggleSection('prices')}
            className="w-full px-6 py-4 flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-3">
              <Calculator className="h-5 w-5 text-indigo-500" />
              <h2 className="text-lg font-medium text-gray-900">Prix des installations</h2>
            </div>
            {openSections.prices ? (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-400" />
            )}
          </button>

          {openSections.prices && (
            <div className="px-6 pb-6">
              <div className="grid grid-cols-2 gap-4">
                {tempSettings.installationPrices
                  .filter(price => price.power <= 9)
                  .map((price, index) => (
                    <div key={price.power} className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">
                        {price.power} kWc
                      </label>
                      <div className="relative mt-1 rounded-md shadow-sm">
                        <input
                          type="number"
                          value={price.price}
                          onChange={handlePriceChange(index)}
                          step="10"
                          min="0"
                          className="block w-full rounded-md border-gray-300 pl-3 pr-12 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <span className="text-gray-500 sm:text-sm">€</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Prix des installations professionnelles */}
        <div className="bg-white rounded-lg shadow">
          <button
            onClick={() => toggleSection('proPrices')}
            className="w-full px-6 py-4 flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-3">
              <Building className="h-5 w-5 text-purple-500" />
              <h2 className="text-lg font-medium text-gray-900">Prix des installations professionnelles</h2>
            </div>
            {openSections.proPrices ? (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-400" />
            )}
          </button>

          {openSections.proPrices && (
            <div className="px-6 pb-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {tempSettings.installationPrices
                    .filter(price => price.power > 9)
                    .map(price => (
                      <div key={price.power} className="relative bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{price.power} kWc</span>
                          <button
                            onClick={() => removeInstallationPrice(price.power)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          {price.price.toLocaleString()} €
                        </div>
                      </div>
                    ))}
                </div>

                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">
                    Ajouter un nouveau kit pro
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Puissance (kWc)
                      </label>
                      <input
                        type="number"
                        value={newPower}
                        onChange={(e) => setNewPower(e.target.value)}
                        min="9.5"
                        step="0.5"
                        className="block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
                        min="0"
                        step="100"
                        className="block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>
                  </div>
                  {error && (
                    <p className="mt-2 text-sm text-red-600">{error}</p>
                  )}
                  {addSuccess && (
                    <p className="mt-2 text-sm text-green-600">Kit ajouté avec succès</p>
                  )}
                  <button
                    onClick={handleAddPrice}
                    className="mt-3 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Ajouter
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Subventions Supabase */}
        <div className="bg-white rounded-lg shadow">
          <button
            onClick={() => toggleSection('subsidies')}
            className="w-full px-6 py-4 flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-purple-500" />
              <h2 className="text-lg font-medium text-gray-900">Subventions Supabase</h2>
            </div>
            {openSections.subsidies ? (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-400" />
            )}
          </button>

          {openSections.subsidies && (
            <div className="px-6 pb-6">
              {loadingSubsidies ? (
                <div className="text-center py-4">
                  <div className="animate-spin h-6 w-6 border-2 border-purple-500 border-t-transparent rounded-full mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-600">Chargement des subventions...</p>
                </div>
              ) : subsidyError ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{subsidyError}</p>
                </div>
              ) : subsidies.length === 0 ? (
                <p className="text-center py-4 text-gray-500">Aucune subvention trouvée</p>
              ) : (
                <div className="mt-4">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Puissance
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Montant
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date d'effet
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {subsidies.map((subsidy) => (
                        <tr key={subsidy.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {subsidy.power_range} kWc
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                            {subsidy.amount} €/kWc
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(subsidy.effective_date).toLocaleDateString('fr-FR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}