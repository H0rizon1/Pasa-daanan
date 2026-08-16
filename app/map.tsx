import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useLocalSearchParams } from "expo-router";
import { collection, getDocs } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, Polyline, Region } from "react-native-maps";
import { db } from "../constants/firebase";
import { useLanguage } from "../constants/langcontext";
import { addRecentTrip } from "../constants/recentTrips";
import { useTheme } from "../constants/ThemeContext";

type Stop = {
  name: string;
  lat: number | null;
  lng: number | null;
};

type Route = {
  id: string;
  name: string;
  type: string;
  fare: number;
  duration: string;
  stops: Stop[];
  path?: { lat: number; lng: number }[];
  operator?: string;
  schedule?: string;
};

const MAKATI_REGION = {
  latitude: 14.5547,
  longitude: 121.0244,
  latitudeDelta: 0.06,
  longitudeDelta: 0.06,
};

type StopWithRoute = {
  stop: Stop;
  route: Route;
  isFirst: boolean;
  isLast: boolean;
};

type StopCluster = {
  key: string;
  latitude: number;
  longitude: number;
  count: number;
  items: StopWithRoute[];
};

const buildStopClusters = (
  stopsWithRoute: StopWithRoute[],
  region: Region,
): StopCluster[] => {
  const cellSize = Math.max(region.latitudeDelta * 0.12, 0.0008);
  const buckets = new Map<string, StopCluster>();

  stopsWithRoute.forEach((entry) => {
    const lat = entry.stop.lat as number;
    const lng = entry.stop.lng as number;
    const cellX = Math.round(lng / cellSize);
    const cellY = Math.round(lat / cellSize);
    const key = `${cellX}_${cellY}`;

    const existing = buckets.get(key);
    if (existing) {
      const newCount = existing.count + 1;
      existing.latitude = (existing.latitude * existing.count + lat) / newCount;
      existing.longitude =
        (existing.longitude * existing.count + lng) / newCount;
      existing.count = newCount;
      existing.items.push(entry);
    } else {
      buckets.set(key, {
        key,
        latitude: lat,
        longitude: lng,
        count: 1,
        items: [entry],
      });
    }
  });

  return Array.from(buckets.values());
};

