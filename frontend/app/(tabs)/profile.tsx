import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useApp, SavedMeal } from '@/context/AppContext';

const MEAL_ICONS: Record<string, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
};

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: 'Sedentary',
  light: 'Light Active',
  moderate: 'Moderate',
  active: 'Very Active',
};

function SavedMealCard({ entry, onRemove }: { entry: SavedMeal; onRemove: () => void }) {
  return (
    <View style={styles.savedCard}>
      <View style={styles.savedCardLeft}>
        <View style={styles.mealTypeBadge}>
          <Text style={styles.mealTypeIcon}>{MEAL_ICONS[entry.mealType] ?? '🍽️'}</Text>
          <Text style={styles.mealTypeText}>{entry.mealType.charAt(0).toUpperCase() + entry.mealType.slice(1)}</Text>
        </View>
        <Text style={styles.savedMealName}>{entry.meal.name}</Text>
        <Text style={styles.savedMealMeta}>
          Day {entry.day} · ${entry.meal.estimated_cost.toFixed(2)}
        </Text>
        <Text style={styles.savedMealIngredients} numberOfLines={2}>
          {entry.meal.ingredients.join(', ')}
        </Text>
      </View>
      <TouchableOpacity onPress={onRemove} style={styles.removeBtn}>
        <Text style={styles.removeBtnText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const {
    allTimeScannedCount, mealPlansGenerated, savedMeals, removeSavedMeal,
    userProfile, nutritionGoals, resetOnboarding,
  } = useApp();

  function handleEditProfile() {
    resetOnboarding();
    router.replace('/onboarding');
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarEmoji}>🧀</Text>
        </View>
        <Text style={styles.appName}>NutriLens</Text>
        <Text style={styles.appSub}>Smart Grocery · Madison WI</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{allTimeScannedCount}</Text>
          <Text style={styles.statLabel}>Items{'\n'}Scanned</Text>
        </View>
        <View style={[styles.statCard, styles.statCardMiddle]}>
          <Text style={styles.statValue}>{mealPlansGenerated}</Text>
          <Text style={styles.statLabel}>Meal Plans{'\n'}Generated</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{savedMeals.length}</Text>
          <Text style={styles.statLabel}>Saved{'\n'}Meals</Text>
        </View>
      </View>

      {/* Profile & Goals */}
      {userProfile && nutritionGoals && (
        <View style={[styles.section, { marginBottom: 16 }]}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>My Goals</Text>
            <TouchableOpacity onPress={handleEditProfile} style={styles.editBtn}>
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          </View>

          {/* Profile summary */}
          <View style={styles.profileRow}>
            <View style={styles.profileChip}>
              <Text style={styles.profileChipLabel}>Sex</Text>
              <Text style={styles.profileChipValue}>{userProfile.sex === 'male' ? '♂ Male' : '♀ Female'}</Text>
            </View>
            <View style={styles.profileChip}>
              <Text style={styles.profileChipLabel}>Height</Text>
              <Text style={styles.profileChipValue}>{userProfile.heightFt}'{userProfile.heightIn}"</Text>
            </View>
            <View style={styles.profileChip}>
              <Text style={styles.profileChipLabel}>Weight</Text>
              <Text style={styles.profileChipValue}>{userProfile.weightLbs} lbs</Text>
            </View>
            <View style={styles.profileChip}>
              <Text style={styles.profileChipLabel}>Goal</Text>
              <Text style={styles.profileChipValue}>{userProfile.goalWeightLbs} lbs</Text>
            </View>
          </View>

          <View style={styles.activityBadge}>
            <Text style={styles.activityBadgeText}>
              Activity: {ACTIVITY_LABELS[userProfile.activityLevel]}
            </Text>
          </View>

          {/* Daily macro targets */}
          <View style={styles.macroGrid}>
            {[
              { label: 'Calories', value: `${nutritionGoals.calories}`, unit: 'kcal', color: '#FF6B35', bg: 'rgba(255,107,53,0.1)' },
              { label: 'Protein', value: `${nutritionGoals.protein_g}g`, unit: '/ day', color: '#00B4D8', bg: 'rgba(0,180,216,0.1)' },
              { label: 'Carbs', value: `${nutritionGoals.carbs_g}g`, unit: '/ day', color: '#A78BFA', bg: 'rgba(167,139,250,0.1)' },
              { label: 'Fat', value: `${nutritionGoals.fat_g}g`, unit: '/ day', color: '#FCD34D', bg: 'rgba(252,211,77,0.1)' },
            ].map(({ label, value, unit, color, bg }) => (
              <View key={label} style={[styles.macroCard, { backgroundColor: bg }]}>
                <Text style={[styles.macroValue, { color }]}>{value}</Text>
                <Text style={styles.macroUnit}>{unit}</Text>
                <Text style={styles.macroLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Saved Meals */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Saved Meals</Text>
        {savedMeals.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🍽️</Text>
            <Text style={styles.emptyText}>No saved meals yet</Text>
            <Text style={styles.emptySubtext}>
              Tap the ☆ icon on any meal in your Meal Plan to save it here.
            </Text>
          </View>
        ) : (
          <View style={styles.savedList}>
            {savedMeals.map((entry) => (
              <SavedMealCard
                key={entry.savedAt}
                entry={entry}
                onRemove={() => removeSavedMeal(entry.savedAt)}
              />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F1E' },
  content: { padding: 20, paddingBottom: 48 },

  header: { alignItems: 'center', paddingTop: 20, paddingBottom: 28 },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,230,118,0.12)',
    borderWidth: 2,
    borderColor: 'rgba(0,230,118,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarEmoji: { fontSize: 36 },
  appName: { fontSize: 22, fontWeight: '800', color: '#E2E8F0', letterSpacing: -0.5 },
  appSub: { fontSize: 13, color: '#64748B', marginTop: 3 },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#0F1629',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E2A42',
    marginBottom: 16,
    overflow: 'hidden',
  },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 20 },
  statCardMiddle: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#1E2A42' },
  statValue: { fontSize: 28, fontWeight: '800', color: '#00E676' },
  statLabel: { fontSize: 11, color: '#64748B', marginTop: 4, textAlign: 'center', lineHeight: 16 },

  section: {
    backgroundColor: '#0F1629',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E2A42',
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#E2E8F0' },
  editBtn: {
    backgroundColor: '#12183A',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#1E2A42',
  },
  editBtnText: { fontSize: 12, color: '#00E676', fontWeight: '600' },

  profileRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  profileChip: {
    backgroundColor: '#12183A',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#1E2A42',
    alignItems: 'center',
  },
  profileChipLabel: { fontSize: 10, color: '#475569', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.3 },
  profileChipValue: { fontSize: 13, fontWeight: '700', color: '#E2E8F0' },

  activityBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,230,118,0.1)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.25)',
    marginBottom: 14,
  },
  activityBadgeText: { fontSize: 12, color: '#00E676', fontWeight: '600' },

  macroGrid: { flexDirection: 'row', gap: 8 },
  macroCard: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E2A42',
  },
  macroValue: { fontSize: 16, fontWeight: '800' },
  macroUnit: { fontSize: 9, color: '#64748B', marginTop: 1 },
  macroLabel: { fontSize: 9, color: '#94A3B8', marginTop: 2 },

  emptyState: { alignItems: 'center', paddingVertical: 24 },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#E2E8F0', marginBottom: 6 },
  emptySubtext: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 18 },

  savedList: { gap: 10 },
  savedCard: {
    flexDirection: 'row',
    backgroundColor: '#12183A',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E2A42',
  },
  savedCardLeft: { flex: 1 },
  mealTypeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  mealTypeIcon: { fontSize: 14 },
  mealTypeText: { fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },
  savedMealName: { fontSize: 14, fontWeight: '700', color: '#E2E8F0', marginBottom: 3 },
  savedMealMeta: { fontSize: 12, color: '#00E676', fontWeight: '600', marginBottom: 4 },
  savedMealIngredients: { fontSize: 11, color: '#64748B', lineHeight: 16 },
  removeBtn: { padding: 6, marginLeft: 8 },
  removeBtnText: { fontSize: 16, color: '#475569' },
});
