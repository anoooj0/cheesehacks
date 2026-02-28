import React, { createContext, useContext, useState } from 'react';
import { OptimizeResponse, MealPlanResponse, NutritionLookupResponse } from '@/services/api';

interface AppState {
  budget: string;
  setBudget: (v: string) => void;
  selectedStores: string[];
  setSelectedStores: (v: string[]) => void;
  dietaryPreferences: string[];
  setDietaryPreferences: (v: string[]) => void;
  numDays: number;
  setNumDays: (v: number) => void;
  cartResult: OptimizeResponse | null;
  setCartResult: (v: OptimizeResponse | null) => void;
  mealPlanResult: MealPlanResponse | null;
  setMealPlanResult: (v: MealPlanResponse | null) => void;
  scannedItems: NutritionLookupResponse[];
  addScannedItem: (item: NutritionLookupResponse) => void;
  removeScannedItem: (barcode: string) => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [budget, setBudget] = useState('');
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>([]);
  const [numDays, setNumDays] = useState(7);
  const [cartResult, setCartResult] = useState<OptimizeResponse | null>(null);
  const [mealPlanResult, setMealPlanResult] = useState<MealPlanResponse | null>(null);
  const [scannedItems, setScannedItems] = useState<NutritionLookupResponse[]>([]);

  function addScannedItem(item: NutritionLookupResponse) {
    setScannedItems((prev) => [...prev, item]);
  }

  function removeScannedItem(barcode: string) {
    setScannedItems((prev) => prev.filter((i) => i.barcode !== barcode));
  }

  return (
    <AppContext.Provider
      value={{
        budget, setBudget,
        selectedStores, setSelectedStores,
        dietaryPreferences, setDietaryPreferences,
        numDays, setNumDays,
        cartResult, setCartResult,
        mealPlanResult, setMealPlanResult,
        scannedItems, addScannedItem, removeScannedItem,
      }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
