import React, { createContext, useContext, useState } from 'react';
import { FinancialSettings, InstallationPrice } from '../types/financial';

interface FinancialSettingsContextType {
  settings: FinancialSettings;
  updateSettings: (updates: Partial<FinancialSettings>) => void;
  addInstallationPrice: (power: number, price: number) => void;
  removeInstallationPrice: (power: number) => void;
}

const DEFAULT_INSTALLATION_PRICES: InstallationPrice[] = [
  { power: 2.5, price: 6890 },
  { power: 3.0, price: 7890 },
  { power: 3.5, price: 8890 },
  { power: 4.0, price: 9890 },
  { power: 4.5, price: 10890 },
  { power: 5.0, price: 11890 },
  { power: 5.5, price: 12890 },
  { power: 6.0, price: 14890 },
  { power: 6.5, price: 15890 },
  { power: 7.0, price: 16890 },
  { power: 7.5, price: 17890 },
  { power: 8.0, price: 18890 },
  { power: 8.5, price: 19890 },
  { power: 9.0, price: 19890 }
];

const DEFAULT_SETTINGS: FinancialSettings = {
  baseKwhPrice: 0.26,
  surplusSellPrices: {
    under9kw: 0.13,
    from9to36kw: 0.11,
    from36to100kw: 0.09
  },
  totalSellPrices: {
    under9kw: 0.20,
    from9to36kw: 0.17,
    from36to100kw: 0.14
  },
  sellPriceDate: '2025-02-01',
  defaultAutoconsumption: 75,
  defaultEnergyRevaluation: 7,
  defaultSellIndexation: 2,
  defaultPanelDegradation: -0.2,
  installationPrices: DEFAULT_INSTALLATION_PRICES,
  defaultSubsidyUnder3kw: 80,
  defaultSubsidyOver3kw: 80,
  defaultSubsidy9to36kw: 190,
  defaultSubsidy36to100kw: 100,
  subsidyDate: '2025-01-01'
};

const FinancialSettingsContext = createContext<FinancialSettingsContextType | undefined>(undefined);

