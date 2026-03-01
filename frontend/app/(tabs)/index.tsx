import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

import { useApp } from '@/context/AppContext';
import { getPrices, GroceryItem, getNearbyStores, StoreLocation } from '@/services/api';

const PRIMARY = '#00E676';
const DEFAULT_LAT = 43.0731;
const DEFAULT_LNG = -89.4012; // Madison, WI fallback

const FOOD_SECTIONS: Record<string, string[]> = {
  All: [],
  Proteins: ['chicken breast', 'ground beef', 'salmon', 'eggs', 'tuna', 'turkey', 'tofu', 'shrimp'],
  Produce: ['bananas', 'apples', 'spinach', 'broccoli', 'sweet potato', 'carrots', 'tomatoes', 'avocado', 'oranges', 'grapes'],
  Dairy: ['milk', 'greek yogurt', 'cheese', 'butter', 'cottage cheese'],
  Grains: ['brown rice', 'oats', 'bread', 'pasta', 'quinoa'],
  Pantry: ['black beans', 'peanut butter', 'olive oil', 'almonds', 'lentils'],
};

const SECTION_ICONS: Record<string, string> = {
  All: '⊞',
  Proteins: '🥩',
  Produce: '🥦',
  Dairy: '🥛',
  Grains: '🌾',
  Pantry: '🥫',
};

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function groupByCategory(items: GroceryItem[]): Record<string, GroceryItem[]> {
  const map: Record<string, GroceryItem[]> = {};
  for (const item of items) {
    const key = item.category || 'other';
    if (!map[key]) map[key] = [];
    map[key].push(item);
  }
  for (const key of Object.keys(map)) {
    map[key].sort((a, b) => a.price - b.price);
  }
  return map;
}

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function openDirections(store: StoreLocation) {
  const url =
    Platform.select({
      ios: `maps://app?daddr=${store.lat},${store.lng}`,
      android: `geo:${store.lat},${store.lng}?q=${encodeURIComponent(store.address)}`,
    }) ?? `https://www.google.com/maps/dir/?api=1&destination=${store.lat},${store.lng}`;
  Linking.openURL(url);
}