const distanceMeters = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) => {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export default function MapScreen() {
  const { language } = useLanguage();
  const { colors } = useTheme();
  const { nearMe } = useLocalSearchParams<{ nearMe?: string }>();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState("all");
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [mapRef, setMapRef] = useState<MapView | null>(null);
  const [locating, setLocating] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [currentRegion, setCurrentRegion] = useState<Region>(MAKATI_REGION);
  const autoTriggered = useRef(false);

  useEffect(() => {
    fetchRoutes();
  }, []);

  useEffect(() => {
    if (nearMe === "true" && !autoTriggered.current) {
      autoTriggered.current = true;
      handleLocateMe();
    }
  }, [nearMe]);

  const handleLocateMe = async () => {
    try {
      setLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          language === "en"
            ? "Location permission needed"
            : "Kailangan ang pahintulot sa lokasyon",
          language === "en"
            ? "Enable location access to find stops near you."
            : "Paganahin ang location access para makita ang malapit na himpilan.",
        );
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setUserLocation(coords);
      mapRef?.animateToRegion(
        { ...coords, latitudeDelta: 0.02, longitudeDelta: 0.02 },
        600,
      );
    } catch (error) {
      console.error("Error getting location: ", error);
      Alert.alert(
        language === "en"
          ? "Couldn't get your location"
          : "Hindi makuha ang lokasyon",
        language === "en"
          ? "Please check that location services are turned on."
          : "Paki-check kung naka-on ang location services.",
      );
    } finally {
      setLocating(false);
    }
  };

  const allStopsWithRoute = routes.flatMap((route) =>
    (route.stops || [])
      .filter(
        (s) =>
          typeof s?.lat === "number" &&
          typeof s?.lng === "number" &&
          isFinite(s.lat) &&
          isFinite(s.lng),
      )
      .map((s) => ({ stop: s, route })),
  );

  const nearbyStops = userLocation
    ? allStopsWithRoute
        .map(({ stop, route }) => ({
          stop,
          route,
          distance: distanceMeters(
            userLocation.latitude,
            userLocation.longitude,
            stop.lat as number,
            stop.lng as number,
          ),
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5)
    : [];

  const fetchRoutes = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "routes"));
      const data: Route[] = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Route);
      });
      setRoutes(data);
    } catch (error) {
      console.error("Error fetching routes: ", error);
    } finally {
      setLoading(false);
    }
  };

  const filters = [
    { key: "all", label: language === "en" ? "All" : "Lahat" },
    { key: "jeepney", label: "Jeepney" },
    { key: "ejeepney", label: "E-Jeepney" },
    { key: "p2p", label: "P2P" },
  ];

  const filteredRoutes =
    selectedType === "all"
      ? routes
      : routes.filter(
          (r) => r.type?.toLowerCase() === selectedType.toLowerCase(),
        );

  const getTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case "jeepney":
        return "#FF8C42";
      case "ejeepney":
        return "#4caf50";
      case "p2p":
        return "#5ba3e0";
      default:
        return "#FF8C42";
    }
  };

  const validStops = (route: Route) =>
    (route.stops || []).filter(
      (s) =>
        typeof s?.lat === "number" &&
        typeof s?.lng === "number" &&
        isFinite(s.lat) &&
        isFinite(s.lng),
    );

  const getDrawablePath = (route: Route) => {
    const validPath = (route.path || []).filter(
      (p) =>
        typeof p?.lat === "number" &&
        typeof p?.lng === "number" &&
        isFinite(p.lat) &&
        isFinite(p.lng),
    );
    if (validPath.length >= 2) {
      return validPath.map((p) => ({ latitude: p.lat, longitude: p.lng }));
    }
    return validStops(route).map((s) => ({
      latitude: s.lat as number,
      longitude: s.lng as number,
    }));
  };

  const handleSelectRoute = (route: Route) => {
    const isDeselecting = selectedRouteId === route.id;
    setSelectedRouteId(isDeselecting ? null : route.id);

    if (!isDeselecting && mapRef) {
      const stops = validStops(route);
      if (stops.length > 0) {
        mapRef.fitToCoordinates(
          stops.map((s) => ({
            latitude: s.lat as number,
            longitude: s.lng as number,
          })),
          {
            edgePadding: { top: 80, right: 80, bottom: 80, left: 80 },
            animated: true,
          },
        );

        addRecentTrip({
          origin: stops[0].name,
          destination: stops[stops.length - 1].name,
          detail: route.name,
          fare: route.fare,
        }).catch((error) =>
          console.error("Error logging recent trip: ", error),
        );
      }
    }
  };

  const routesToDraw = selectedRouteId
    ? filteredRoutes.filter((r) => r.id === selectedRouteId)
    : filteredRoutes;

  const overviewStopsWithRoute: StopWithRoute[] = !selectedRouteId
    ? routesToDraw.flatMap((route) => {
        const stops = validStops(route);
        return stops.map((stop, index) => ({
          stop,
          route,
          isFirst: index === 0,
          isLast: index === stops.length - 1,
        }));
      })
    : [];

  const stopClusters = !selectedRouteId
    ? buildStopClusters(overviewStopsWithRoute, currentRegion)
    : [];

  const handleClusterPress = (cluster: StopCluster) => {
    if (!mapRef) return;
    mapRef.animateToRegion(
      {
        latitude: cluster.latitude,
        longitude: cluster.longitude,
        latitudeDelta: Math.max(currentRegion.latitudeDelta / 3, 0.002),
        longitudeDelta: Math.max(currentRegion.longitudeDelta / 3, 0.002),
      },
      400,
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.mapWrapper}>
        <MapView
          ref={setMapRef}
          style={styles.map}
          initialRegion={MAKATI_REGION}
          onRegionChangeComplete={setCurrentRegion}
        >
          {routesToDraw.map((route) => {
            const stops = validStops(route);
            if (stops.length < 2) return null;

            const color = getTypeColor(route.type);
            const drawablePath = getDrawablePath(route);

            return (
              <Polyline
                key={route.id}
                coordinates={drawablePath}
                strokeColor={color}
                strokeWidth={4}
              />
            );
          })}

          {selectedRouteId &&
            routesToDraw.map((route) => {
              const stops = validStops(route);
              const color = getTypeColor(route.type);
              return stops.map((stop, index) => (
                <Marker
                  key={`${route.id}-${index}`}
                  coordinate={{
                    latitude: stop.lat as number,
                    longitude: stop.lng as number,
                  }}
                  title={stop.name}
                  description={route.name}
                  pinColor={
                    index === 0
                      ? "#4caf50"
                      : index === stops.length - 1
                        ? "#e94560"
                        : color
                  }
                />
              ));
            })}

          {!selectedRouteId &&
            stopClusters.map((cluster) => {
              if (cluster.count === 1) {
                const { stop, route, isFirst, isLast } = cluster.items[0];
                const color = getTypeColor(route.type);
                return (
                  <Marker
                    key={cluster.key}
                    coordinate={{
                      latitude: cluster.latitude,
                      longitude: cluster.longitude,
                    }}
                    title={stop.name}
                    description={route.name}
                    pinColor={isFirst ? "#4caf50" : isLast ? "#e94560" : color}
                  />
                );
              }
              return (
                <Marker
                  key={cluster.key}
                  coordinate={{
                    latitude: cluster.latitude,
                    longitude: cluster.longitude,
                  }}
                  onPress={() => handleClusterPress(cluster)}
                >
                  <View
                    style={[
                      styles.clusterBadge,
                      { borderColor: colors.background },
                    ]}
                  >
                    <Text style={styles.clusterBadgeText}>{cluster.count}</Text>
                  </View>
                </Marker>
              );
            })}

          {userLocation && (
            <Marker
              coordinate={userLocation}
              title={language === "en" ? "You are here" : "Narito ka"}
              pinColor="#5ba3e0"
            />
          )}
        </MapView>

        {loading && (
          <View style={styles.mapLoadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}

        <TouchableOpacity
          style={styles.locateButton}
          onPress={handleLocateMe}
          disabled={locating}
        >
          {locating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="locate" size={22} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {userLocation && nearbyStops.length > 0 && (
        <View
          style={[styles.nearbyPanel, { backgroundColor: colors.background }]}
        >
          <Text style={[styles.nearbyTitle, { color: colors.text }]}>
            {language === "en" ? "Stops near you" : "Malapit na himpilan"}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContent}
          >
            {nearbyStops.map(({ stop, route, distance }, index) => (
              <TouchableOpacity
                key={`${route.id}-${stop.name}-${index}`}
                style={[
                  styles.nearbyCard,
                  { backgroundColor: colors.cardSecondary },
                ]}
                onPress={() => handleSelectRoute(route)}
              >
                <Text
                  style={[styles.nearbyStopName, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {stop.name}
                </Text>
                <Text style={[styles.nearbyMeta, { color: colors.subtitle }]}>
                  {route.name} · {Math.round(distance)}m
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.filterRow, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.filterContent}
      >
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterButton,
              {
                backgroundColor:
                  selectedType === filter.key
                    ? colors.heading
                    : colors.cardSecondary,
              },
            ]}
            onPress={() => {
              setSelectedType(filter.key);
              setSelectedRouteId(null);
            }}
          >
            <Text
              style={[
                styles.filterText,
                {
                  color: selectedType === filter.key ? "#fff" : colors.subtitle,
                },
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.routeRow, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.filterContent}
      >
        {filteredRoutes.map((route) => (
          <TouchableOpacity
            key={route.id}
            style={[
              styles.routeChip,
              {
                backgroundColor: colors.cardSecondary,
                borderColor:
                  selectedRouteId === route.id
                    ? getTypeColor(route.type)
                    : "transparent",
              },
            ]}
            onPress={() => handleSelectRoute(route)}
          >
            <Ionicons
              name="bus"
              size={14}
              color={getTypeColor(route.type)}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[styles.routeChipText, { color: colors.text }]}
              numberOfLines={1}
            >
              {route.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapWrapper: { flex: 1 },
  map: { width: "100%", height: "100%" },
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  filterRow: { maxHeight: 50, flexGrow: 0 },
  routeRow: {
    maxHeight: 50,
    flexGrow: 0,
    borderTopWidth: 1,
    borderTopColor: "#222",
  },
  filterContent: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterText: { fontSize: 13, fontWeight: "600" },
  routeChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    maxWidth: 200,
  },
  routeChipText: { fontSize: 12, fontWeight: "600" },
  clusterBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#e94560",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  clusterBadgeText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  locateButton: {
    position: "absolute",
    bottom: 16,
    right: 16,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#1a1a2e",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  nearbyPanel: {
    borderTopWidth: 1,
    borderTopColor: "#222",
    paddingTop: 10,
  },
  nearbyTitle: {
    fontSize: 13,
    fontWeight: "bold",
    marginHorizontal: 16,
    marginBottom: 6,
  },
  nearbyCard: {
    borderRadius: 12,
    padding: 12,
    minWidth: 140,
    maxWidth: 180,
  },
  nearbyStopName: { fontSize: 13, fontWeight: "700" },
  nearbyMeta: { fontSize: 11, marginTop: 4 },
});
