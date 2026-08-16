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
            ? "See how fares stack up across your options"
            : "Ihambing ang pamasahe sa iba't ibang paraan ng byahe"}
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
});