export default function HomeScreen() {
  const { addManualItem, manualCartItems, nutritionGoals } = useApp();

  const [prices, setPrices] = useState<GroceryItem[]>([]);
  const [pricesLoading, setPricesLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState('All');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [stores, setStores] = useState<StoreLocation[]>([]);
  const [storesLoading, setStoresLoading] = useState(true);

  useEffect(() => {
    getPrices()
      .then(setPrices)
      .catch(() => {})
      .finally(() => setPricesLoading(false));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        let lat = DEFAULT_LAT;
        let lng = DEFAULT_LNG;
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
          setUserLocation({ latitude: lat, longitude: lng });
        }
        const nearby = await getNearbyStores(lat, lng);
        setStores(nearby);
      } catch {
        // silently fall back to empty store list
      } finally {
        setStoresLoading(false);
      }
    })();
  }, []);

  const mapCenter = userLocation ?? { latitude: DEFAULT_LAT, longitude: DEFAULT_LNG };

  const grouped = groupByCategory(prices);
  const allCategories = Object.keys(grouped).sort();
  const sectionTerms = FOOD_SECTIONS[selectedSection] ?? [];
  const categories =
    selectedSection === 'All'
      ? allCategories
      : allCategories.filter((cat) => sectionTerms.includes(cat));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoEmoji}>🧀</Text>
          </View>
          <View>
            <Text style={styles.title}>NutriLens</Text>
            <Text style={styles.subtitle}>Smart Grocery · Madison WI</Text>
          </View>
        </View>
      </View>

      {/* ── Nearby Stores ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Nearby Stores</Text>

        {storesLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={PRIMARY} />
            <Text style={styles.loadingText}>Finding stores near you...</Text>
          </View>
        ) : stores.length === 0 ? (
          <Text style={styles.emptyNote}>No stores found nearby</Text>
        ) : (
          <>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: mapCenter.latitude,
                longitude: mapCenter.longitude,
                latitudeDelta: 0.06,
                longitudeDelta: 0.06,
              }}>
              {userLocation && (
                <Marker
                  coordinate={userLocation}
                  title="You are here"
                  pinColor="#00E676"
                />
              )}
              {stores.map((store) => (
                <Marker
                  key={store.id}
                  coordinate={{ latitude: store.lat, longitude: store.lng }}
                  title={store.name}
                  description={store.address}
                />
              ))}
            </MapView>

            <View style={styles.storeList}>
              {stores.map((store, idx) => {
                const dist = userLocation
                  ? haversineMiles(userLocation.latitude, userLocation.longitude, store.lat, store.lng)
                  : null;
                return (
                  <View key={store.id} style={[styles.storeRow, idx > 0 && styles.storeRowBorder]}>
                    <View style={styles.storeRowLeft}>
                      <View style={styles.storeNameRow}>
                        <Text style={styles.storeIcon}>🏪</Text>
                        <Text style={styles.storeName} numberOfLines={1}>{store.name}</Text>
                      </View>
                      <Text style={styles.storeAddress} numberOfLines={2}>{store.address}</Text>
                      {dist != null && (
                        <Text style={styles.storeDist}>{dist.toFixed(1)} mi away</Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.dirBtn}
                      onPress={() => openDirections(store)}
                      activeOpacity={0.8}>
                      <Text style={styles.dirBtnText}>Directions</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </View>

      {/* ── Price Comparison ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Price Comparison</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.storeTabs}>
          {Object.keys(FOOD_SECTIONS).map((section) => (
            <TouchableOpacity
              key={section}
              style={[styles.storeTab, selectedSection === section && styles.storeTabSelected]}
              onPress={() => { setSelectedSection(section); setExpandedCategory(null); }}>
              <Text style={[styles.storeTabText, selectedSection === section && styles.storeTabTextSelected]}>
                {SECTION_ICONS[section]} {section}
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
                        {item.calories_per_unit > 0 && (
                          <Text style={styles.itemMacros}>
                            {item.calories_per_unit} cal · {item.protein_per_unit}g P · {item.carbs_per_unit}g C · {item.fat_per_unit}g F
                            <Text style={styles.itemMacrosNote}> /100g</Text>
                          </Text>
                        )}
                        {nutritionGoals && item.calories_per_unit > 0 && (
                          <View style={styles.coverageRow}>
                            {[
                              { pct: Math.round(item.calories_per_unit / nutritionGoals.calories * 100), label: 'Cal', color: '#FF6B35', bg: 'rgba(255,107,53,0.12)' },
                              { pct: Math.round(item.protein_per_unit / nutritionGoals.protein_g * 100), label: 'Pro', color: '#00B4D8', bg: 'rgba(0,180,216,0.12)' },
                              { pct: Math.round(item.carbs_per_unit / nutritionGoals.carbs_g * 100), label: 'Carb', color: '#A78BFA', bg: 'rgba(167,139,250,0.12)' },
                              { pct: Math.round(item.fat_per_unit / nutritionGoals.fat_g * 100), label: 'Fat', color: '#FCD34D', bg: 'rgba(252,211,77,0.12)' },
                            ].map(({ pct, label, color, bg }) => (
                              <View key={label} style={[styles.coveragePill, { backgroundColor: bg }]}>
                                <Text style={[styles.coverageText, { color }]}>{label} {pct}%</Text>
                              </View>
                            ))}
                          </View>
                        )}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F1E' },
  content: { padding: 20, paddingBottom: 48 },

  header: { marginBottom: 24, marginTop: 12 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(0,230,118,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: { fontSize: 22 },
  title: { fontSize: 20, fontWeight: '800', color: '#E2E8F0', letterSpacing: -0.5 },
  subtitle: { fontSize: 12, color: '#64748B', marginTop: 1 },

  section: {
    backgroundColor: '#0F1629',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E2A42',
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#E2E8F0', marginBottom: 12 },

  // Map
  map: {
    width: '100%',
    height: 210,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },

  // Store list
  storeList: { gap: 0 },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  storeRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#1E2A42',
  },
  storeRowLeft: { flex: 1, gap: 3 },
  storeNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  storeIcon: { fontSize: 14 },
  storeName: { fontSize: 14, fontWeight: '700', color: '#E2E8F0', flex: 1 },
  storeAddress: { fontSize: 12, color: '#64748B', lineHeight: 16 },
  storeDist: { fontSize: 11, color: '#00E676', fontWeight: '600', marginTop: 1 },
  dirBtn: {
    backgroundColor: 'rgba(0,230,118,0.12)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.3)',
    marginLeft: 10,
  },
  dirBtnText: { fontSize: 12, color: '#00E676', fontWeight: '700' },

  // Price comparison
  storeTabs: { marginBottom: 12 },
  storeTab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#1E2A42',
    marginRight: 8,
    backgroundColor: '#12183A',
  },
  storeTabSelected: { backgroundColor: '#00E676', borderColor: '#00E676' },
  storeTabText: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  storeTabTextSelected: { color: '#070C18' },

  emptyNote: { fontSize: 14, color: '#64748B', marginTop: 8, textAlign: 'center' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  loadingText: { fontSize: 14, color: '#64748B' },

  categoryBlock: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E2A42',
    marginBottom: 8,
    overflow: 'hidden',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#12183A',
  },
  categoryLeft: { flex: 1 },
  categoryName: { fontSize: 14, fontWeight: '700', color: '#E2E8F0', textTransform: 'capitalize' },
  categoryBest: { fontSize: 12, color: '#00E676', marginTop: 2, fontWeight: '600' },
  categoryRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bestBadge: {
    backgroundColor: 'rgba(0,230,118,0.12)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.25)',
  },
  bestBadgeText: { fontSize: 11, color: '#00E676', fontWeight: '600' },
  chevron: { fontSize: 11, color: '#64748B' },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#1A2238',
    backgroundColor: '#0F1629',
  },
  priceRowBest: { backgroundColor: 'rgba(0,230,118,0.06)' },
  priceRowLeft: { flex: 1, gap: 2 },
  cheapestTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#00E676',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginBottom: 3,
  },
  cheapestTagText: { fontSize: 9, color: '#070C18', fontWeight: '700', letterSpacing: 0.5 },
  itemName: { fontSize: 13, fontWeight: '600', color: '#E2E8F0' },
  itemMeta: { fontSize: 11, color: '#64748B' },
  itemMacros: { fontSize: 10, color: '#64748B', marginTop: 2 },
  itemMacrosNote: { fontSize: 9, color: '#475569' },
  priceRowRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemPrice: { fontSize: 15, fontWeight: '700', color: '#94A3B8' },
  itemPriceBest: { color: '#00E676' },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#00E676',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { color: '#070C18', fontSize: 20, lineHeight: 22, fontWeight: '700' },
  qtyBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FF6B35',
    borderRadius: 8,
    minWidth: 16,
    paddingHorizontal: 3,
    alignItems: 'center',
  },
  qtyBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },

  coverageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 5 },
  coveragePill: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  coverageText: { fontSize: 10, fontWeight: '700' },
});
