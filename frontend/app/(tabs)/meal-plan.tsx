import React, { useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useApp } from '@/context/AppContext';
import { DayPlan, Meal } from '@/services/api';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MEAL_ICONS: Record<string, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
};

/** Map meal name keywords to a relevant Unsplash food photo */
function getMealImageUrl(name: string): string {
  const lower = name.toLowerCase();
  const map: [string[], string][] = [
    [['egg', 'toast', 'avocado toast'], 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=220&fit=crop'],
    [['chicken', 'greek', 'bowl'], 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=220&fit=crop'],
    [['salmon', 'fish', 'tuna'], 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=220&fit=crop'],
    [['smoothie', 'protein shake', 'shake'], 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=400&h=220&fit=crop'],
    [['pasta', 'spaghetti', 'noodle'], 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=400&h=220&fit=crop'],
    [['salad', 'greens', 'spinach'], 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=220&fit=crop'],
    [['beef', 'burger', 'steak', 'ground beef'], 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=220&fit=crop'],
    [['rice', 'quinoa', 'grain'], 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&h=220&fit=crop'],
    [['soup', 'stew', 'broth'], 'https://images.unsplash.com/photo-1547592180-85f173990554?w=400&h=220&fit=crop'],
    [['oat', 'oatmeal', 'cereal', 'granola'], 'https://images.unsplash.com/photo-1501959915551-4e8d30928317?w=400&h=220&fit=crop'],
    [['sandwich', 'wrap', 'burrito'], 'https://images.unsplash.com/photo-1509722747041-616f39b57ef3?w=400&h=220&fit=crop'],
    [['pancake', 'waffle'], 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=400&h=220&fit=crop'],
    [['tofu', 'tempeh', 'vegan'], 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=220&fit=crop'],
    [['yogurt', 'parfait'], 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=220&fit=crop'],
  ];
  for (const [keywords, url] of map) {
    if (keywords.some((kw) => lower.includes(kw))) return url;
  }
  return 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&h=220&fit=crop';
}

function MealCard({ type, meal, day }: { type: string; meal: Meal; day: number }) {
  const [expanded, setExpanded] = useState(false);
  const { saveMeal, removeSavedMeal, isMealSaved } = useApp();
  const saved = isMealSaved(meal);

  function toggleSave() {
    if (saved) {
      // find savedAt for this meal — we remove by name match
      removeSavedMeal(
        // We need the savedAt timestamp; profile stores it. For now remove first match by name.
        Date.now() // placeholder; see note below
      );
    } else {
      saveMeal(type, meal, day);
    }
  }

  return (
    <TouchableOpacity
      style={styles.mealCard}
      onPress={() => setExpanded((e) => !e)}
      activeOpacity={0.8}>
      {/* Food image */}
      <Image
        source={{ uri: getMealImageUrl(meal.name) }}
        style={styles.mealImage}
        resizeMode="cover"
      />

      <View style={styles.mealBody}>
        <View style={styles.mealHeader}>
          <Text style={styles.mealIcon}>{MEAL_ICONS[type]}</Text>
          <View style={styles.mealHeaderText}>
            <Text style={styles.mealType}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text>
            <Text style={styles.mealName}>{meal.name}</Text>
          </View>
          <View style={styles.mealRight}>
            <Text style={styles.mealCost}>${meal.estimated_cost.toFixed(2)}</Text>
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); saveMeal(type, meal, day); }}
              style={styles.saveBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[styles.saveBtnText, saved && styles.saveBtnSaved]}>
                {saved ? '★' : '☆'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Macro strip — always visible when AI returned macros */}
        {meal.macros && (
          <View style={styles.mealMacroStrip}>
            <Text style={[styles.mealMacroItem, { color: '#FF6B35' }]}>
              {meal.macros.calories.toFixed(0)} kcal
            </Text>
            <Text style={styles.mealMacroDot}>·</Text>
            <Text style={styles.mealMacroItem}>{meal.macros.protein_g.toFixed(0)}g protein</Text>
            <Text style={styles.mealMacroDot}>·</Text>
            <Text style={styles.mealMacroItem}>{meal.macros.carbs_g.toFixed(0)}g carbs</Text>
            <Text style={styles.mealMacroDot}>·</Text>
            <Text style={styles.mealMacroItem}>{meal.macros.fat_g.toFixed(0)}g fat</Text>
          </View>
        )}

        {expanded && (
          <View style={styles.mealDetails}>
            <Text style={styles.bodyLabel}>Ingredients</Text>
            <Text style={styles.bodyText}>{meal.ingredients.join(', ')}</Text>
            <Text style={[styles.bodyLabel, { marginTop: 10 }]}>Instructions</Text>
            <Text style={styles.bodyText}>{meal.instructions}</Text>
          </View>
        )}

        <Text style={styles.expandHint}>{expanded ? 'Tap to collapse' : 'Tap to see recipe'}</Text>
      </View>
    </TouchableOpacity>
  );
}

function DayCard({ plan }: { plan: DayPlan }) {
  const dayLabel = DAY_LABELS[(plan.day - 1) % 7];
  const dayTotal = plan.breakfast.estimated_cost + plan.lunch.estimated_cost + plan.dinner.estimated_cost;

  return (
    <View style={styles.dayCard}>
      <View style={styles.dayHeader}>
        <View style={styles.dayBadge}>
          <Text style={styles.dayBadgeText}>{dayLabel}</Text>
        </View>
        <Text style={styles.dayTitle}>Day {plan.day}</Text>
        <Text style={styles.dayTotal}>${dayTotal.toFixed(2)}</Text>
      </View>
      <MealCard type="breakfast" meal={plan.breakfast} day={plan.day} />
      <MealCard type="lunch" meal={plan.lunch} day={plan.day} />
      <MealCard type="dinner" meal={plan.dinner} day={plan.day} />
    </View>
  );
}

export default function MealPlanScreen() {
  const { mealPlanResult, manualCartItems } = useApp();

  if (!mealPlanResult) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>🍽️</Text>
        <Text style={styles.emptyText}>No meal plan yet</Text>
        <Text style={styles.emptySubtext}>
          Add items to cart then tap "Generate Meal Plan".
        </Text>
      </View>
    );
  }

  // Compute total nutrition from cart items as a rough meal plan estimate
  const totalCal = manualCartItems.reduce((s, e) => s + e.item.calories_per_unit * e.quantity, 0);
  const totalProtein = manualCartItems.reduce((s, e) => s + e.item.protein_per_unit * e.quantity, 0);
  const totalCarbs = manualCartItems.reduce((s, e) => s + e.item.carbs_per_unit * e.quantity, 0);
  const totalFat = manualCartItems.reduce((s, e) => s + e.item.fat_per_unit * e.quantity, 0);
  const numMeals = mealPlanResult.meal_plan.length * 3;
  const perMealCal = numMeals > 0 ? totalCal / numMeals : 0;
  const perMealProtein = numMeals > 0 ? totalProtein / numMeals : 0;
  const perMealCarbs = numMeals > 0 ? totalCarbs / numMeals : 0;
  const perMealFat = numMeals > 0 ? totalFat / numMeals : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Summary banner */}
      <View style={styles.summaryBanner}>
        <Text style={styles.summaryTitle}>Your {mealPlanResult.meal_plan.length}-Day Meal Plan</Text>
        <Text style={styles.summarySubtitle}>
          Est. total: ${mealPlanResult.total_cost.toFixed(2)}
        </Text>
      </View>

      {/* Nutrition summary per meal (estimated from cart) */}
      {totalCal > 0 && (
        <View style={styles.nutritionCard}>
          <Text style={styles.nutritionCardTitle}>Estimated Nutrition / Meal</Text>
          <View style={styles.macroRow}>
            {[
              { label: 'Calories', value: perMealCal.toFixed(0), unit: 'kcal', color: '#FF6B35' },
              { label: 'Protein', value: perMealProtein.toFixed(1), unit: 'g', color: '#00B4D8' },
              { label: 'Carbs', value: perMealCarbs.toFixed(1), unit: 'g', color: '#FF6B35' },
              { label: 'Fat', value: perMealFat.toFixed(1), unit: 'g', color: '#A78BFA' },
            ].map(({ label, value, unit, color }) => (
              <View key={label} style={styles.macroBox}>
                <Text style={[styles.macroValue, { color }]}>{value}</Text>
                <Text style={styles.macroUnit}>{unit}</Text>
                <Text style={styles.macroLabel}>{label}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.nutritionNote}>Based on cart items · per 100g</Text>
        </View>
      )}

      <Text style={styles.hint}>Tap a meal to see recipe · ☆ to save</Text>
      {mealPlanResult.meal_plan.map((plan) => (
        <DayCard key={plan.day} plan={plan} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F1E' },
  content: { padding: 16, paddingBottom: 48 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: '#0A0F1E' },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 20, fontWeight: '700', color: '#E2E8F0' },
  emptySubtext: { fontSize: 14, color: '#64748B', marginTop: 6, textAlign: 'center' },

  summaryBanner: {
    backgroundColor: '#0F1629',
    borderRadius: 14,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.2)',
  },
  summaryTitle: { fontSize: 18, fontWeight: '700', color: '#00E676' },
  summarySubtitle: { fontSize: 14, color: '#94A3B8', marginTop: 4 },

  nutritionCard: {
    backgroundColor: '#0F1629',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1E2A42',
  },
  nutritionCardTitle: { fontSize: 13, fontWeight: '600', color: '#64748B', marginBottom: 12 },
  macroRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  macroBox: {
    flex: 1,
    backgroundColor: '#12183A',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E2A42',
  },
  macroValue: { fontSize: 16, fontWeight: '800' },
  macroUnit: { fontSize: 9, color: '#64748B', marginTop: 1 },
  macroLabel: { fontSize: 9, color: '#94A3B8', marginTop: 2 },
  nutritionNote: { fontSize: 10, color: '#475569', textAlign: 'center' },

  hint: { fontSize: 12, color: '#64748B', marginBottom: 14, textAlign: 'center' },

  dayCard: {
    backgroundColor: '#0F1629',
    borderRadius: 14,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1E2A42',
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2A42',
    backgroundColor: '#12183A',
  },
  dayBadge: {
    backgroundColor: '#00E676',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 10,
  },
  dayBadgeText: { color: '#070C18', fontWeight: '700', fontSize: 13 },
  dayTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: '#E2E8F0' },
  dayTotal: { fontSize: 14, fontWeight: '600', color: '#00E676' },

  mealCard: {
    borderBottomWidth: 1,
    borderBottomColor: '#1A2238',
    overflow: 'hidden',
  },
  mealImage: {
    width: '100%',
    height: 130,
    backgroundColor: '#12183A',
  },
  mealBody: { padding: 12 },
  mealHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  mealIcon: { fontSize: 18, marginRight: 8, marginTop: 2 },
  mealHeaderText: { flex: 1 },
  mealRight: { alignItems: 'flex-end', gap: 4 },
  mealType: { fontSize: 10, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
  mealName: { fontSize: 14, fontWeight: '600', color: '#E2E8F0', marginTop: 1 },
  mealCost: { fontSize: 13, color: '#00E676', fontWeight: '600' },
  saveBtn: { padding: 2 },
  saveBtnText: { fontSize: 20, color: '#475569' },
  saveBtnSaved: { color: '#FFD700' },

  mealMacroStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1A2238',
  },
  mealMacroItem: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
  mealMacroDot: { fontSize: 11, color: '#334155' },

  mealDetails: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#1A2238' },
  bodyLabel: { fontSize: 11, fontWeight: '600', color: '#64748B', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  bodyText: { fontSize: 13, color: '#94A3B8', lineHeight: 18 },
  expandHint: { fontSize: 10, color: '#475569', marginTop: 8 },
});
