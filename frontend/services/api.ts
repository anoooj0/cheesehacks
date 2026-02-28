const BASE_URL = 'http://localhost:8000';

export interface GroceryItem {
  id: string;
  name: string;
  category: string;
  price: number;
  store_id: string;
  store_name: string;
  unit: string;
  calories_per_unit: number;
  protein_per_unit: number;
  carbs_per_unit: number;
  fat_per_unit: number;
}

export interface CartItem {
  item: GroceryItem;
  quantity: number;
  total_cost: number;
}

export interface OptimizeResponse {
  cart: CartItem[];
  total_cost: number;
  total_savings: number;
  nutrition_summary: Record<string, number>;
}

export interface Meal {
  name: string;
  ingredients: string[];
  instructions: string;
  estimated_cost: number;
}

export interface DayPlan {
  day: number;
  breakfast: Meal;
  lunch: Meal;
  dinner: Meal;
}

export interface MealPlanResponse {
  meal_plan: DayPlan[];
  total_cost: number;
}

export async function optimizeCart(
  budget: number,
  storeIds: string[],
  dietaryPreferences: string[],
  numDays: number
): Promise<OptimizeResponse> {
  const res = await fetch(`${BASE_URL}/optimize/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      budget,
      store_ids: storeIds,
      dietary_preferences: dietaryPreferences,
      num_days: numDays,
    }),
  });
  if (!res.ok) throw new Error('Failed to optimize cart');
  return res.json();
}

export async function generateMealPlan(
  cart: CartItem[],
  dietaryPreferences: string[],
  numDays: number
): Promise<MealPlanResponse> {
  const res = await fetch(`${BASE_URL}/meal-plan/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cart,
      dietary_preferences: dietaryPreferences,
      num_days: numDays,
    }),
  });
  if (!res.ok) throw new Error('Failed to generate meal plan');
  return res.json();
}

export async function getPrices(): Promise<GroceryItem[]> {
  const res = await fetch(`${BASE_URL}/prices/`);
  if (!res.ok) throw new Error('Failed to fetch prices');
  return res.json();
}
