import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { generateMealPlan, CartItem } from '@/services/api';

export default function CartScreen() {
  const router = useRouter();
  const { cartResult, dietaryPreferences, numDays, setMealPlanResult } = useApp();
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

  if (!cartResult) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>🛒</Text>
        <Text style={styles.emptyText}>No cart yet</Text>
        <Text style={styles.emptySubtext}>Go to Home and optimize your cart first.</Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: CartItem }) => (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <Text style={styles.itemName}>{item.item.name}</Text>
        <Text style={styles.itemMeta}>
          {item.item.store_name} · {item.item.unit}
        </Text>
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

  return (
    <View style={styles.container}>
      {/* Summary Banner */}
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

      <FlatList
        data={cartResult.cart}
        keyExtractor={(_, i) => i.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<Text style={styles.listHeader}>Your Optimized Cart</Text>}
        ListFooterComponent={
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
        }
      />
    </View>
  );
}

const PRIMARY = '#0a7ea4';
const GREEN = '#2e7d32';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
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
  list: { padding: 16, paddingBottom: 48 },
  listHeader: { fontSize: 18, fontWeight: '700', color: '#11181C', marginBottom: 12 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cardLeft: { flex: 1 },
  cardRight: { alignItems: 'flex-end', justifyContent: 'center' },
  itemName: { fontSize: 15, fontWeight: '600', color: '#11181C' },
  itemMeta: { fontSize: 12, color: '#687076', marginTop: 2 },
  itemPrice: { fontSize: 17, fontWeight: '700', color: PRIMARY },
  itemQty: { fontSize: 12, color: '#687076', marginTop: 2 },
  button: {
    backgroundColor: GREEN,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
