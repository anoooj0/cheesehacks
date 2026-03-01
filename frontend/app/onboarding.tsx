import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  useApp,
  UserProfile,
  NutritionGoals,
  calculateGoalsFromProfile,
} from '@/context/AppContext';

const GREEN = '#00E676';
const ACTIVITY_OPTIONS: { key: UserProfile['activityLevel']; label: string; desc: string }[] = [
  { key: 'sedentary', label: 'Sedentary', desc: 'Little or no exercise' },
  { key: 'light', label: 'Light', desc: '1–3 days/week' },
  { key: 'moderate', label: 'Moderate', desc: '3–5 days/week' },
  { key: 'active', label: 'Active', desc: '6–7 days/week' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { completeOnboarding } = useApp();
  const [step, setStep] = useState(1);

  // Step 1 state
  const [sex, setSex] = useState<'male' | 'female' | null>(null);
  const [heightFt, setHeightFt] = useState('5');
  const [heightIn, setHeightIn] = useState('10');
  const [weightLbs, setWeightLbs] = useState('170');
  const [goalWeightLbs, setGoalWeightLbs] = useState('155');
  const [activityLevel, setActivityLevel] = useState<UserProfile['activityLevel']>('moderate');

  // Step 2 state (pre-filled after step 1 calc)
  const [goalCal, setGoalCal] = useState('');
  const [goalProtein, setGoalProtein] = useState('');
  const [goalCarbs, setGoalCarbs] = useState('');
  const [goalFat, setGoalFat] = useState('');

  function goToStep2() {
    if (!sex) return;
    const profile: UserProfile = {
      sex,
      heightFt: parseInt(heightFt) || 5,
      heightIn: parseInt(heightIn) || 10,
      weightLbs: parseFloat(weightLbs) || 170,
      goalWeightLbs: parseFloat(goalWeightLbs) || 155,
      activityLevel,
    };
    const calc = calculateGoalsFromProfile(profile);
    setGoalCal(String(calc.calories));
    setGoalProtein(String(calc.protein_g));
    setGoalCarbs(String(calc.carbs_g));
    setGoalFat(String(calc.fat_g));
    setStep(2);
  }

  function finish() {
    const profile: UserProfile = {
      sex: sex!,
      heightFt: parseInt(heightFt) || 5,
      heightIn: parseInt(heightIn) || 10,
      weightLbs: parseFloat(weightLbs) || 170,
      goalWeightLbs: parseFloat(goalWeightLbs) || 155,
      activityLevel,
    };
    const goals: NutritionGoals = {
      calories: parseInt(goalCal) || 2000,
      protein_g: parseInt(goalProtein) || 150,
      carbs_g: parseInt(goalCarbs) || 200,
      fat_g: parseInt(goalFat) || 65,
    };
    completeOnboarding(profile, goals);
    router.replace('/(tabs)/');
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoEmoji}>🧀</Text>
          </View>
          <Text style={styles.appName}>NutriLens</Text>
          <Text style={styles.appSub}>Let's personalize your plan</Text>
        </View>

        {/* Step indicator */}
        <View style={styles.stepRow}>
          <View style={[styles.stepDot, step === 1 && styles.stepDotActive]} />
          <View style={styles.stepLine} />
          <View style={[styles.stepDot, step === 2 && styles.stepDotActive]} />
        </View>
        <Text style={styles.stepLabel}>Step {step} of 2 — {step === 1 ? 'Your Profile' : 'Daily Goals'}</Text>

        {step === 1 ? (
          <>
            {/* Sex */}
            <Text style={styles.fieldLabel}>Sex</Text>
            <View style={styles.toggleRow}>
              {(['male', 'female'] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.toggleBtn, sex === s && styles.toggleBtnActive]}
                  onPress={() => setSex(s)}
                  activeOpacity={0.8}>
                  <Text style={[styles.toggleBtnText, sex === s && styles.toggleBtnTextActive]}>
                    {s === 'male' ? '♂ Male' : '♀ Female'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Height */}
            <Text style={styles.fieldLabel}>Height</Text>
            <View style={styles.heightRow}>
              <View style={styles.heightBox}>
                <TextInput
                  style={styles.input}
                  value={heightFt}
                  onChangeText={setHeightFt}
                  keyboardType="numeric"
                  maxLength={1}
                  placeholderTextColor="#475569"
                />
                <Text style={styles.inputUnit}>ft</Text>
              </View>
              <View style={styles.heightBox}>
                <TextInput
                  style={styles.input}
                  value={heightIn}
                  onChangeText={setHeightIn}
                  keyboardType="numeric"
                  maxLength={2}
                  placeholderTextColor="#475569"
                />
                <Text style={styles.inputUnit}>in</Text>
              </View>
            </View>

            {/* Weight */}
            <Text style={styles.fieldLabel}>Current Weight</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, styles.inputFull]}
                value={weightLbs}
                onChangeText={setWeightLbs}
                keyboardType="decimal-pad"
                placeholderTextColor="#475569"
              />
              <Text style={styles.inputUnit}>lbs</Text>
            </View>

            {/* Goal Weight */}
            <Text style={styles.fieldLabel}>Goal Weight</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, styles.inputFull]}
                value={goalWeightLbs}
                onChangeText={setGoalWeightLbs}
                keyboardType="decimal-pad"
                placeholderTextColor="#475569"
              />
              <Text style={styles.inputUnit}>lbs</Text>
            </View>

            {/* Activity */}
            <Text style={styles.fieldLabel}>Activity Level</Text>
            <View style={styles.activityGrid}>
              {ACTIVITY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.activityCard, activityLevel === opt.key && styles.activityCardActive]}
                  onPress={() => setActivityLevel(opt.key)}
                  activeOpacity={0.8}>
                  <Text style={[styles.activityLabel, activityLevel === opt.key && styles.activityLabelActive]}>
                    {opt.label}
                  </Text>
                  <Text style={[styles.activityDesc, activityLevel === opt.key && styles.activityDescActive]}>
                    {opt.desc}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, !sex && styles.primaryBtnDisabled]}
              onPress={goToStep2}
              disabled={!sex}
              activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Continue →</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.calcNote}>
              <Text style={styles.calcNoteText}>
                Calculated from your profile using the Mifflin-St Jeor formula. Tap any value to adjust.
              </Text>
            </View>

            {[
              { label: 'Daily Calories', value: goalCal, set: setGoalCal, unit: 'kcal', color: '#FF6B35' },
              { label: 'Protein', value: goalProtein, set: setGoalProtein, unit: 'g / day', color: '#00B4D8' },
              { label: 'Carbohydrates', value: goalCarbs, set: setGoalCarbs, unit: 'g / day', color: '#A78BFA' },
              { label: 'Fat', value: goalFat, set: setGoalFat, unit: 'g / day', color: '#FCD34D' },
            ].map(({ label, value, set, unit, color }) => (
              <View key={label} style={styles.goalCard}>
                <View style={styles.goalCardLeft}>
                  <View style={[styles.goalColorDot, { backgroundColor: color }]} />
                  <Text style={styles.goalCardLabel}>{label}</Text>
                </View>
                <View style={styles.goalInputRow}>
                  <TextInput
                    style={[styles.goalInput, { color }]}
                    value={value}
                    onChangeText={set}
                    keyboardType="numeric"
                    placeholderTextColor="#475569"
                  />
                  <Text style={styles.goalUnit}>{unit}</Text>
                </View>
              </View>
            ))}

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)} activeOpacity={0.8}>
                <Text style={styles.backBtnText}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryBtn, styles.primaryBtnFlex]} onPress={finish} activeOpacity={0.85}>
                <Text style={styles.primaryBtnText}>Get Started</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0F1E' },
  scroll: { flex: 1 },
  content: { padding: 24, paddingBottom: 56 },

  header: { alignItems: 'center', paddingTop: 24, paddingBottom: 28 },
  logoIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(0,230,118,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(0,230,118,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoEmoji: { fontSize: 30 },
  appName: { fontSize: 24, fontWeight: '800', color: '#E2E8F0', letterSpacing: -0.5 },
  appSub: { fontSize: 14, color: '#64748B', marginTop: 4 },

  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#1E2A42' },
  stepDotActive: { backgroundColor: GREEN, width: 12, height: 12, borderRadius: 6 },
  stepLine: { width: 40, height: 2, backgroundColor: '#1E2A42', marginHorizontal: 6 },
  stepLabel: { fontSize: 12, color: '#64748B', textAlign: 'center', marginBottom: 24 },

  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#94A3B8', marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.5 },

  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#0F1629',
    borderWidth: 1.5,
    borderColor: '#1E2A42',
    alignItems: 'center',
  },
  toggleBtnActive: { backgroundColor: 'rgba(0,230,118,0.12)', borderColor: GREEN },
  toggleBtnText: { fontSize: 15, fontWeight: '600', color: '#64748B' },
  toggleBtnTextActive: { color: GREEN },

  heightRow: { flexDirection: 'row', gap: 10 },
  heightBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F1629', borderRadius: 14, borderWidth: 1, borderColor: '#1E2A42', paddingHorizontal: 14, paddingVertical: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F1629', borderRadius: 14, borderWidth: 1, borderColor: '#1E2A42', paddingHorizontal: 14, paddingVertical: 12 },
  input: { flex: 1, fontSize: 18, fontWeight: '700', color: '#E2E8F0' },
  inputFull: { flex: 1 },
  inputUnit: { fontSize: 13, color: '#64748B', marginLeft: 6 },

  activityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  activityCard: {
    width: '48%',
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#0F1629',
    borderWidth: 1.5,
    borderColor: '#1E2A42',
  },
  activityCardActive: { backgroundColor: 'rgba(0,230,118,0.10)', borderColor: GREEN },
  activityLabel: { fontSize: 14, fontWeight: '700', color: '#94A3B8', marginBottom: 2 },
  activityLabelActive: { color: GREEN },
  activityDesc: { fontSize: 11, color: '#475569' },
  activityDescActive: { color: '#64748B' },

  primaryBtn: {
    backgroundColor: GREEN,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
    shadowColor: GREEN,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  primaryBtnDisabled: { opacity: 0.4 },
  primaryBtnFlex: { flex: 1, marginTop: 0 },
  primaryBtnText: { color: '#070C18', fontSize: 16, fontWeight: '800' },

  calcNote: {
    backgroundColor: '#0F1629',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1E2A42',
    marginBottom: 8,
  },
  calcNoteText: { fontSize: 12, color: '#64748B', lineHeight: 18, textAlign: 'center' },

  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F1629',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E2A42',
    marginTop: 10,
  },
  goalCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  goalColorDot: { width: 8, height: 8, borderRadius: 4 },
  goalCardLabel: { fontSize: 14, fontWeight: '600', color: '#94A3B8' },
  goalInputRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  goalInput: { fontSize: 22, fontWeight: '800', textAlign: 'right', minWidth: 60 },
  goalUnit: { fontSize: 11, color: '#475569' },

  btnRow: { flexDirection: 'row', gap: 10, marginTop: 28 },
  backBtn: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: '#0F1629',
    borderWidth: 1,
    borderColor: '#1E2A42',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: { fontSize: 15, color: '#64748B', fontWeight: '600' },
});
