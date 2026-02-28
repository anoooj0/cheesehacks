import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { CameraView, BarcodeScanningResult, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';

import { useApp } from '@/context/AppContext';
import { lookupNutritionByBarcode, NutritionLookupResponse, optimizeCart } from '@/services/api';

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

const PRIMARY = '#0a7ea4';

function formatValue(value: number | null, unit: string) {
  if (value == null) {
    return '--';
  }
  return `${value.toFixed(1)}${unit}`;
}

function hasNutritionData(values: NutritionLookupResponse['nutrition_per_serving']) {
  return Object.values(values).some((value) => value != null);
}

function NutritionRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.nutritionRow}>
      <Text style={styles.nutritionLabel}>{label}</Text>
      <Text style={styles.nutritionValue}>{value}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const {
    budget,
    setBudget,
    selectedStores,
    setSelectedStores,
    dietaryPreferences,
    setDietaryPreferences,
    numDays,
    setNumDays,
    setCartResult,
  } = useApp();

  const [loading, setLoading] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [barcode, setBarcode] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [nutrition, setNutrition] = useState<NutritionLookupResponse | null>(null);

  function toggleItem(id: string, list: string[], setList: (v: string[]) => void) {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
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
        numDays
      );
      setCartResult(result);
      router.push('/(tabs)/cart');
    } catch {
      Alert.alert('Error', 'Could not reach the server. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  }

  async function fetchNutrition(scannedBarcode: string) {
    try {
      setLookupLoading(true);
      const result = await lookupNutritionByBarcode(scannedBarcode);
      setNutrition(result);
    } catch {
      setNutrition(null);
      Alert.alert(
        'Nutrition lookup failed',
        'The barcode was scanned, but nutrition data was not found for this product.'
      );
    } finally {
      setLookupLoading(false);
    }
  }

  async function openScanner() {
    if (!permission?.granted) {
      const response = await requestPermission();
      if (!response.granted) {
        Alert.alert('Camera access required', 'Enable camera access to scan food barcodes.');
        return;
      }
    }

    setScannerVisible(true);
  }

  function closeScanner() {
    setScannerVisible(false);
  }

  async function handleBarcodeScanned(result: BarcodeScanningResult) {
    if (!scannerVisible) {
      return;
    }

    const scannedBarcode = result.data?.trim();
    if (!scannedBarcode) {
      return;
    }

    setScannerVisible(false);
    setBarcode(scannedBarcode);
    await fetchNutrition(scannedBarcode);
  }

  const nutritionFacts = nutrition && hasNutritionData(nutrition.nutrition_per_serving)
    ? nutrition.nutrition_per_serving
    : nutrition?.nutrition_per_100g ?? null;
  const servingLabel = nutrition && hasNutritionData(nutrition.nutrition_per_serving)
    ? nutrition.serving_size || 'per serving'
    : 'per 100g';

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Grocery Optimizer</Text>
          <Text style={styles.subtitle}>Eat smart. Spend smarter.</Text>
        </View>

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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nearby Stores</Text>
          <View style={styles.chipRow}>
            {STORES.map((store) => {
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dietary Preferences</Text>
          <View style={styles.chipRow}>
            {DIETARY_OPTIONS.map((opt) => {
              const selected = dietaryPreferences.includes(opt.id);
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() =>
                    toggleItem(opt.id, dietaryPreferences, setDietaryPreferences)
                  }>
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Meal Plan Duration</Text>
          <View style={styles.daysRow}>
            {[3, 5, 7, 14].map((d) => (
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

        <View style={styles.scanSection}>
          <Text style={styles.sectionTitle}>Scan Nutrition Label</Text>
          <Text style={styles.scanSubtitle}>
            Use your phone camera to scan a UPC or EAN barcode, then fetch nutrition facts
            from the backend.
          </Text>
          <TouchableOpacity style={styles.scanButton} onPress={openScanner}>
            <Text style={styles.scanButtonText}>Open Barcode Scanner</Text>
          </TouchableOpacity>

          {barcode ? (
            <Text style={styles.barcodeText}>Last barcode: {barcode}</Text>
          ) : null}

          {lookupLoading ? (
            <View style={styles.lookupLoading}>
              <ActivityIndicator color={PRIMARY} />
              <Text style={styles.lookupText}>Looking up nutrition data...</Text>
            </View>
          ) : null}

          {nutrition && nutritionFacts ? (
            <View style={styles.nutritionCard}>
              <Text style={styles.nutritionTitle}>
                {nutrition.product_name || 'Unknown product'}
              </Text>
              <Text style={styles.nutritionMeta}>
                {[nutrition.brand, nutrition.quantity].filter(Boolean).join(' • ') || nutrition.barcode}
              </Text>
              <Text style={styles.nutritionMeta}>Nutrition {servingLabel}</Text>
              <NutritionRow
                label="Calories"
                value={formatValue(nutritionFacts.calories, ' kcal')}
              />
              <NutritionRow
                label="Protein"
                value={formatValue(nutritionFacts.protein_g, ' g')}
              />
              <NutritionRow label="Carbs" value={formatValue(nutritionFacts.carbs_g, ' g')} />
              <NutritionRow label="Fat" value={formatValue(nutritionFacts.fat_g, ' g')} />
              <NutritionRow label="Fiber" value={formatValue(nutritionFacts.fiber_g, ' g')} />
              <NutritionRow label="Sugar" value={formatValue(nutritionFacts.sugars_g, ' g')} />
              <NutritionRow
                label="Sodium"
                value={formatValue(nutritionFacts.sodium_mg, ' mg')}
              />
            </View>
          ) : null}
        </View>
      </ScrollView>

      <Modal visible={scannerVisible} animationType="slide" onRequestClose={closeScanner}>
        <View style={styles.modalContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'],
            }}
            onBarcodeScanned={handleBarcodeScanned}
          />
          <View style={styles.cameraOverlay}>
            <View style={styles.scannerFrame} />
            <Text style={styles.cameraText}>Center the barcode inside the frame.</Text>
            <TouchableOpacity style={styles.closeButton} onPress={closeScanner}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

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
  scanSection: {
    marginTop: 28,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#d8e3e8',
  },
  scanSubtitle: {
    fontSize: 14,
    color: '#687076',
    lineHeight: 20,
    marginBottom: 16,
  },
  scanButton: {
    backgroundColor: '#11181C',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  scanButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  barcodeText: { marginTop: 14, color: '#334155', fontSize: 14 },
  lookupLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  lookupText: { color: '#334155', fontSize: 14 },
  nutritionCard: {
    marginTop: 18,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 10,
  },
  nutritionTitle: { fontSize: 18, fontWeight: '700', color: '#11181C' },
  nutritionMeta: { fontSize: 14, color: '#687076' },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nutritionLabel: { fontSize: 14, color: '#334155' },
  nutritionValue: { fontSize: 14, color: '#11181C', fontWeight: '600' },
  modalContainer: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  scannerFrame: {
    width: '88%',
    height: 180,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#fff',
    backgroundColor: 'transparent',
  },
  cameraText: {
    marginTop: 24,
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  closeButton: {
    marginTop: 24,
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  closeButtonText: { color: '#11181C', fontWeight: '700' },
});
