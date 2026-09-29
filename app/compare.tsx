import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLanguage } from "../constants/langcontext";
import { useTheme } from "../constants/ThemeContext";

const MODES = [
  { key: "jeep", icon: "bus-outline", color: "#4caf50", fare: 13, minutes: 45 },
  { key: "bus", icon: "bus", color: "#2e9e5b", fare: 30, minutes: 40 },
  { key: "p2p", icon: "car-sport", color: "#5ba3e0", fare: 150, minutes: 35 },
  { key: "moveit", icon: "bicycle", color: "#f2a541", fare: 65, minutes: 25 },
  { key: "taxi", icon: "car", color: "#e94560", fare: 250, minutes: 42 },
] as const;

const MODE_LABELS: Record<
  (typeof MODES)[number]["key"],
  { en: string; fil: string }
> = {
  jeep: { en: "Jeepney", fil: "Dyip" },
  bus: { en: "Bus", fil: "Bus" },
  p2p: { en: "P2P Bus", fil: "P2P Bus" },
  moveit: { en: "MOVEit / Angkas", fil: "MOVEit / Angkas" },
  taxi: { en: "Taxi / Grab", fil: "Taxi / Grab" },
};

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins} min`;
}

export default function CompareScreen() {
  const { language } = useLanguage();
  const { colors } = useTheme();
  const maxFare = Math.max(...MODES.map((m) => m.fare));
  const maxMinutes = Math.max(...MODES.map((m) => m.minutes));

  const renderChart = (
    title: string,
    caption: string,
    getValue: (m: (typeof MODES)[number]) => number,
    maxValue: number,
    formatValue: (v: number) => string,
  ) => (
    <View style={[styles.chartCard, { backgroundColor: colors.cardSecondary }]}>
      <Text style={[styles.chartTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.chartCaption, { color: colors.subtitle }]}>
        {caption}
      </Text>

      {MODES.map((item) => {
        const value = getValue(item);
        const barWidthPct = (value / maxValue) * 100;
        const label = MODE_LABELS[item.key][language === "en" ? "en" : "fil"];
        return (
          <View key={item.key} style={styles.barRow}>
            <View style={styles.barLabelRow}>
              <Ionicons name={item.icon as any} size={16} color={item.color} />
              <Text style={[styles.barLabel, { color: colors.text }]}>
                {label}
              </Text>
              <Text style={[styles.barCost, { color: colors.text }]}>
                {formatValue(value)}
              </Text>
            </View>
            <View
              style={[styles.barTrack, { backgroundColor: colors.background }]}
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
  );

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
            ? "See how fares and travel time stack up across your options"
            : "Ihambing ang pamasahe at oras ng byahe sa iba't ibang paraan"}
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

      {renderChart(
        language === "en" ? "Fare by Mode" : "Pamasahe kada Sasakyan",
        language === "en"
          ? "Reference fares for a typical trip of this distance. Actual fares vary."
          : "Sanggunian na pamasahe para sa karaniwang biyaheng ganito ang layo. Maaaring mag-iba ang aktwal na pamasahe.",
        (m) => m.fare,
        maxFare,
        (v) => `₱${v}`,
      )}

      {renderChart(
        language === "en"
          ? "Travel Time by Mode"
          : "Oras ng Byahe kada Sasakyan",
        language === "en"
          ? "Reference travel time for a typical trip of this distance, including usual traffic. Actual time varies."
          : "Sanggunian na oras ng byahe para sa karaniwang biyaheng ganito ang layo, kasama ang karaniwang trapiko. Maaaring mag-iba ang aktwal na oras.",
        (m) => m.minutes,
        maxMinutes,
        formatMinutes,
      )}
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
