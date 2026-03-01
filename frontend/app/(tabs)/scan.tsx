import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CameraView, BarcodeScanningResult, useCameraPermissions } from 'expo-camera';
import { useApp } from '@/context/AppContext';
import { lookupNutritionByBarcode, NutritionLookupResponse } from '@/services/api';

const PRIMARY = '#00E676';

function formatValue(value: number | null, unit: string) {
  if (value == null) return '—';
  return `${value.toFixed(1)}${unit}`;
}

function hasNutritionData(facts: NutritionLookupResponse['nutrition_per_serving']) {
  return Object.values(facts).some((v) => v != null);
}

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const { addScannedItem } = useApp();

  const [scannerVisible, setScannerVisible] = useState(false);
  const [barcode, setBarcode] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [nutrition, setNutrition] = useState<NutritionLookupResponse | null>(null);

  // Use refs for values read inside the native camera callback to avoid
  // stale closure issues (the React Compiler may memoize the callback with
  // old state values, so refs give us a synchronous, always-current source).
  const scannerActiveRef = React.useRef(false);
  const scanLock = React.useRef(false);

  async function openScanner() {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert('Camera access required', 'Enable camera access to scan barcodes.');
        return;
      }
    }
    scannerActiveRef.current = true;
    setScannerVisible(true);
  }

  function closeScanner() {
    scannerActiveRef.current = false;
    setScannerVisible(false);
  }

  async function handleBarcodeScanned(result: BarcodeScanningResult) {
    if (!scannerActiveRef.current || scanLock.current) return;
    const scanned = result.data?.trim();
    if (!scanned) return;

    scanLock.current = true;
    closeScanner();
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
        {/* Scanner Area */}
        <View style={styles.scannerArea}>
          <Text style={styles.scannerLabel}>BARCODE SCANNER</Text>

          {/* Scan frame */}
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
            <Text style={styles.scanFrameHint}>Point camera at barcode</Text>
          </View>

          {barcode && !lookupLoading && (
            <Text style={styles.barcodeText}>Scanned: {barcode}</Text>
          )}

          {lookupLoading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={PRIMARY} />
              <Text style={styles.loadingText}>Looking up nutrition...</Text>
            </View>
          )}

          <TouchableOpacity style={styles.openCameraBtn} onPress={openScanner} activeOpacity={0.85}>
            <Text style={styles.openCameraBtnText}>Open Camera</Text>
          </TouchableOpacity>
        </View>

        {/* Nutrition Result */}
        {nutrition && nutritionFacts && (
          <View style={styles.resultCard}>
            {/* Product image */}
            {nutrition.image_url ? (
              <Image
                source={{ uri: nutrition.image_url }}
                style={styles.productImage}
                resizeMode="cover"
              />
            ) : null}

            <Text style={styles.productName}>
              {nutrition.product_name || 'Unknown product'}
            </Text>
            <Text style={styles.productMeta}>
              {[nutrition.brand, nutrition.quantity].filter(Boolean).join(' · ') || nutrition.barcode}
            </Text>
            <Text style={styles.servingLabel}>Nutrition {servingLabel}</Text>

            {/* Macro highlights */}
            <View style={styles.macroRow}>
              {[
                { label: 'Calories', value: nutritionFacts.calories?.toFixed(0) ?? '—', unit: 'kcal', color: '#FF6B35' },
                { label: 'Protein', value: nutritionFacts.protein_g?.toFixed(1) ?? '—', unit: 'g', color: '#00B4D8' },
                { label: 'Carbs', value: nutritionFacts.carbs_g?.toFixed(1) ?? '—', unit: 'g', color: '#FF6B35' },
                { label: 'Fat', value: nutritionFacts.fat_g?.toFixed(1) ?? '—', unit: 'g', color: '#A78BFA' },
              ].map(({ label, value, unit, color }) => (
                <View key={label} style={styles.macroBox}>
                  <Text style={[styles.macroValue, { color }]}>{value}</Text>
                  <Text style={styles.macroUnit}>{unit}</Text>
                  <Text style={styles.macroLabel}>{label}</Text>
                </View>
              ))}
            </View>

            {/* Detailed rows */}
            <View style={styles.detailSection}>
              {(
                [
                  ['Fiber', formatValue(nutritionFacts.fiber_g, ' g')],
                  ['Sugar', formatValue(nutritionFacts.sugars_g, ' g')],
                  ['Sodium', formatValue(nutritionFacts.sodium_mg, ' mg')],
                ] as [string, string][]
              ).map(([label, value]) => (
                <View key={label} style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{label}</Text>
                  <Text style={styles.detailValue}>{value}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.addButton} onPress={handleAddToCart}>
              <Text style={styles.addButtonText}>+ Add to Cart</Text>
            </TouchableOpacity>
          </View>
        )}
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
            <View style={styles.cameraFrame}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            <Text style={styles.cameraHint}>Center the barcode inside the frame</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setScannerVisible(false)}>
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const CORNER_SIZE = 24;
const CORNER_THICKNESS = 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F1E' },
  content: { padding: 20, paddingBottom: 48 },

  scannerArea: {
    backgroundColor: '#0F1629',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E2A42',
  },
  scannerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00E676',
    letterSpacing: 2,
    marginBottom: 24,
  },
  scanFrame: {
    width: 220,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  scanFrameHint: { fontSize: 13, color: '#475569', textAlign: 'center' },

  // Corner brackets
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: '#00E676',
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS, borderTopLeftRadius: 6 },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS, borderTopRightRadius: 6 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS, borderBottomRightRadius: 6 },

  barcodeText: { fontSize: 12, color: '#64748B', marginBottom: 12 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  loadingText: { fontSize: 14, color: '#64748B' },

  openCameraBtn: {
    backgroundColor: '#00E676',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 40,
    shadowColor: '#00E676',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  openCameraBtnText: { color: '#070C18', fontSize: 15, fontWeight: '800' },

  // Result card
  resultCard: {
    backgroundColor: '#0F1629',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E2A42',
  },
  productImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#12183A',
  },
  productName: { fontSize: 18, fontWeight: '700', color: '#E2E8F0', marginBottom: 4 },
  productMeta: { fontSize: 13, color: '#64748B', marginBottom: 2 },
  servingLabel: { fontSize: 12, color: '#475569', marginBottom: 16 },

  macroRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  macroBox: {
    flex: 1,
    backgroundColor: '#12183A',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E2A42',
  },
  macroValue: { fontSize: 18, fontWeight: '800' },
  macroUnit: { fontSize: 10, color: '#64748B', marginTop: 1 },
  macroLabel: { fontSize: 10, color: '#94A3B8', marginTop: 2 },

  detailSection: {
    borderTopWidth: 1,
    borderTopColor: '#1E2A42',
    paddingTop: 12,
    gap: 8,
    marginBottom: 16,
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailLabel: { fontSize: 14, color: '#94A3B8' },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#E2E8F0' },

  addButton: {
    backgroundColor: '#00E676',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addButtonText: { color: '#070C18', fontSize: 15, fontWeight: '800' },

  // Camera modal
  modalContainer: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  cameraFrame: {
    width: '88%',
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  cameraHint: { color: '#E2E8F0', fontSize: 15, textAlign: 'center', marginBottom: 24 },
  closeButton: {
    backgroundColor: '#00E676',
    borderRadius: 999,
    paddingHorizontal: 32,
    paddingVertical: 13,
  },
  closeButtonText: { color: '#070C18', fontWeight: '700', fontSize: 15 },
});
