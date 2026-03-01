import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Callout, Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { getNearbyStores, StoreLocation } from '@/services/api';

const PRIMARY = '#00E676';

// Default to Madison, WI (where Metro Market is)
const DEFAULT_REGION: Region = {
  latitude: 43.0731,
  longitude: -89.4012,
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
};

export default function StoresScreen() {
  const mapRef = useRef<MapView>(null);
  const [stores, setStores] = useState<StoreLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selected, setSelected] = useState<StoreLocation | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // Request location permission
        const { status } = await Location.requestForegroundPermissionsAsync();
        let lat = DEFAULT_REGION.latitude;
        let lng = DEFAULT_REGION.longitude;

        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
          setUserLocation({ latitude: lat, longitude: lng });

          // Fly to user location
          mapRef.current?.animateToRegion({
            latitude: lat,
            longitude: lng,
            latitudeDelta: 0.15,
            longitudeDelta: 0.15,
          }, 800);
        }

        const data = await getNearbyStores(lat, lng);
        setStores(data);
      } catch (e) {
        setError('Could not load store locations.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function flyToUser() {
    if (!userLocation) return;
    mapRef.current?.animateToRegion({
      ...userLocation,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    }, 600);
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={DEFAULT_REGION}
        showsUserLocation
        showsMyLocationButton={false}>

        {stores.map((store) => (
          <Marker
            key={store.id}
            coordinate={{ latitude: store.lat, longitude: store.lng }}
            pinColor={PRIMARY}
            onPress={() => setSelected(store)}>
            <Callout tooltip={false}>
              <View style={styles.callout}>
                <Text style={styles.calloutName}>{store.name}</Text>
                <Text style={styles.calloutAddress}>{store.address}</Text>
                {store.phone && <Text style={styles.calloutPhone}>{store.phone}</Text>}
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nearby Stores</Text>
        {loading && <ActivityIndicator color={PRIMARY} style={{ marginLeft: 8 }} />}
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>

      {/* Locate me button */}
      {userLocation && (
        <TouchableOpacity style={styles.locateBtn} onPress={flyToUser} activeOpacity={0.8}>
          <Text style={styles.locateBtnText}>⊕ My Location</Text>
        </TouchableOpacity>
      )}

      {/* Store count pill */}
      {!loading && stores.length > 0 && (
        <View style={styles.countPill}>
          <Text style={styles.countText}>{stores.length} store{stores.length !== 1 ? 's' : ''} found</Text>
        </View>
      )}

      {/* Bottom card for selected store */}
      {selected && (
        <View style={styles.detailCard}>
          <View style={styles.detailLeft}>
            <Text style={styles.detailName}>{selected.name}</Text>
            <Text style={styles.detailAddress}>{selected.address}</Text>
            {selected.phone && <Text style={styles.detailPhone}>{selected.phone}</Text>}
          </View>
          <TouchableOpacity onPress={() => setSelected(null)} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  header: {
    position: 'absolute',
    top: 56,
    left: 16,
    right: 16,
    backgroundColor: '#0F1629',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E2A42',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#E2E8F0', flex: 1 },
  errorText: { fontSize: 12, color: '#FF6B35', marginLeft: 8 },

  locateBtn: {
    position: 'absolute',
    top: 116,
    right: 16,
    backgroundColor: '#0F1629',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#1E2A42',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  locateBtnText: { fontSize: 13, fontWeight: '600', color: '#00E676' },

  countPill: {
    position: 'absolute',
    top: 116,
    left: 16,
    backgroundColor: 'rgba(0,230,118,0.15)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.3)',
  },
  countText: { fontSize: 12, color: '#00E676', fontWeight: '600' },

  callout: { width: 200, padding: 4 },
  calloutName: { fontSize: 14, fontWeight: '700', color: '#11181C', marginBottom: 2 },
  calloutAddress: { fontSize: 12, color: '#687076' },
  calloutPhone: { fontSize: 12, color: '#0a7ea4', marginTop: 2 },

  detailCard: {
    position: 'absolute',
    bottom: 32,
    left: 16,
    right: 16,
    backgroundColor: '#0F1629',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#1E2A42',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  detailLeft: { flex: 1 },
  detailName: { fontSize: 16, fontWeight: '700', color: '#E2E8F0' },
  detailAddress: { fontSize: 13, color: '#64748B', marginTop: 3 },
  detailPhone: { fontSize: 13, color: '#00E676', marginTop: 3 },
  closeBtn: { padding: 4, marginLeft: 8 },
  closeBtnText: { fontSize: 16, color: '#64748B' },
});
