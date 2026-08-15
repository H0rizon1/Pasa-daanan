import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLanguage } from "../constants/langcontext";
import { useTheme } from "../constants/ThemeContext";

export default function HomeScreen() {
  const { t, language, toggleLanguage } = useLanguage();
  const { theme, toggleTheme, colors } = useTheme();

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
      <View
        style={[
          styles.recentCard,
          {
            backgroundColor: colors.cardSecondary,
            borderLeftColor: colors.heading,
          },
        ]}
      >
        <Text style={[styles.recentRoute, { color: colors.text }]}>
          Makati → Quezon City
        </Text>
        <Text style={[styles.recentDetails, { color: colors.subtitle }]}>
          LRT-1 → MRT-3 → Jeepney · ₱45
        </Text>
      </View>
      <View
        style={[
          styles.recentCard,
          {
            backgroundColor: colors.cardSecondary,
            borderLeftColor: colors.heading,
          },
        ]}
      >
        <Text style={[styles.recentRoute, { color: colors.text }]}>
          Taguig → Manila
        </Text>
        <Text style={[styles.recentDetails, { color: colors.subtitle }]}>
          E-trike → LRT-1 · ₱28
        </Text>
      </View>
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
  },
  recentRoute: { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  recentDetails: { fontSize: 13 },
});
