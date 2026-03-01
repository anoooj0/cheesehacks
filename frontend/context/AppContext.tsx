import React, { createContext, useContext, useState } from 'react';
import { GroceryItem, Meal, OptimizeResponse, MealPlanResponse, NutritionLookupResponse } from '@/services/api';

export interface ManualCartEntry {
  item: GroceryItem;
  quantity: number;
}

export interface SavedMeal {
  mealType: string;
  meal: Meal;
  day: number;
  savedAt: number;
}

export interface UserProfile {
  sex: 'male' | 'female';
  heightFt: number;
  heightIn: number;
  weightLbs: number;
  goalWeightLbs: number;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active';
}

export interface NutritionGoals {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

/** Mifflin-St Jeor BMR → TDEE → deficit-adjusted daily targets */
export function calculateGoalsFromProfile(profile: UserProfile): NutritionGoals {
  const heightCm = profile.heightFt * 30.48 + profile.heightIn * 2.54;
  const weightKg = profile.weightLbs * 0.453592;
  const age = 25;
  const bmr =
    profile.sex === 'male'
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  const multipliers = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 };
  const tdee = bmr * multipliers[profile.activityLevel];
  const lbsToLose = Math.max(0, profile.weightLbs - profile.goalWeightLbs);
  const weeklyRate = Math.min(lbsToLose / 10, 1.5);
  const targetCal = Math.max(Math.round(tdee - weeklyRate * 500), 1200);
  return {
    calories: targetCal,
    protein_g: Math.round((targetCal * 0.30) / 4),
    carbs_g: Math.round((targetCal * 0.40) / 4),
    fat_g: Math.round((targetCal * 0.30) / 9),
  };
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
  savedMeals: SavedMeal[];
  saveMeal: (mealType: string, meal: Meal, day: number) => void;
  removeSavedMeal: (savedAt: number) => void;
  isMealSaved: (meal: Meal) => boolean;
  allTimeScannedCount: number;
  mealPlansGenerated: number;
  incrementMealPlansGenerated: () => void;
  onboardingComplete: boolean;
  userProfile: UserProfile | null;
  nutritionGoals: NutritionGoals | null;
  completeOnboarding: (profile: UserProfile, goals: NutritionGoals) => void;
  resetOnboarding: () => void;
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
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
  const [allTimeScannedCount, setAllTimeScannedCount] = useState(0);
  const [mealPlansGenerated, setMealPlansGenerated] = useState(0);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [nutritionGoals, setNutritionGoals] = useState<NutritionGoals | null>(null);

  function addScannedItem(item: NutritionLookupResponse) {
    setScannedItems((prev) => [...prev, item]);
    setAllTimeScannedCount((n) => n + 1);
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

  function saveMeal(mealType: string, meal: Meal, day: number) {
    setSavedMeals((prev) => [...prev, { mealType, meal, day, savedAt: Date.now() }]);
  }

  function removeSavedMeal(savedAt: number) {
    setSavedMeals((prev) => prev.filter((m) => m.savedAt !== savedAt));
  }

  function isMealSaved(meal: Meal) {
    return savedMeals.some((m) => m.meal.name === meal.name);
  }

  function incrementMealPlansGenerated() {
    setMealPlansGenerated((n) => n + 1);
  }

  function completeOnboarding(profile: UserProfile, goals: NutritionGoals) {
    setUserProfile(profile);
    setNutritionGoals(goals);
    setOnboardingComplete(true);
  }

  function resetOnboarding() {
    setOnboardingComplete(false);
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
        savedMeals, saveMeal, removeSavedMeal, isMealSaved,
        allTimeScannedCount, mealPlansGenerated, incrementMealPlansGenerated,
        onboardingComplete, userProfile, nutritionGoals,
        completeOnboarding, resetOnboarding,
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
