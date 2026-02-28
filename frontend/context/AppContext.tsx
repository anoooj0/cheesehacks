import React, { createContext, useContext, useState } from 'react';
import { OptimizeResponse, MealPlanResponse } from '@/services/api';

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
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [budget, setBudget] = useState('');
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>([]);
  const [numDays, setNumDays] = useState(7);
  const [cartResult, setCartResult] = useState<OptimizeResponse | null>(null);
  const [mealPlanResult, setMealPlanResult] = useState<MealPlanResponse | null>(null);

  return (
    <AppContext.Provider
      value={{
        budget, setBudget,
        selectedStores, setSelectedStores,
        dietaryPreferences, setDietaryPreferences,
        numDays, setNumDays,
        cartResult, setCartResult,
        mealPlanResult, setMealPlanResult,
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
