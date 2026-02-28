import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { generateMealPlan, CartItem, NutritionLookupResponse } from '@/services/api';

const PRIMARY = '#0a7ea4';
const GREEN = '#2e7d32';

function OptimizedCartItem({ item }: { item: CartItem }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <Text style={styles.itemName}>{item.item.name}</Text>
        <Text style={styles.itemMeta}>{item.item.store_name} · {item.item.unit}</Text>
        <Text style={styles.itemMeta}>
          {item.item.calories_per_unit} cal · {item.item.protein_per_unit}g protein
        </Text>
      </View>
      <View style={styles.cardRight}>
        <Text style={styles.itemPrice}>${item.total_cost.toFixed(2)}</Text>
        <Text style={styles.itemQty}>qty: {item.quantity}</Text>
      </View>
    </View>
  );
}

function ScannedCartItem({
  item,
  onRemove,
}: {
  item: NutritionLookupResponse;
  onRemove: () => void;
}) {
  const facts = Object.values(item.nutrition_per_serving).some((v) => v != null)
    ? item.nutrition_per_serving
    : item.nutrition_per_100g;

  return (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <Text style={styles.itemName}>{item.product_name || 'Unknown product'}</Text>
        <Text style={styles.itemMeta}>
          {[item.brand, item.quantity].filter(Boolean).join(' · ') || item.barcode}
        </Text>
        {facts.calories != null && (
          <Text style={styles.itemMeta}>{facts.calories.toFixed(0)} kcal</Text>
        )}
      </View>
      <TouchableOpacity onPress={onRemove} style={styles.removeButton}>
        <Text style={styles.removeText}>Remove</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function CartScreen() {
  const router = useRouter();
  const { cartResult, dietaryPreferences, numDays, setMealPlanResult, scannedItems, removeScannedItem } = useApp();
  const [loading, setLoading] = useState(false);

  async function handleGenerateMealPlan() {
    if (!cartResult) return;
    try {
      setLoading(true);
      const result = await generateMealPlan(cartResult.cart, dietaryPreferences, numDays);
      setMealPlanResult(result);
      router.push('/(tabs)/meal-plan');
    } catch {
      Alert.alert('Error', 'Could not generate meal plan. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  }

  const isEmpty = !cartResult && scannedItems.length === 0;

  if (isEmpty) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>🛒</Text>
        <Text style={styles.emptyText}>Your cart is empty</Text>
        <Text style={styles.emptySubtext}>
          Scan a barcode on the Home screen to add items.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Summary Banner (only when optimized cart exists) */}
      {cartResult && (
        <View style={styles.banner}>
          <View style={styles.bannerItem}>
            <Text style={styles.bannerValue}>${cartResult.total_cost.toFixed(2)}</Text>
            <Text style={styles.bannerLabel}>Total</Text>
          </View>
          <View style={styles.bannerDivider} />
          <View style={styles.bannerItem}>
            <Text style={[styles.bannerValue, styles.savingsValue]}>
              ${cartResult.total_savings.toFixed(2)}
            </Text>
            <Text style={styles.bannerLabel}>Saved</Text>
          </View>
          <View style={styles.bannerDivider} />
          <View style={styles.bannerItem}>
            <Text style={styles.bannerValue}>{cartResult.cart.length}</Text>
            <Text style={styles.bannerLabel}>Items</Text>
          </View>
        </View>
      )}

      {/* Scanned Items */}
      {scannedItems.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Scanned Items</Text>
          {scannedItems.map((item, i) => (
            <ScannedCartItem
              key={`${item.barcode}-${i}`}
              item={item}
              onRemove={() => removeScannedItem(item.barcode)}
            />
          ))}
        </View>
      )}

      {/* Optimized Cart Items */}
      {cartResult && (
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Optimized Cart</Text>
          {cartResult.cart.map((item, i) => (
            <OptimizedCartItem key={i} item={item} />
          ))}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleGenerateMealPlan}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Generate Meal Plan</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  content: { paddingBottom: 48 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 20, fontWeight: '700', color: '#11181C' },
  emptySubtext: { fontSize: 14, color: '#687076', marginTop: 6, textAlign: 'center' },

  banner: {
    flexDirection: 'row',
    backgroundColor: PRIMARY,
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  bannerItem: { flex: 1, alignItems: 'center' },
  bannerValue: { fontSize: 22, fontWeight: '700', color: '#fff' },
  savingsValue: { color: '#a5d6a7' },
  bannerLabel: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  bannerDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.3)', marginVertical: 4 },

  section: { padding: 16 },
  sectionHeader: { fontSize: 17, fontWeight: '700', color: '#11181C', marginBottom: 12 },

  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cardLeft: { flex: 1 },
  cardRight: { alignItems: 'flex-end' },
  itemName: { fontSize: 15, fontWeight: '600', color: '#11181C' },
  itemMeta: { fontSize: 12, color: '#687076', marginTop: 2 },
  itemPrice: { fontSize: 17, fontWeight: '700', color: PRIMARY },
  itemQty: { fontSize: 12, color: '#687076', marginTop: 2 },

  removeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  removeText: { fontSize: 12, color: '#687076', fontWeight: '600' },

  button: {
    backgroundColor: GREEN,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