export function FinancialSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<FinancialSettings>(() => {
    try {
      const savedSettings = {
        ...DEFAULT_SETTINGS,
        baseKwhPrice: parseFloat(localStorage.getItem('base_kwh_price') || DEFAULT_SETTINGS.baseKwhPrice.toString()),
        surplusSellPrices: {
          under9kw: parseFloat(localStorage.getItem('surplus_sell_price_under_9kw') || DEFAULT_SETTINGS.surplusSellPrices.under9kw.toString()),
          from9to36kw: parseFloat(localStorage.getItem('surplus_sell_price_9to36kw') || DEFAULT_SETTINGS.surplusSellPrices.from9to36kw.toString()),
          from36to100kw: parseFloat(localStorage.getItem('surplus_sell_price_36to100kw') || DEFAULT_SETTINGS.surplusSellPrices.from36to100kw.toString())
        },
        totalSellPrices: {
          under9kw: parseFloat(localStorage.getItem('total_sell_price_under_9kw') || DEFAULT_SETTINGS.totalSellPrices.under9kw.toString()),
          from9to36kw: parseFloat(localStorage.getItem('total_sell_price_9to36kw') || DEFAULT_SETTINGS.totalSellPrices.from9to36kw.toString()),
          from36to100kw: parseFloat(localStorage.getItem('total_sell_price_36to100kw') || DEFAULT_SETTINGS.totalSellPrices.from36to100kw.toString())
        },
        sellPriceDate: localStorage.getItem('sell_price_date') || DEFAULT_SETTINGS.sellPriceDate,
        defaultAutoconsumption: parseFloat(localStorage.getItem('default_autoconsumption') || DEFAULT_SETTINGS.defaultAutoconsumption.toString()),
        defaultEnergyRevaluation: parseFloat(localStorage.getItem('default_energy_revaluation') || DEFAULT_SETTINGS.defaultEnergyRevaluation.toString()),
        defaultSellIndexation: parseFloat(localStorage.getItem('default_sell_indexation') || DEFAULT_SETTINGS.defaultSellIndexation.toString()),
        defaultPanelDegradation: parseFloat(localStorage.getItem('default_panel_degradation') || DEFAULT_SETTINGS.defaultPanelDegradation.toString()),
        defaultSubsidyUnder3kw: parseFloat(localStorage.getItem('default_subsidy_under_3kw') || DEFAULT_SETTINGS.defaultSubsidyUnder3kw.toString()),
        defaultSubsidyOver3kw: parseFloat(localStorage.getItem('default_subsidy_over_3kw') || DEFAULT_SETTINGS.defaultSubsidyOver3kw.toString()),
        defaultSubsidy9to36kw: parseFloat(localStorage.getItem('default_subsidy_9to36kw') || DEFAULT_SETTINGS.defaultSubsidy9to36kw.toString()),
        defaultSubsidy36to100kw: parseFloat(localStorage.getItem('default_subsidy_36to100kw') || DEFAULT_SETTINGS.defaultSubsidy36to100kw.toString()),
        subsidyDate: localStorage.getItem('subsidy_date') || DEFAULT_SETTINGS.subsidyDate,
        installationPrices: [...DEFAULT_INSTALLATION_PRICES]
      };

      // Load custom installation prices
      const savedPrices = localStorage.getItem('installation_prices');
      if (savedPrices) {
        try {
          const customPrices = JSON.parse(savedPrices);
          if (Array.isArray(customPrices)) {
            const validCustomPrices = customPrices.filter(p => 
              p && typeof p.power === 'number' && typeof p.price === 'number' && p.power > 9
            );
            
            savedSettings.installationPrices = [
              ...DEFAULT_INSTALLATION_PRICES,
              ...validCustomPrices
            ].sort((a, b) => a.power - b.power);
          }
        } catch (error) {
          console.error('Error parsing custom prices:', error);
        }
      }

      return savedSettings;
    } catch (error) {
      console.error('Error loading settings:', error);
      return DEFAULT_SETTINGS;
    }
  });

  const updateSettings = (updates: Partial<FinancialSettings>) => {
    setSettings(prev => {
      const newSettings = { ...prev, ...updates };
      
      // Save to localStorage
      if (updates.baseKwhPrice !== undefined) {
        localStorage.setItem('base_kwh_price', updates.baseKwhPrice.toString());
      }
      
      if (updates.surplusSellPrices) {
        Object.entries(updates.surplusSellPrices).forEach(([key, value]) => {
          localStorage.setItem(`surplus_sell_price_${key}`, value.toString());
        });
      }
      
      if (updates.totalSellPrices) {
        Object.entries(updates.totalSellPrices).forEach(([key, value]) => {
          localStorage.setItem(`total_sell_price_${key}`, value.toString());
        });
      }
      
      if (updates.sellPriceDate) {
        localStorage.setItem('sell_price_date', updates.sellPriceDate);
      }
      
      if (updates.defaultAutoconsumption !== undefined) {
        localStorage.setItem('default_autoconsumption', updates.defaultAutoconsumption.toString());
      }
      
      if (updates.defaultEnergyRevaluation !== undefined) {
        localStorage.setItem('default_energy_revaluation', updates.defaultEnergyRevaluation.toString());
      }
      
      if (updates.defaultSellIndexation !== undefined) {
        localStorage.setItem('default_sell_indexation', updates.defaultSellIndexation.toString());
      }
      
      if (updates.defaultPanelDegradation !== undefined) {
        localStorage.setItem('default_panel_degradation', updates.defaultPanelDegradation.toString());
      }
      
      if (updates.defaultSubsidyUnder3kw !== undefined) {
        localStorage.setItem('default_subsidy_under_3kw', updates.defaultSubsidyUnder3kw.toString());
      }
      
      if (updates.defaultSubsidyOver3kw !== undefined) {
        localStorage.setItem('default_subsidy_over_3kw', updates.defaultSubsidyOver3kw.toString());
      }
      
      if (updates.defaultSubsidy9to36kw !== undefined) {
        localStorage.setItem('default_subsidy_9to36kw', updates.defaultSubsidy9to36kw.toString());
      }
      
      if (updates.defaultSubsidy36to100kw !== undefined) {
        localStorage.setItem('default_subsidy_36to100kw', updates.defaultSubsidy36to100kw.toString());
      }
      
      if (updates.subsidyDate) {
        localStorage.setItem('subsidy_date', updates.subsidyDate);
      }

      return newSettings;
    });
  };

  const addInstallationPrice = (power: number, price: number) => {
    if (power <= 0 || price <= 0) {
      console.error('Power and price must be positive');
      return;
    }

    setSettings(prev => {
      const existingIndex = prev.installationPrices.findIndex(p => Math.abs(p.power - power) < 0.01);
      
      let newPrices;
      if (existingIndex >= 0) {
        newPrices = [...prev.installationPrices];
        newPrices[existingIndex] = { power, price };
      } else {
        newPrices = [...prev.installationPrices, { power, price }];
      }
      
      newPrices.sort((a, b) => a.power - b.power);

      const customPrices = newPrices.filter(p => p.power > 9);
      localStorage.setItem('installation_prices', JSON.stringify(customPrices));

      return {
        ...prev,
        installationPrices: newPrices
      };
    });
  };

  const removeInstallationPrice = (power: number) => {
    if (power <= 9) {
      console.error('Cannot remove default prices');
      return;
    }

    setSettings(prev => {
      const newPrices = prev.installationPrices.filter(p => Math.abs(p.power - power) >= 0.01);
      
      const customPrices = newPrices.filter(p => p.power > 9);
      localStorage.setItem('installation_prices', JSON.stringify(customPrices));

      return {
        ...prev,
        installationPrices: newPrices
      };
    });
  };

  return (
    <FinancialSettingsContext.Provider value={{ 
      settings, 
      updateSettings,
      addInstallationPrice,
      removeInstallationPrice
    }}>
      {children}
    </FinancialSettingsContext.Provider>
  );
}

export function useFinancialSettings() {
  const context = useContext(FinancialSettingsContext);
  if (context === undefined) {
    throw new Error('useFinancialSettings must be used within a FinancialSettingsProvider');
  }
  return context;
}