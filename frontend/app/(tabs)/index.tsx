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
  'metro-market': 'Metro Market',
};

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatValue(value: number | null, unit: string) {
  if (value == null) return '--';
  return `${value.toFixed(1)}${unit}`;
}

function hasNutritionData(facts: NutritionLookupResponse['nutrition_per_serving']) {
  return Object.values(facts).some((v) => v != null);
}

/** Group flat list by category, sort each group cheapest first */
function groupByCategory(items: GroceryItem[]): Record<string, GroceryItem[]> {
  const map: Record<string, GroceryItem[]> = {};
  for (const item of items) {
    const key = item.category || 'other';
    if (!map[key]) map[key] = [];
    map[key].push(item);
  }
  // Sort each group cheapest first
  for (const key of Object.keys(map)) {
    map[key].sort((a, b) => a.price - b.price);
  }
  return map;
}

export default function HomeScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const { addScannedItem, mealPlanResult, addManualItem, manualCartItems } = useApp();

  const [prices, setPrices] = useState<GroceryItem[]>([]);
  const [pricesLoading, setPricesLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState('all');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const [scannerVisible, setScannerVisible] = useState(false);
  const [barcode, setBarcode] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [nutrition, setNutrition] = useState<NutritionLookupResponse | null>(null);
  const scanLock = React.useRef(false);

  useEffect(() => {
    getPrices()
      .then(setPrices)
      .catch(() => {})
      .finally(() => setPricesLoading(false));
  }, []);

  const stores = ['all', ...Array.from(new Set(prices.map((p) => p.store_id)))];
  const filteredPrices =
    selectedStore === 'all' ? prices : prices.filter((p) => p.store_id === selectedStore);

  const grouped = groupByCategory(filteredPrices);
  const categories = Object.keys(grouped).sort();

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
    if (!scannerVisible || scanLock.current) return;
    const scanned = result.data?.trim();
    if (!scanned) return;

    scanLock.current = true;
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
      scanLock.current = false;
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
          <Text style={styles.subtitle}>Compare prices. Eat smart. Spend smarter.</Text>
        </View>

        {/* ── Store Prices ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price Comparison</Text>

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
            <View style={styles.loadingRow}>
              <ActivityIndicator color={PRIMARY} />
              <Text style={styles.loadingText}>Loading live prices...</Text>
            </View>
          ) : categories.length === 0 ? (
            <Text style={styles.emptyNote}>No items available</Text>
          ) : (
            categories.map((cat) => {
              const items = grouped[cat];
              const cheapest = items[0];
              const isExpanded = expandedCategory === cat;

              return (
                <View key={cat} style={styles.categoryBlock}>
                  {/* Category header — shows cheapest price */}
                  <TouchableOpacity
                    style={styles.categoryRow}
                    onPress={() => setExpandedCategory(isExpanded ? null : cat)}
                    activeOpacity={0.7}>
                    <View style={styles.categoryLeft}>
                      <Text style={styles.categoryName}>{capitalize(cat)}</Text>
                      <Text style={styles.categoryBest}>
                        Best: ${cheapest.price.toFixed(2)} · {cheapest.store_name}
                      </Text>
                    </View>
                    <View style={styles.categoryRight}>
                      <View style={styles.bestBadge}>
                        <Text style={styles.bestBadgeText}>
                          {items.length} option{items.length !== 1 ? 's' : ''}
                        </Text>
                      </View>
                      <Text style={styles.chevron}>{isExpanded ? '▲' : '▼'}</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Expanded: all options sorted cheapest first */}
                  {isExpanded && items.map((item, i) => {
                    const cartQty = manualCartItems.find((e) => e.item.id === item.id)?.quantity ?? 0;
                    return (
                      <View key={item.id} style={[styles.priceRow, i === 0 && styles.priceRowBest]}>
                        <View style={styles.priceRowLeft}>
                          {i === 0 && (
                            <View style={styles.cheapestTag}>
                              <Text style={styles.cheapestTagText}>BEST</Text>
                            </View>
                          )}
                          <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                          <Text style={styles.itemMeta}>{item.store_name} · {item.unit}</Text>
                        </View>
                        <View style={styles.priceRowRight}>
                          <Text style={[styles.itemPrice, i === 0 && styles.itemPriceBest]}>
                            ${item.price.toFixed(2)}
                          </Text>
                          <TouchableOpacity
                            style={styles.addBtn}
                            onPress={() => addManualItem(item)}
                            activeOpacity={0.7}>
                            <Text style={styles.addBtnText}>+</Text>
                            {cartQty > 0 && (
                              <View style={styles.qtyBadge}>
                                <Text style={styles.qtyBadgeText}>{cartQty}</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              );
            })
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
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#11181C', marginBottom: 12 },
  sectionSub: { fontSize: 13, color: '#687076', marginBottom: 14, lineHeight: 18 },

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

  emptyNote: { fontSize: 14, color: '#687076', marginTop: 8, textAlign: 'center' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  loadingText: { fontSize: 14, color: '#687076' },

  // Category accordion
  categoryBlock: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e8edf2',
    marginBottom: 8,
    overflow: 'hidden',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9fafb',
  },
  categoryLeft: { flex: 1 },
  categoryName: { fontSize: 14, fontWeight: '700', color: '#11181C', textTransform: 'capitalize' },
  categoryBest: { fontSize: 12, color: GREEN, marginTop: 2, fontWeight: '600' },
  categoryRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bestBadge: {
    backgroundColor: '#e0f2fe',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  bestBadgeText: { fontSize: 11, color: PRIMARY, fontWeight: '600' },
  chevron: { fontSize: 11, color: '#687076' },

  // Price rows inside expanded category
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  priceRowBest: { backgroundColor: '#f0fdf4' },
  priceRowLeft: { flex: 1, gap: 2 },
  cheapestTag: {
    alignSelf: 'flex-start',
    backgroundColor: GREEN,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginBottom: 3,
  },
  cheapestTagText: { fontSize: 9, color: '#fff', fontWeight: '700', letterSpacing: 0.5 },
  itemName: { fontSize: 13, fontWeight: '600', color: '#11181C' },
  itemMeta: { fontSize: 11, color: '#687076' },
  priceRowRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemPrice: { fontSize: 15, fontWeight: '700', color: PRIMARY },
  itemPriceBest: { color: GREEN },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 20, lineHeight: 22, fontWeight: '700' },
  qtyBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: GREEN,
    borderRadius: 8,
    minWidth: 16,
    paddingHorizontal: 3,
    alignItems: 'center',
  },
  qtyBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },

  scanButton: {
    backgroundColor: '#11181C',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  scanButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  barcodeText: { marginTop: 10, fontSize: 13, color: '#687076' },

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
