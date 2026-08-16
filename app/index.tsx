import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLanguage } from "../constants/langcontext";
import {
  deleteRecentTrip,
  getRecentTrips,
  type RecentTrip,
} from "../constants/recentTrips";
import { useTheme } from "../constants/ThemeContext";

export default function HomeScreen() {
  const { t, language, toggleLanguage } = useLanguage();
  const { theme, toggleTheme, colors } = useTheme();
  const [recentTrips, setRecentTrips] = useState<RecentTrip[]>([]);

  const loadRecentTrips = useCallback(() => {
    getRecentTrips().then(setRecentTrips);
  }, []);

  // Refresh every time the Home screen comes back into focus, so a trip
  // selected on the Map screen shows up here right away.
  useFocusEffect(
    useCallback(() => {
      loadRecentTrips();
    }, [loadRecentTrips]),
  );

  const handleDeleteRecentTrip = async (id: string) => {
    const updated = await deleteRecentTrip(id);
    setRecentTrips(updated);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t.morning;
    if (hour < 18) return t.afternoon;
    return t.evening;
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={[styles.greeting, { color: colors.subtitle }]}>
            {getGreeting()}
          </Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={toggleTheme}
            >
              <Ionicons
                name={theme === "dark" ? "sunny" : "moon"}
                size={16}
                color={colors.heading}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={toggleLanguage}
            >
              <Text style={[styles.langToggleText, { color: colors.text }]}>
                {language === "en" ? "🇵🇭" : "🇬🇧"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={[styles.title, { color: colors.heading }]}>Pasada</Text>
        <Text style={[styles.subtitle, { color: colors.subtitle }]}>
          {t.app}
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={[
            styles.searchInput,
            { backgroundColor: colors.input, color: colors.text },
          ]}
          placeholder={t.search}
          placeholderTextColor={colors.placeholder}
        />
        <TouchableOpacity
          style={[styles.searchButton, { backgroundColor: colors.heading }]}
        >
          <Text style={styles.searchButtonText}>Go</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {t.quick_actions}
      </Text>
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: colors.card }]}
          onPress={() => router.push("/planner")}
        >
          <View style={[styles.iconCircle, { borderColor: colors.cardBorder }]}>
            <Ionicons name="map" size={28} color={colors.heading} />
          </View>
          <Text style={[styles.actionText, { color: colors.text }]}>
            {t.plan}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: colors.card }]}
          onPress={() => router.push("/routes")}
        >
          <View style={[styles.iconCircle, { borderColor: colors.cardBorder }]}>
            <Ionicons name="bus" size={28} color={colors.heading} />
          </View>
          <Text style={[styles.actionText, { color: colors.text }]}>
            {t.routes}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: colors.card }]}
          onPress={() =>
            router.push({ pathname: "/map", params: { nearMe: "true" } })
          }
        >
          <View style={[styles.iconCircle, { borderColor: colors.cardBorder }]}>
            <Ionicons name="location" size={28} color={colors.heading} />
          </View>
          <Text style={[styles.actionText, { color: colors.text }]}>
            {t.near_me}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: colors.card }]}
          onPress={() => router.push("/compare")}
        >
          <View style={[styles.iconCircle, { borderColor: colors.cardBorder }]}>
            <Ionicons name="wallet" size={28} color={colors.heading} />
          </View>
          <Text style={[styles.actionText, { color: colors.text }]}>
            {t.compare}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {t.recents}
      </Text>
      {recentTrips.length === 0 ? (
        <View
          style={[
            styles.recentEmptyState,
            { backgroundColor: colors.cardSecondary },
          ]}
        >
          <Ionicons name="time-outline" size={22} color={colors.subtitle} />
          <Text style={[styles.recentEmptyText, { color: colors.subtitle }]}>
            {language === "en"
              ? "No recent trips yet — pick a route on the map to get started."
              : "Wala pang recent na biyahe — pumili ng ruta sa mapa para magsimula."}
          </Text>
        </View>
      ) : (
        recentTrips.map((trip) => (
          <View
            key={trip.id}
            style={[
              styles.recentCard,
              {
                backgroundColor: colors.cardSecondary,
                borderLeftColor: colors.heading,
              },
            ]}
          >
            <View style={styles.recentCardContent}>
              <Text style={[styles.recentRoute, { color: colors.text }]}>
                {trip.origin} → {trip.destination}
              </Text>
              <Text style={[styles.recentDetails, { color: colors.subtitle }]}>
                {trip.detail}
                {typeof trip.fare === "number" ? ` · ₱${trip.fare}` : ""}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.recentDeleteButton}
              onPress={() => handleDeleteRecentTrip(trip.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={18} color="#e94560" />
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 24, paddingTop: 30 },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  greeting: { fontSize: 14 },
  toggleRow: { flexDirection: "row", gap: 8 },
  toggleButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  langToggleText: { fontSize: 14 },
  title: { fontSize: 42, fontWeight: "bold" },
  subtitle: { fontSize: 14, marginTop: 4 },
  searchContainer: {
    flexDirection: "row",
    marginHorizontal: 24,
    marginBottom: 24,
  },
  searchInput: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginRight: 10,
  },
  searchButton: {
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  searchButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginHorizontal: 24,
    marginBottom: 12,
  },
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: 24,
    gap: 12,
    marginBottom: 24,
  },
  actionCard: {
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    width: "45%",
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: { fontSize: 14, fontWeight: "600", marginTop: 8 },
  recentCard: {
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 24,
    marginBottom: 12,
    borderLeftWidth: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  recentCardContent: { flex: 1 },
  recentRoute: { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  recentDetails: { fontSize: 13 },
  recentDeleteButton: { padding: 4 },
  recentEmptyState: {
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 24,
    marginBottom: 12,
    alignItems: "center",
    gap: 8,
  },
  recentEmptyText: { fontSize: 13, textAlign: "center" },
});
