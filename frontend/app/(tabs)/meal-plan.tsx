import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useApp } from '@/context/AppContext';
import { DayPlan, Meal } from '@/services/api';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MEAL_ICONS: Record<string, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
};

function MealCard({ type, meal }: { type: string; meal: Meal }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <TouchableOpacity
      style={styles.mealCard}
      onPress={() => setExpanded(e => !e)}
      activeOpacity={0.8}>
      <View style={styles.mealHeader}>
        <Text style={styles.mealIcon}>{MEAL_ICONS[type]}</Text>
        <View style={styles.mealHeaderText}>
          <Text style={styles.mealType}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text>
          <Text style={styles.mealName}>{meal.name}</Text>
        </View>
        <Text style={styles.mealCost}>${meal.estimated_cost.toFixed(2)}</Text>
      </View>

      {expanded && (
        <View style={styles.mealBody}>
          <Text style={styles.bodyLabel}>Ingredients</Text>
          <Text style={styles.bodyText}>{meal.ingredients.join(', ')}</Text>
          <Text style={[styles.bodyLabel, { marginTop: 8 }]}>Instructions</Text>
          <Text style={styles.bodyText}>{meal.instructions}</Text>
        </View>
      )}
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
      <MealCard type="breakfast" meal={plan.breakfast} />
      <MealCard type="lunch" meal={plan.lunch} />
      <MealCard type="dinner" meal={plan.dinner} />
    </View>
  );
}

export default function MealPlanScreen() {
  const { mealPlanResult } = useApp();

  if (!mealPlanResult) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>🍽️</Text>
        <Text style={styles.emptyText}>No meal plan yet</Text>
        <Text style={styles.emptySubtext}>
          Optimize your cart first, then tap "Generate Meal Plan".
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.summaryBanner}>
        <Text style={styles.summaryTitle}>Your {mealPlanResult.meal_plan.length}-Day Meal Plan</Text>
        <Text style={styles.summarySubtitle}>
          Est. total: ${mealPlanResult.total_cost.toFixed(2)}
        </Text>
      </View>
      <Text style={styles.hint}>Tap a meal to see ingredients & instructions</Text>
      {mealPlanResult.meal_plan.map(plan => (
        <DayCard key={plan.day} plan={plan} />
      ))}
    </ScrollView>
  );
}

const PRIMARY = '#0a7ea4';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  content: { padding: 16, paddingBottom: 48 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 20, fontWeight: '700', color: '#11181C' },
  emptySubtext: { fontSize: 14, color: '#687076', marginTop: 6, textAlign: 'center' },
  summaryBanner: {
    backgroundColor: PRIMARY,
    borderRadius: 14,
    padding: 20,
    marginBottom: 8,
  },
  summaryTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  summarySubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  hint: { fontSize: 12, color: '#687076', marginBottom: 16, textAlign: 'center' },
  dayCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dayBadge: {
    backgroundColor: PRIMARY,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 10,
  },
  dayBadgeText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  dayTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: '#11181C' },
  dayTotal: { fontSize: 14, fontWeight: '600', color: '#687076' },
  mealCard: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    padding: 14,
  },
  mealHeader: { flexDirection: 'row', alignItems: 'center' },
  mealIcon: { fontSize: 20, marginRight: 10 },
  mealHeaderText: { flex: 1 },
  mealType: { fontSize: 11, color: '#687076', textTransform: 'uppercase', letterSpacing: 0.5 },
  mealName: { fontSize: 14, fontWeight: '600', color: '#11181C', marginTop: 1 },
  mealCost: { fontSize: 13, color: PRIMARY, fontWeight: '600' },
  mealBody: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f5f5f5' },
  bodyLabel: { fontSize: 12, fontWeight: '600', color: '#687076', marginBottom: 4 },
  bodyText: { fontSize: 13, color: '#11181C', lineHeight: 18 },
});
