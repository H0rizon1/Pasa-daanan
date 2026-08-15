import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLanguage } from "../constants/langcontext";
import { useTheme } from "../constants/ThemeContext";

const FARE_DATA = [
  { key: "jeep", icon: "bus-outline", cost: 13, color: "#4caf50" },
  { key: "bus", icon: "bus", cost: 30, color: "#2e9e5b" },
  { key: "p2p", icon: "car-sport", cost: 150, color: "#5ba3e0" },
  { key: "moveit", icon: "bicycle", cost: 65, color: "#f2a541" },
  { key: "taxi", icon: "car", cost: 250, color: "#e94560" },
] as const;

const FARE_LABELS: Record<
  (typeof FARE_DATA)[number]["key"],
  { en: string; fil: string }
> = {
  jeep: { en: "Jeepney", fil: "Dyip" },
  bus: { en: "Bus", fil: "Bus" },
  p2p: { en: "P2P Bus", fil: "P2P Bus" },
  moveit: { en: "MOVEit / Angkas", fil: "MOVEit / Angkas" },
  taxi: { en: "Taxi / Grab", fil: "Taxi / Grab" },
};

export default function CompareScreen() {
  const { language } = useLanguage();
  const { colors } = useTheme();
  const maxCost = Math.max(...FARE_DATA.map((f) => f.cost));

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.heading }]}>
          {language === "en" ? "Cost Comparison" : "Paghahambing ng Gastos"}
        </Text>
        <Text style={[styles.subtitle, { color: colors.subtitle }]}>
          {language === "en"
            ? "Public transit vs private car"
            : "Pampublikong sasakyan vs sariling sasakyan"}
        </Text>
      </View>

      <View
        style={[styles.routeLabel, { backgroundColor: colors.cardSecondary }]}
      >
        <Ionicons name="navigate" size={16} color={colors.heading} />
        <Text style={[styles.routeLabelText, { color: colors.text }]}>
          Makati → Quezon City
        </Text>
      </View>

      <View
        style={[styles.chartCard, { backgroundColor: colors.cardSecondary }]}
      >
        <Text style={[styles.chartTitle, { color: colors.text }]}>
          {language === "en" ? "Fare by Mode" : "Pamasahe kada Sasakyan"}
        </Text>
        <Text style={[styles.chartCaption, { color: colors.subtitle }]}>
          {language === "en"
            ? "Reference fares for a typical trip of this distance. Actual fares vary."
            : "Sanggunian na pamasahe para sa karaniwang biyaheng ganito ang layo. Maaaring mag-iba ang aktwal na pamasahe."}
        </Text>

        {FARE_DATA.map((item) => {
          const barWidthPct = (item.cost / maxCost) * 100;
          const label = FARE_LABELS[item.key][language === "en" ? "en" : "fil"];
          return (
            <View key={item.key} style={styles.barRow}>
              <View style={styles.barLabelRow}>
                <Ionicons
                  name={item.icon as any}
                  size={16}
                  color={item.color}
                />
                <Text style={[styles.barLabel, { color: colors.text }]}>
                  {label}
                </Text>
                <Text style={[styles.barCost, { color: colors.text }]}>
                  ₱{item.cost}
                </Text>
              </View>
              <View
                style={[
                  styles.barTrack,
                  { backgroundColor: colors.background },
                ]}
              >
                <View
                  style={[
                    styles.barFill,
                    { width: `${barWidthPct}%`, backgroundColor: item.color },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.cardsRow}>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.cardSecondary, borderColor: "#4caf50" },
          ]}
        >
          <Ionicons name="bus" size={32} color="#4caf50" />
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {language === "en" ? "Public Transit" : "Pampubliko"}
          </Text>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.text }]}>₱45</Text>
            <Text style={[styles.statLabel, { color: colors.subtitle }]}>
              {language === "en" ? "Cost" : "Gastos"}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              42 mins
            </Text>
            <Text style={[styles.statLabel, { color: colors.subtitle }]}>
              {language === "en" ? "Travel Time" : "Oras ng Biyahe"}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              Low 🌿
            </Text>
            <Text style={[styles.statLabel, { color: colors.subtitle }]}>
              CO₂
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: "#4caf5033" }]}>
            <Text style={[styles.badgeText, { color: "#4caf50" }]}>
              ✅ {language === "en" ? "Recommended" : "Inirerekomenda"}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.cardSecondary,
              borderColor: "#e94560",
            },
          ]}
        >
          <Ionicons name="car" size={32} color={colors.heading} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {language === "en" ? "Private Car" : "Sariling Sasakyan"}
          </Text>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.text }]}>₱320</Text>
            <Text style={[styles.statLabel, { color: colors.subtitle }]}>
              {language === "en" ? "Cost" : "Gastos"}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              1hr 10mins
            </Text>
            <Text style={[styles.statLabel, { color: colors.subtitle }]}>
              {language === "en" ? "Travel Time" : "Oras ng Biyahe"}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              High 🏭
            </Text>
            <Text style={[styles.statLabel, { color: colors.subtitle }]}>
              CO₂
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: "#FF8C4233" }]}>
            <Text style={[styles.badgeText, { color: colors.heading }]}>
              ❌ {language === "en" ? "Costly" : "Mahal"}
            </Text>
          </View>
        </View>
      </View>

      <View
        style={[
          styles.savingsCard,
          {
            backgroundColor: colors.cardSecondary,
            borderColor: colors.heading,
          },
        ]}
      >
        <Text style={[styles.savingsTitle, { color: colors.text }]}>
          🎉{" "}
          {language === "en"
            ? "You save with public transit!"
            : "Makatipid ka sa pampublikong sasakyan!"}
        </Text>
        <View style={styles.savingsRow}>
          <View style={styles.savingsStat}>
            <Text style={[styles.savingsValue, { color: colors.heading }]}>
              ₱275
            </Text>
            <Text style={[styles.savingsLabel, { color: colors.subtitle }]}>
              {language === "en" ? "Money Saved" : "Natipid na Pera"}
            </Text>
          </View>
          <View style={styles.savingsStat}>
            <Text style={[styles.savingsValue, { color: colors.heading }]}>
              28 mins
            </Text>
            <Text style={[styles.savingsLabel, { color: colors.subtitle }]}>
              {language === "en" ? "Time Saved" : "Natipid na Oras"}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 24, paddingTop: 40 },
  title: { fontSize: 28, fontWeight: "bold" },
  subtitle: { fontSize: 14, marginTop: 4 },
  routeLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
  },
  routeLabelText: { fontSize: 15, fontWeight: "600" },
  chartCard: {
    borderRadius: 16,
    marginHorizontal: 24,
    padding: 16,
    marginBottom: 16,
  },
  chartTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  chartCaption: { fontSize: 12, marginBottom: 16 },
  barRow: { marginBottom: 14 },
  barLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  barLabel: { fontSize: 13, fontWeight: "600", flex: 1 },
  barCost: { fontSize: 13, fontWeight: "bold" },
  barTrack: {
    height: 10,
    borderRadius: 6,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 6,
  },
  cardsRow: {
    flexDirection: "row",
    marginHorizontal: 24,
    gap: 12,
    marginBottom: 16,
  },
  card: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
  },
  cardTitle: { fontWeight: "bold", fontSize: 14, textAlign: "center" },
  stat: { alignItems: "center" },
  statValue: { fontSize: 16, fontWeight: "bold" },
  statLabel: { fontSize: 11, marginTop: 2 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  savingsCard: {
    borderRadius: 16,
    marginHorizontal: 24,
    padding: 20,
    marginBottom: 40,
    borderWidth: 1,
  },
  savingsTitle: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 16,
    textAlign: "center",
  },
  savingsRow: { flexDirection: "row", justifyContent: "space-around" },
  savingsStat: { alignItems: "center" },
  savingsValue: { fontSize: 24, fontWeight: "bold" },
  savingsLabel: { fontSize: 12, marginTop: 4 },
});
