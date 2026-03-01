import React, { createContext, useContext, useState } from 'react';
import { GroceryItem, OptimizeResponse, MealPlanResponse, NutritionLookupResponse } from '@/services/api';

export interface ManualCartEntry {
  item: GroceryItem;
  quantity: number;
}

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
  manualCartItems: ManualCartEntry[];
  addManualItem: (item: GroceryItem) => void;
  removeManualItem: (id: string) => void;
  updateManualQty: (id: string, delta: number) => void;
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
  const [manualCartItems, setManualCartItems] = useState<ManualCartEntry[]>([]);

  function addScannedItem(item: NutritionLookupResponse) {
    setScannedItems((prev) => [...prev, item]);
  }

  function removeScannedItem(barcode: string) {
    setScannedItems((prev) => prev.filter((i) => i.barcode !== barcode));
  }

  function addManualItem(item: GroceryItem) {
    setManualCartItems((prev) => {
      const existing = prev.find((e) => e.item.id === item.id);
      if (existing) return prev.map((e) => e.item.id === item.id ? { ...e, quantity: e.quantity + 1 } : e);
      return [...prev, { item, quantity: 1 }];
    });
  }

  function removeManualItem(id: string) {
    setManualCartItems((prev) => prev.filter((e) => e.item.id !== id));
  }

  function updateManualQty(id: string, delta: number) {
    setManualCartItems((prev) =>
      prev.map((e) => e.item.id === id ? { ...e, quantity: Math.max(1, e.quantity + delta) } : e)
    );
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
        manualCartItems, addManualItem, removeManualItem, updateManualQty,
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
