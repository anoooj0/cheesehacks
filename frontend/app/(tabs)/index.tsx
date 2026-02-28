import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { optimizeCart } from '@/services/api';

const STORES = [
  { id: 'walmart', label: 'Walmart' },
  { id: 'kroger', label: 'Kroger' },
  { id: 'aldi', label: 'Aldi' },
  { id: 'target', label: 'Target' },
];

const DIETARY_OPTIONS = [
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'gluten-free', label: 'Gluten-Free' },
  { id: 'dairy-free', label: 'Dairy-Free' },
];

export default function HomeScreen() {
  const router = useRouter();
  const {
    budget, setBudget,
    selectedStores, setSelectedStores,
    dietaryPreferences, setDietaryPreferences,
    numDays, setNumDays,
    setCartResult,
  } = useApp();

  const [loading, setLoading] = useState(false);

  function toggleItem(id: string, list: string[], setList: (v: string[]) => void) {
    setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
  }

  async function handleOptimize() {
    if (!budget || parseFloat(budget) <= 0) {
      Alert.alert('Enter a valid budget');
      return;
    }
    if (selectedStores.length === 0) {
      Alert.alert('Select at least one store');
      return;
    }
    try {
      setLoading(true);
      const result = await optimizeCart(
        parseFloat(budget),
        selectedStores,
        dietaryPreferences,
        numDays,
      );
      setCartResult(result);
      router.push('/(tabs)/cart');
    } catch {
      Alert.alert('Error', 'Could not reach the server. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Grocery Optimizer</Text>
        <Text style={styles.subtitle}>Eat smart. Spend smarter.</Text>
      </View>

      {/* Budget */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Weekly Budget</Text>
        <View style={styles.inputRow}>
          <Text style={styles.dollar}>$</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            placeholderTextColor="#999"
            keyboardType="decimal-pad"
            value={budget}
            onChangeText={setBudget}
          />
        </View>
      </View>

      {/* Stores */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Nearby Stores</Text>
        <View style={styles.chipRow}>
          {STORES.map(store => {
            const selected = selectedStores.includes(store.id);
            return (
              <TouchableOpacity
                key={store.id}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => toggleItem(store.id, selectedStores, setSelectedStores)}>
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {store.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Dietary Preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dietary Preferences</Text>
        <View style={styles.chipRow}>
          {DIETARY_OPTIONS.map(opt => {
            const selected = dietaryPreferences.includes(opt.id);
            return (
              <TouchableOpacity
                key={opt.id}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => toggleItem(opt.id, dietaryPreferences, setDietaryPreferences)}>
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Number of Days */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Meal Plan Duration</Text>
        <View style={styles.daysRow}>
          {[3, 5, 7, 14].map(d => (
            <TouchableOpacity
              key={d}
              style={[styles.dayChip, numDays === d && styles.chipSelected]}
              onPress={() => setNumDays(d)}>
              <Text style={[styles.chipText, numDays === d && styles.chipTextSelected]}>
                {d} days
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* CTA */}
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleOptimize}
        disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Optimize My Cart</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const PRIMARY = '#0a7ea4';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  content: { padding: 24, paddingBottom: 48 },
  header: { marginBottom: 32, marginTop: 16 },
  title: { fontSize: 28, fontWeight: '700', color: '#11181C' },
  subtitle: { fontSize: 15, color: '#687076', marginTop: 4 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#11181C', marginBottom: 12 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    paddingHorizontal: 16,
  },
  dollar: { fontSize: 20, color: '#11181C', marginRight: 4 },
  input: { flex: 1, fontSize: 20, paddingVertical: 14, color: '#11181C' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  daysRow: { flexDirection: 'row', gap: 10 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  dayChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  chipSelected: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  chipText: { fontSize: 14, color: '#11181C', fontWeight: '500' },
  chipTextSelected: { color: '#fff' },
  button: {
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
