import { Ionicons } from "@expo/vector-icons";
import { collection, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../constants/firebase";
import { useLanguage } from "../constants/langcontext";
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
  operator?: string;
  schedule?: string;
};

export default function RoutesScreen() {
  const { language } = useLanguage();
  const { colors } = useTheme();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "routes"));
      console.log("Number of docs: ", querySnapshot.size);
      const data: Route[] = [];
      querySnapshot.forEach((doc) => {
        console.log(doc.id, doc.data());
        data.push({ id: doc.id, ...doc.data() } as Route);
      });
      data.sort((a, b) => a.name.localeCompare(b.name));
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
    { key: "P2P", label: "P2P" },
  ];

  const filteredRoutes =
    selectedType === "all"
      ? routes
      : routes.filter((r) => r.type === selectedType);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "jeepney":
        return "bus";
      case "ejeepney":
        return "flash";
      case "p2p":
        return "car";
      default:
        return "bus";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.heading }]}>
          {language === "en" ? "Routes" : "Mga Ruta"}
        </Text>
        <Text style={[styles.subtitle, { color: colors.subtitle }]}>
          {language === "en"
            ? "Browse available routes"
            : "I-browse ang mga available na ruta"}
        </Text>
      </View>

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
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
            onPress={() => setSelectedType(filter.key)}
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

      {/* Routes List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.heading} />
          <Text style={[styles.loadingText, { color: colors.subtitle }]}>
            {language === "en"
              ? "Loading routes..."
              : "Naglo-load ng mga ruta..."}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
        >
          {filteredRoutes.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="bus-outline" size={60} color="#333" />
              <Text style={[styles.emptyText, { color: colors.subtitle }]}>
                {language === "en"
                  ? "No routes found"
                  : "Walang nahanap na ruta"}
              </Text>
            </View>
          ) : (
            filteredRoutes.map((route) => (
              <TouchableOpacity
                key={route.id}
                style={[
                  styles.routeCard,
                  {
                    backgroundColor: colors.cardSecondary,
                    borderLeftColor: getTypeColor(route.type),
                  },
                ]}
                onPress={() =>
                  setExpandedId(expandedId === route.id ? null : route.id)
                }
              >
                {/* Route Header */}
                <View style={styles.routeHeader}>
                  <View style={styles.routeLeft}>
                    <View
                      style={[
                        styles.typeIcon,
                        { backgroundColor: getTypeColor(route.type) + "33" },
                      ]}
                    >
                      <Ionicons
                        name={getTypeIcon(route.type) as any}
                        size={18}
                        color={getTypeColor(route.type)}
                      />
                    </View>
                    <View style={styles.routeInfo}>
                      <Text style={[styles.routeName, { color: colors.text }]}>
                        {route.name}
                      </Text>
                      <Text
                        style={[styles.routeMeta, { color: colors.subtitle }]}
                      >
                        ₱{route.fare} · {route.duration}
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name={
                      expandedId === route.id ? "chevron-up" : "chevron-down"
                    }
                    size={20}
                    color={colors.subtitle}
                  />
                </View>

                {/* Expanded Stops */}
                {expandedId === route.id && (
                  <View style={styles.stopsContainer}>
                    <Text
                      style={[styles.stopsTitle, { color: colors.subtitle }]}
                    >
                      {language === "en" ? "Stops:" : "Mga Hinto:"}
                    </Text>
                    {route.stops &&
                      route.stops.map((stop, index) => (
                        <View key={index} style={styles.stopRow}>
                          <View
                            style={[
                              styles.stopDot,
                              {
                                backgroundColor:
                                  index === 0
                                    ? "#4caf50"
                                    : index === route.stops.length - 1
                                      ? "#e94560"
                                      : colors.subtitle,
                              },
                            ]}
                          />
                          <Text
                            style={[styles.stopText, { color: colors.text }]}
                          >
                            {stop.name}
                          </Text>
                        </View>
                      ))}
                    {route.operator && (
                      <Text
                        style={[
                          styles.operatorText,
                          { color: colors.subtitle },
                        ]}
                      >
                        🚌 {route.operator}
                      </Text>
                    )}
                    {route.schedule && (
                      <Text
                        style={[
                          styles.operatorText,
                          { color: colors.subtitle },
                        ]}
                      >
                        🕐 {route.schedule}
                      </Text>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 24, paddingTop: 40 },
  title: { fontSize: 32, fontWeight: "bold" },
  subtitle: { fontSize: 14, marginTop: 4 },
  filterRow: { maxHeight: 50 },
  filterContent: { paddingHorizontal: 24, gap: 8 },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterText: { fontSize: 13, fontWeight: "600" },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { fontSize: 14 },
  list: { flex: 1 },
  listContent: { padding: 24, gap: 12, paddingBottom: 40 },
  emptyState: { alignItems: "center", marginTop: 80, gap: 12 },
  emptyText: { fontSize: 16 },
  routeCard: {
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
  },
  routeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  routeLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  typeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  routeInfo: { flex: 1 },
  routeName: { fontSize: 14, fontWeight: "bold" },
  routeMeta: { fontSize: 12, marginTop: 2 },
  stopsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#333",
    gap: 8,
  },
  stopsTitle: { fontSize: 12, fontWeight: "600", marginBottom: 4 },
  stopRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  stopDot: { width: 8, height: 8, borderRadius: 4 },
  stopText: { fontSize: 13 },
  operatorText: { fontSize: 12, marginTop: 4 },
});
