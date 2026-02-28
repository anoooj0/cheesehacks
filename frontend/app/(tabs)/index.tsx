import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CameraView, BarcodeScanningResult, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';

import { useApp } from '@/context/AppContext';
import { getPrices, lookupNutritionByBarcode, GroceryItem, NutritionLookupResponse } from '@/services/api';

const PRIMARY = '#0a7ea4';
const GREEN = '#2e7d32';

const STORE_LABELS: Record<string, string> = {
  all: 'All Stores',
  walmart: 'Walmart',
  kroger: 'Kroger',
  aldi: 'Aldi',
  target: 'Target',
};

function formatValue(value: number | null, unit: string) {
  if (value == null) return '--';
  return `${value.toFixed(1)}${unit}`;
}

function hasNutritionData(facts: NutritionLookupResponse['nutrition_per_serving']) {
  return Object.values(facts).some((v) => v != null);
}

export default function HomeScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const { addScannedItem, mealPlanResult } = useApp();

  // Store prices
  const [prices, setPrices] = useState<GroceryItem[]>([]);
  const [pricesLoading, setPricesLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState('all');

  // Barcode scanner
  const [scannerVisible, setScannerVisible] = useState(false);
  const [barcode, setBarcode] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [nutrition, setNutrition] = useState<NutritionLookupResponse | null>(null);

  useEffect(() => {
    getPrices()
      .then(setPrices)
      .catch(() => {})
      .finally(() => setPricesLoading(false));
  }, []);

  const stores = ['all', ...Array.from(new Set(prices.map((p) => p.store_id)))];
  const filteredPrices =
    selectedStore === 'all' ? prices : prices.filter((p) => p.store_id === selectedStore);

  async function openScanner() {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert('Camera access required', 'Enable camera access to scan barcodes.');
        return;
      }
    }
    setScannerVisible(true);
  }

  async function handleBarcodeScanned(result: BarcodeScanningResult) {
    if (!scannerVisible) return;
    const scanned = result.data?.trim();
    if (!scanned) return;

    setScannerVisible(false);
    setBarcode(scanned);
    setNutrition(null);

    try {
      setLookupLoading(true);
      const data = await lookupNutritionByBarcode(scanned);
      setNutrition(data);
    } catch {
      Alert.alert('Not found', 'No nutrition data found for this barcode.');
    } finally {
      setLookupLoading(false);
    }
  }

  function handleAddToCart() {
    if (!nutrition) return;
    addScannedItem(nutrition);
    Alert.alert('Added', `${nutrition.product_name || 'Item'} added to cart.`);
    setNutrition(null);
    setBarcode(null);
  }

  const nutritionFacts =
    nutrition && hasNutritionData(nutrition.nutrition_per_serving)
      ? nutrition.nutrition_per_serving
      : nutrition?.nutrition_per_100g ?? null;
  const servingLabel =
    nutrition && hasNutritionData(nutrition.nutrition_per_serving)
      ? nutrition.serving_size || 'per serving'
      : 'per 100g';

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Grocery Optimizer</Text>
          <Text style={styles.subtitle}>Eat smart. Spend smarter.</Text>
        </View>

        {/* ── Store Prices ── */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Store Prices</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Kroger API soon</Text>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.storeTabs}>
            {stores.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.storeTab, selectedStore === s && styles.storeTabSelected]}
                onPress={() => setSelectedStore(s)}>
                <Text style={[styles.storeTabText, selectedStore === s && styles.storeTabTextSelected]}>
                  {STORE_LABELS[s] ?? s}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {pricesLoading ? (
            <ActivityIndicator color={PRIMARY} style={{ marginTop: 16 }} />
          ) : filteredPrices.length === 0 ? (
            <Text style={styles.emptyNote}>No items available</Text>
          ) : (
            filteredPrices.slice(0, 8).map((item, i) => (
              <View key={i} style={styles.priceRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemMeta}>{item.store_name} · {item.unit}</Text>
                </View>
                <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
              </View>
            ))
          )}
        </View>

        {/* ── Barcode Scanner ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scan a Product</Text>
          <Text style={styles.sectionSub}>
            Scan a UPC or EAN barcode to look up nutrition facts and add it to your cart.
          </Text>

          <TouchableOpacity style={styles.scanButton} onPress={openScanner}>
            <Text style={styles.scanButtonText}>Open Barcode Scanner</Text>
          </TouchableOpacity>

          {barcode && <Text style={styles.barcodeText}>Barcode: {barcode}</Text>}

          {lookupLoading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={PRIMARY} />
              <Text style={styles.loadingText}>Looking up nutrition...</Text>
            </View>
          )}

          {nutrition && nutritionFacts && (
            <View style={styles.nutritionCard}>
              <Text style={styles.nutritionTitle}>
                {nutrition.product_name || 'Unknown product'}
              </Text>
              <Text style={styles.nutritionMeta}>
                {[nutrition.brand, nutrition.quantity].filter(Boolean).join(' · ') || nutrition.barcode}
              </Text>
              <Text style={styles.nutritionMeta}>Nutrition {servingLabel}</Text>

              {(
                [
                  ['Calories', formatValue(nutritionFacts.calories, ' kcal')],
                  ['Protein', formatValue(nutritionFacts.protein_g, ' g')],
                  ['Carbs', formatValue(nutritionFacts.carbs_g, ' g')],
                  ['Fat', formatValue(nutritionFacts.fat_g, ' g')],
                  ['Fiber', formatValue(nutritionFacts.fiber_g, ' g')],
                  ['Sugar', formatValue(nutritionFacts.sugars_g, ' g')],
                  ['Sodium', formatValue(nutritionFacts.sodium_mg, ' mg')],
                ] as [string, string][]
              ).map(([label, value]) => (
                <View key={label} style={styles.nutritionRow}>
                  <Text style={styles.nutritionLabel}>{label}</Text>
                  <Text style={styles.nutritionValue}>{value}</Text>
                </View>
              ))}

              <TouchableOpacity style={styles.addButton} onPress={handleAddToCart}>
                <Text style={styles.addButtonText}>+ Add to Cart</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Meal Plan ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Meal Plan</Text>
          {mealPlanResult ? (
            <View style={styles.mealPlanCard}>
              <Text style={styles.mealPlanTitle}>
                {mealPlanResult.meal_plan.length}-Day Plan Active
              </Text>
              <Text style={styles.mealPlanMeta}>
                Est. total: ${mealPlanResult.total_cost.toFixed(2)}
              </Text>
              <TouchableOpacity
                style={styles.viewPlanButton}
                onPress={() => router.push('/(tabs)/meal-plan')}>
                <Text style={styles.viewPlanText}>View Full Plan</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.mealPlanCard}>
              <Text style={styles.mealPlanMeta}>No meal plan yet.</Text>
              <Text style={[styles.mealPlanMeta, { marginBottom: 12 }]}>
                Go to Cart and tap "Generate Meal Plan".
              </Text>
              <TouchableOpacity
                style={styles.viewPlanButton}
                onPress={() => router.push('/(tabs)/cart')}>
                <Text style={styles.viewPlanText}>Go to Cart</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Camera Modal */}
      <Modal
        visible={scannerVisible}
        animationType="slide"
        onRequestClose={() => setScannerVisible(false)}>
        <View style={styles.modalContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
            onBarcodeScanned={handleBarcodeScanned}
          />
          <View style={styles.cameraOverlay}>
            <View style={styles.scanFrame} />
            <Text style={styles.cameraHint}>Center the barcode inside the frame</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setScannerVisible(false)}>
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
  content: { padding: 20, paddingBottom: 48 },
  header: { marginBottom: 28, marginTop: 12 },
  title: { fontSize: 28, fontWeight: '700', color: '#11181C' },
  subtitle: { fontSize: 15, color: '#687076', marginTop: 4 },

  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e8edf2',
  },
  sectionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#11181C', flex: 1 },
  sectionSub: { fontSize: 13, color: '#687076', marginBottom: 14, lineHeight: 18 },

  badge: {
    backgroundColor: '#fff3e0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 11, color: '#e65100', fontWeight: '600' },

  storeTabs: { marginBottom: 12 },
  storeTab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    marginRight: 8,
    backgroundColor: '#f9f9f9',
  },
  storeTabSelected: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  storeTabText: { fontSize: 13, color: '#687076', fontWeight: '500' },
  storeTabTextSelected: { color: '#fff' },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemName: { fontSize: 14, fontWeight: '600', color: '#11181C' },
  itemMeta: { fontSize: 12, color: '#687076', marginTop: 2 },
  itemPrice: { fontSize: 15, fontWeight: '700', color: PRIMARY },
  emptyNote: { fontSize: 14, color: '#687076', marginTop: 8, textAlign: 'center' },

  scanButton: {
    backgroundColor: '#11181C',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  scanButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  barcodeText: { marginTop: 10, fontSize: 13, color: '#687076' },

  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  loadingText: { fontSize: 14, color: '#687076' },

  nutritionCard: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e8edf2',
    gap: 8,
  },
  nutritionTitle: { fontSize: 17, fontWeight: '700', color: '#11181C' },
  nutritionMeta: { fontSize: 13, color: '#687076' },
  nutritionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  nutritionLabel: { fontSize: 14, color: '#334155' },
  nutritionValue: { fontSize: 14, fontWeight: '600', color: '#11181C' },

  addButton: {
    backgroundColor: GREEN,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  mealPlanCard: { gap: 6 },
  mealPlanTitle: { fontSize: 15, fontWeight: '700', color: '#11181C' },
  mealPlanMeta: { fontSize: 13, color: '#687076' },
  viewPlanButton: {
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  viewPlanText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Camera
  modalContainer: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  scanFrame: {
    width: '88%',
    height: 180,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#fff',
    backgroundColor: 'transparent',
  },
  cameraHint: { marginTop: 24, color: '#fff', fontSize: 15, textAlign: 'center' },
  closeButton: {
    marginTop: 24,
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  closeButtonText: { color: '#11181C', fontWeight: '700' },
});
