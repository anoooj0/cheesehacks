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

function ManualCartItemRow({
  name,
  storeName,
  unit,
  price,
  quantity,
  caloriesPer100g,
  proteinPer100g,
  carbsPer100g,
  fatPer100g,
  onAdd,
  onSubtract,
  onRemove,
}: {
  name: string;
  storeName: string;
  unit: string;
  price: number;
  quantity: number;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  onAdd: () => void;
  onSubtract: () => void;
  onRemove: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <Text style={styles.itemName}>{name}</Text>
        <Text style={styles.itemMeta}>{storeName} · {unit}</Text>
        <Text style={styles.itemMeta}>${(price * quantity).toFixed(2)} total</Text>
        {caloriesPer100g > 0 && (
          <Text style={styles.itemMacros}>
            {caloriesPer100g} cal · {proteinPer100g}g P · {carbsPer100g}g C · {fatPer100g}g F
            <Text style={styles.itemMacrosNote}> /100g</Text>
          </Text>
        )}
      </View>
      <View style={styles.qtyControls}>
        <TouchableOpacity style={styles.qtyBtn} onPress={onSubtract}>
          <Text style={styles.qtyBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.qtyValue}>{quantity}</Text>
        <TouchableOpacity style={styles.qtyBtn} onPress={onAdd}>
          <Text style={styles.qtyBtnText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.removeButton} onPress={onRemove}>
          <Text style={styles.removeText}>Remove</Text>
        </TouchableOpacity>
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
  const { cartResult, dietaryPreferences, numDays, setMealPlanResult, scannedItems, removeScannedItem, manualCartItems, removeManualItem, updateManualQty, incrementMealPlansGenerated } = useApp();
  const [loading, setLoading] = useState(false);

  const manualTotal = manualCartItems.reduce((s, e) => s + e.item.price * e.quantity, 0);
  const grandTotal = cartResult ? cartResult.total_cost : manualTotal;
  const totalItems = cartResult
    ? cartResult.cart.reduce((s, c) => s + c.quantity, 0)
    : manualCartItems.reduce((s, e) => s + e.quantity, 0) + scannedItems.length;

  async function handleGenerateMealPlan() {
    const manualAsCartItems: CartItem[] = manualCartItems.map((e) => ({
      item: e.item,
      quantity: e.quantity,
      total_cost: e.item.price * e.quantity,
    }));
    const cartItems = cartResult ? cartResult.cart : manualAsCartItems;
    if (cartItems.length === 0) return;
    try {
      setLoading(true);
      const result = await generateMealPlan(cartItems, dietaryPreferences, numDays);
      setMealPlanResult(result);
      incrementMealPlansGenerated();
      router.push('/(tabs)/meal-plan');
    } catch {
      Alert.alert('Error', 'Could not generate meal plan. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  }

  const isEmpty = !cartResult && scannedItems.length === 0 && manualCartItems.length === 0;

  if (isEmpty) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>🛒</Text>
        <Text style={styles.emptyText}>Your cart is empty</Text>
        <Text style={styles.emptySubtext}>
          Add items from the Home screen or scan a barcode on the Scan tab.
        </Text>
      </View>
    );
  }

  return (
    <>
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

      {/* Manual Cart Items */}
      {manualCartItems.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>My Cart</Text>
          {manualCartItems.map((entry) => (
            <ManualCartItemRow
              key={entry.item.id}
              name={entry.item.name}
              storeName={entry.item.store_name}
              unit={entry.item.unit}
              price={entry.item.price}
              quantity={entry.quantity}
              caloriesPer100g={entry.item.calories_per_unit}
              proteinPer100g={entry.item.protein_per_unit}
              carbsPer100g={entry.item.carbs_per_unit}
              fatPer100g={entry.item.fat_per_unit}
              onAdd={() => updateManualQty(entry.item.id, 1)}
              onSubtract={() => updateManualQty(entry.item.id, -1)}
              onRemove={() => removeManualItem(entry.item.id)}
            />
          ))}
          {!cartResult && (
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
          )}
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

      {/* bottom padding so content isn't hidden behind total bar */}
      <View style={{ height: 100 }} />
    </ScrollView>

    {/* Sticky total bar */}
    {!isEmpty && (
      <View style={styles.totalBar}>
        <View style={styles.totalBarInner}>
          <View>
            <Text style={styles.totalLabel}>{totalItems} item{totalItems !== 1 ? 's' : ''}</Text>
            <Text style={styles.totalAmount}>${grandTotal.toFixed(2)}</Text>
          </View>
          {!cartResult && manualCartItems.length > 0 && (
            <TouchableOpacity
              style={[styles.totalBtn, loading && styles.buttonDisabled]}
              onPress={handleGenerateMealPlan}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#070C18" />
              ) : (
                <Text style={styles.totalBtnText}>Generate Meal Plan</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    )}
  </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F1E' },
  content: { paddingBottom: 48 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: '#0A0F1E' },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 20, fontWeight: '700', color: '#E2E8F0' },
  emptySubtext: { fontSize: 14, color: '#64748B', marginTop: 6, textAlign: 'center' },

  banner: {
    flexDirection: 'row',
    backgroundColor: '#0F1629',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2A42',
  },
  bannerItem: { flex: 1, alignItems: 'center' },
  bannerValue: { fontSize: 22, fontWeight: '700', color: '#00E676' },
  savingsValue: { color: '#00E676' },
  bannerLabel: { fontSize: 12, color: '#64748B', marginTop: 2 },
  bannerDivider: { width: 1, backgroundColor: '#1E2A42', marginVertical: 4 },

  section: { padding: 16 },
  sectionHeader: { fontSize: 17, fontWeight: '700', color: '#E2E8F0', marginBottom: 12 },

  card: {
    flexDirection: 'row',
    backgroundColor: '#0F1629',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E2A42',
  },
  cardLeft: { flex: 1 },
  cardRight: { alignItems: 'flex-end' },
  itemName: { fontSize: 15, fontWeight: '600', color: '#E2E8F0' },
  itemMeta: { fontSize: 12, color: '#64748B', marginTop: 2 },
  itemMacros: { fontSize: 11, color: '#64748B', marginTop: 3 },
  itemMacrosNote: { fontSize: 9, color: '#475569' },
  itemPrice: { fontSize: 17, fontWeight: '700', color: '#00E676' },
  itemQty: { fontSize: 12, color: '#64748B', marginTop: 2 },

  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1E2A42',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: { fontSize: 16, color: '#E2E8F0', lineHeight: 18 },
  qtyValue: { fontSize: 15, fontWeight: '700', color: '#E2E8F0', minWidth: 20, textAlign: 'center' },

  removeButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E2A42',
    marginLeft: 4,
  },
  removeText: { fontSize: 11, color: '#64748B', fontWeight: '600' },

  button: {
    backgroundColor: '#00E676',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#070C18', fontSize: 17, fontWeight: '800' },

  totalBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0F1629',
    borderTopWidth: 1,
    borderTopColor: '#1E2A42',
    paddingHorizontal: 20,
    paddingVertical: 14,
    paddingBottom: 28,
  },
  totalBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLabel: { fontSize: 12, color: '#64748B' },
  totalAmount: { fontSize: 22, fontWeight: '800', color: '#00E676' },
  totalBtn: {
    backgroundColor: '#00E676',
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 18,
  },
  totalBtnText: { color: '#070C18', fontSize: 14, fontWeight: '800' },
});
