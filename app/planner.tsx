import { addRecentTrip } from "@/constants/recentTrips";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { collection, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../constants/firebase";
import { useLanguage } from "../constants/langcontext";
import { useTheme } from "../constants/ThemeContext";

type Stop = { name: string; lat?: number; lng?: number };

type FirestoreRoute = {
  id: string;
  name: string;
  type: string;
  fare: number;
  duration: string;
  stops: Stop[];
};

type Trip = {
  id: string;
  origin: string;
  destination: string;
  routeName: string;
  fare: number;
  duration: string;
  date: string;
  time: string;
};

type RouteMatch = {
  route: FirestoreRoute;
  originStop: Stop;
  destinationStop: Stop;
};

function parseDurationMinutes(duration: string): number | null {
  const hourMatch = duration.match(/(\d+)\s*hr/i);
  const minMatch = duration.match(/(\d+)\s*min/i);
  const hours = hourMatch ? parseInt(hourMatch[1], 10) : 0;
  const mins = minMatch ? parseInt(minMatch[1], 10) : 0;
  if (!hourMatch && !minMatch) return null;
  return hours * 60 + mins;
}

function findMatchingRoutes(
  routes: FirestoreRoute[],
  origin: string,
  destination: string,
): RouteMatch[] {
  const matches: RouteMatch[] = [];
  for (const route of routes) {
    const originIndex = route.stops.findIndex((s) => s.name === origin);
    const destinationIndex = route.stops.findIndex(
      (s) => s.name === destination,
    );
    if (
      originIndex !== -1 &&
      destinationIndex !== -1 &&
      originIndex < destinationIndex
    ) {
      matches.push({
        route,
        originStop: route.stops[originIndex],
        destinationStop: route.stops[destinationIndex],
      });
    }
  }
  return matches.sort((a, b) => a.route.fare - b.route.fare);
}

export default function PlannerScreen() {
  const { language } = useLanguage();
  const { theme, colors } = useTheme();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [routes, setRoutes] = useState<FirestoreRoute[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(true);

  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [searchResults, setSearchResults] = useState<RouteMatch[] | null>(null);

  const [sortMode, setSortMode] = useState<"fare" | "duration">("fare");

  const dividerColor = theme === "dark" ? "#333333" : "#dddddd";

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    try {
      setLoadingRoutes(true);
      const snapshot = await getDocs(collection(db, "routes"));
      const fetched: FirestoreRoute[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<FirestoreRoute, "id">),
      }));
      setRoutes(fetched);
    } catch (error) {
      console.error("Error fetching routes for planner: ", error);
    } finally {
      setLoadingRoutes(false);
    }
  };

  const stopNames = Array.from(
    new Set(routes.flatMap((r) => r.stops.map((s) => s.name))),
  ).sort((a, b) => a.localeCompare(b));

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const formatTime = (time: Date) =>
    time.toLocaleTimeString("en-PH", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const resetModal = () => {
    setOrigin("");
    setDestination("");
    setSelectedDate(new Date());
    setSelectedTime(new Date());
    setSearchResults(null);
    setSortMode("fare");
    setModalVisible(false);
  };

  const handleFindRoute = () => {
    if (!origin || !destination || origin === destination) return;
    setSortMode("fare");
    setSearchResults(findMatchingRoutes(routes, origin, destination));
  };

  const handleSelectMatch = async (match: RouteMatch) => {
    const newTrip: Trip = {
      id: Date.now().toString(),
      origin: match.originStop.name,
      destination: match.destinationStop.name,
      routeName: match.route.name,
      fare: match.route.fare,
      duration: match.route.duration,
      date: formatDate(selectedDate),
      time: formatTime(selectedTime),
    };
    setTrips((prev) => [newTrip, ...prev]);

    addRecentTrip({
      origin: match.originStop.name,
      destination: match.destinationStop.name,
      detail: match.route.name,
      fare: match.route.fare,
    }).catch((error) =>
      console.error("Error logging recent trip from planner: ", error),
    );

    resetModal();
  };

  const deleteTrip = (id: string) => {
    setTrips((prev) => prev.filter((trip) => trip.id !== id));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.heading }]}>
          {language === "en" ? "My Trips" : "Mga Biyahe Ko"}
        </Text>
        <Text style={[styles.subtitle, { color: colors.subtitle }]}>
          {language === "en"
            ? "Plan your route ahead of time"
            : "Planuhin ang iyong ruta nang maaga"}
        </Text>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
      >
        {trips.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="map-outline" size={60} color={colors.subtitle} />
            <Text style={[styles.emptyText, { color: colors.text }]}>
              {language === "en"
                ? "No trips planned yet"
                : "Wala pang naplanong biyahe"}
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.subtitle }]}>
              {language === "en"
                ? "Tap the + button to add one!"
                : "I-tap ang + para magdagdag!"}
            </Text>
          </View>
        ) : (
          trips.map((trip) => (
            <View
              key={trip.id}
              style={[
                styles.tripCard,
                { backgroundColor: colors.cardSecondary },
              ]}
            >
              <View style={styles.tripInfo}>
                <View style={styles.tripRow}>
                  <View style={styles.dotGreen} />
                  <Text style={[styles.tripLocation, { color: colors.text }]}>
                    {trip.origin}
                  </Text>
                </View>
                <View
                  style={[styles.dottedLine, { backgroundColor: dividerColor }]}
                />
                <View style={styles.tripRow}>
                  <View style={styles.dotRed} />
                  <Text style={[styles.tripLocation, { color: colors.text }]}>
                    {trip.destination}
                  </Text>
                </View>
                <View style={styles.tripRouteRow}>
                  <Ionicons name="bus" size={13} color={colors.heading} />
                  <Text
                    style={[styles.tripRouteText, { color: colors.heading }]}
                  >
                    {trip.routeName} · ₱{trip.fare} · {trip.duration}
                  </Text>
                </View>
                <View style={styles.tripDateTime}>
                  <Ionicons
                    name="calendar-outline"
                    size={13}
                    color={colors.subtitle}
                  />
                  <Text
                    style={[styles.tripDateText, { color: colors.subtitle }]}
                  >
                    {trip.date}
                  </Text>
                  <Ionicons
                    name="time-outline"
                    size={13}
                    color={colors.subtitle}
                    style={{ marginLeft: 8 }}
                  />
                  <Text
                    style={[styles.tripDateText, { color: colors.subtitle }]}
                  >
                    {trip.time}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteTrip(trip.id)}
              >
                <Ionicons name="trash-outline" size={20} color="#e94560" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={resetModal}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.cardSecondary },
            ]}
          >
            {searchResults === null ? (
              <>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {language === "en" ? "Plan a Trip" : "Mag-plano ng Biyahe"}
                </Text>

                {loadingRoutes ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.heading}
                    style={{ marginVertical: 12 }}
                  />
                ) : (
                  <>
                    <Text
                      style={[styles.inputLabel, { color: colors.subtitle }]}
                    >
                      {language === "en" ? "From" : "Mula sa"}
                    </Text>
                    <View
                      style={[
                        styles.pickerContainer,
                        { backgroundColor: colors.input },
                      ]}
                    >
                      <Picker
                        selectedValue={origin}
                        onValueChange={(value) => setOrigin(value)}
                        style={{ color: colors.text }}
                        dropdownIconColor={colors.heading}
                        mode="dropdown"
                      >
                        <Picker.Item
                          label={
                            language === "en"
                              ? "Select a stop..."
                              : "Pumili ng himpilan..."
                          }
                          value=""
                        />
                        {stopNames.map((name) => (
                          <Picker.Item key={name} label={name} value={name} />
                        ))}
                      </Picker>
                    </View>

                    <Text
                      style={[styles.inputLabel, { color: colors.subtitle }]}
                    >
                      {language === "en" ? "To" : "Hanggang sa"}
                    </Text>
                    <View
                      style={[
                        styles.pickerContainer,
                        { backgroundColor: colors.input },
                      ]}
                    >
                      <Picker
                        selectedValue={destination}
                        onValueChange={(value) => setDestination(value)}
                        style={{ color: colors.text }}
                        dropdownIconColor={colors.heading}
                        mode="dropdown"
                      >
                        <Picker.Item
                          label={
                            language === "en"
                              ? "Select a stop..."
                              : "Pumili ng himpilan..."
                          }
                          value=""
                        />
                        {stopNames.map((name) => (
                          <Picker.Item key={name} label={name} value={name} />
                        ))}
                      </Picker>
                    </View>

                    <View style={styles.dateTimeRow}>
                      <View style={styles.dateTimeBlock}>
                        <Text
                          style={[
                            styles.inputLabel,
                            { color: colors.subtitle },
                          ]}
                        >
                          {language === "en" ? "Date" : "Petsa"}
                        </Text>
                        <TouchableOpacity
                          style={[
                            styles.dateTimeButton,
                            { backgroundColor: colors.input },
                          ]}
                          onPress={() => setShowDatePicker(true)}
                        >
                          <Ionicons
                            name="calendar-outline"
                            size={16}
                            color="#e94560"
                          />
                          <Text
                            style={[
                              styles.dateTimeText,
                              { color: colors.text },
                            ]}
                          >
                            {formatDate(selectedDate)}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.dateTimeBlock}>
                        <Text
                          style={[
                            styles.inputLabel,
                            { color: colors.subtitle },
                          ]}
                        >
                          {language === "en" ? "Time" : "Oras"}
                        </Text>
                        <TouchableOpacity
                          style={[
                            styles.dateTimeButton,
                            { backgroundColor: colors.input },
                          ]}
                          onPress={() => setShowTimePicker(true)}
                        >
                          <Ionicons
                            name="time-outline"
                            size={16}
                            color="#e94560"
                          />
                          <Text
                            style={[
                              styles.dateTimeText,
                              { color: colors.text },
                            ]}
                          >
                            {formatTime(selectedTime)}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {showDatePicker && (
                      <DateTimePicker
                        value={selectedDate}
                        mode="date"
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                        minimumDate={new Date()}
                        onChange={(event, date) => {
                          setShowDatePicker(false);
                          if (date) setSelectedDate(date);
                        }}
                      />
                    )}

                    {showTimePicker && (
                      <DateTimePicker
                        value={selectedTime}
                        mode="time"
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                        onChange={(event, time) => {
                          setShowTimePicker(false);
                          if (time) setSelectedTime(time);
                        }}
                      />
                    )}

                    <View style={styles.modalButtons}>
                      <TouchableOpacity
                        style={[
                          styles.cancelButton,
                          { backgroundColor: colors.input },
                        ]}
                        onPress={resetModal}
                      >
                        <Text
                          style={[
                            styles.cancelText,
                            { color: colors.subtitle },
                          ]}
                        >
                          {language === "en" ? "Cancel" : "Kanselahin"}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.confirmButton,
                          (!origin || !destination || origin === destination) &&
                            styles.confirmButtonDisabled,
                        ]}
                        onPress={handleFindRoute}
                        disabled={
                          !origin || !destination || origin === destination
                        }
                      >
                        <Text style={styles.confirmText}>
                          {language === "en" ? "Find Route" : "Hanapin"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </>
            ) : (
              <>
                <View style={styles.resultsHeader}>
                  <TouchableOpacity
                    onPress={() => setSearchResults(null)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="arrow-back" size={22} color={colors.text} />
                  </TouchableOpacity>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    {origin} → {destination}
                  </Text>
                </View>

                {searchResults.length === 0 ? (
                  <View style={styles.noResults}>
                    <Ionicons
                      name="alert-circle-outline"
                      size={40}
                      color={colors.subtitle}
                    />
                    <Text
                      style={[styles.noResultsText, { color: colors.text }]}
                    >
                      {language === "en"
                        ? "No direct route found between these stops."
                        : "Walang direktang ruta sa pagitan ng mga himpilang ito."}
                    </Text>
                    <Text
                      style={[
                        styles.noResultsSubtext,
                        { color: colors.subtitle },
                      ]}
                    >
                      {language === "en"
                        ? "Try a different pair of stops, or check back as more routes get added."
                        : "Subukan ang ibang himpilan, o bumalik kapag may dagdag na ruta."}
                    </Text>
                  </View>
                ) : (
                  <>
                    {searchResults.length > 1 && (
                      <View style={styles.sortToggleRow}>
                        <TouchableOpacity
                          style={[
                            styles.sortToggleButton,
                            {
                              backgroundColor:
                                sortMode === "fare"
                                  ? colors.heading
                                  : colors.input,
                            },
                          ]}
                          onPress={() => setSortMode("fare")}
                        >
                          <Text
                            style={[
                              styles.sortToggleText,
                              {
                                color:
                                  sortMode === "fare" ? "#fff" : colors.text,
                              },
                            ]}
                          >
                            {language === "en"
                              ? "Cheapest first"
                              : "Pinakamura muna"}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.sortToggleButton,
                            {
                              backgroundColor:
                                sortMode === "duration"
                                  ? colors.heading
                                  : colors.input,
                            },
                          ]}
                          onPress={() => setSortMode("duration")}
                        >
                          <Text
                            style={[
                              styles.sortToggleText,
                              {
                                color:
                                  sortMode === "duration"
                                    ? "#fff"
                                    : colors.text,
                              },
                            ]}
                          >
                            {language === "en"
                              ? "Fastest first"
                              : "Pinakamabilis muna"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    <ScrollView style={{ maxHeight: 320 }}>
                      {(() => {
                        // Cheapest/fastest badges are computed against the
                        // FULL result set regardless of which sort is
                        // currently active, so a route stays labeled
                        // correctly no matter how the list is ordered.
                        const cheapestFare = Math.min(
                          ...searchResults.map((m) => m.route.fare),
                        );
                        const knownDurations = searchResults
                          .map((m) => parseDurationMinutes(m.route.duration))
                          .filter((d): d is number => d !== null);
                        const fastestDuration =
                          knownDurations.length > 0
                            ? Math.min(...knownDurations)
                            : null;

                        const sorted = [...searchResults].sort((a, b) => {
                          if (sortMode === "fare") {
                            return a.route.fare - b.route.fare;
                          }
                          const da = parseDurationMinutes(a.route.duration);
                          const db = parseDurationMinutes(b.route.duration);
                          // Routes with unparseable duration text sink to
                          // the bottom rather than breaking the sort.
                          if (da === null && db === null) return 0;
                          if (da === null) return 1;
                          if (db === null) return -1;
                          return da - db;
                        });

                        return sorted.map((match) => {
                          const isCheapest = match.route.fare === cheapestFare;
                          const matchDuration = parseDurationMinutes(
                            match.route.duration,
                          );
                          const isFastest =
                            fastestDuration !== null &&
                            matchDuration === fastestDuration;

                          return (
                            <TouchableOpacity
                              key={match.route.id}
                              style={[
                                styles.resultCard,
                                { backgroundColor: colors.input },
                              ]}
                              onPress={() => handleSelectMatch(match)}
                            >
                              <View style={styles.resultCardHeader}>
                                <Ionicons
                                  name="bus"
                                  size={16}
                                  color={colors.heading}
                                />
                                <Text
                                  style={[
                                    styles.resultRouteName,
                                    { color: colors.text },
                                  ]}
                                >
                                  {match.route.name}
                                </Text>
                              </View>
                              <Text
                                style={[
                                  styles.resultMeta,
                                  { color: colors.subtitle },
                                ]}
                              >
                                ₱{match.route.fare} · {match.route.duration}
                              </Text>
                              {(isCheapest || isFastest) && (
                                <View style={styles.badgeRow}>
                                  {isCheapest && (
                                    <View
                                      style={[
                                        styles.matchBadge,
                                        { backgroundColor: "#4caf5033" },
                                      ]}
                                    >
                                      <Text
                                        style={[
                                          styles.matchBadgeText,
                                          { color: "#4caf50" },
                                        ]}
                                      >
                                        {language === "en"
                                          ? "💰 Cheapest"
                                          : "💰 Pinakamura"}
                                      </Text>
                                    </View>
                                  )}
                                  {isFastest && (
                                    <View
                                      style={[
                                        styles.matchBadge,
                                        { backgroundColor: "#5ba3e033" },
                                      ]}
                                    >
                                      <Text
                                        style={[
                                          styles.matchBadgeText,
                                          { color: "#5ba3e0" },
                                        ]}
                                      >
                                        {language === "en"
                                          ? "⚡ Fastest"
                                          : "⚡ Pinakamabilis"}
                                      </Text>
                                    </View>
                                  )}
                                </View>
                              )}
                            </TouchableOpacity>
                          );
                        });
                      })()}
                    </ScrollView>
                  </>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingTop: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  emptySubtext: {
    fontSize: 14,
  },
  tripCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: "#e94560",
  },
  tripInfo: {
    flex: 1,
  },
  tripRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dotGreen: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4caf50",
  },
  dotRed: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#e94560",
  },
  dottedLine: {
    width: 2,
    height: 16,
    marginLeft: 4,
    marginVertical: 2,
  },
  tripLocation: {
    fontSize: 15,
    fontWeight: "600",
  },
  tripRouteRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 6,
  },
  tripRouteText: {
    fontSize: 12,
    fontWeight: "600",
  },
  tripDateTime: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 4,
  },
  tripDateText: {
    fontSize: 12,
  },
  deleteButton: {
    padding: 8,
  },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 24,
    backgroundColor: "#e94560",
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#e94560",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  resultsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  dateTimeRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
  },
  dateTimeBlock: {
    flex: 1,
  },
  dateTimeButton: {
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateTimeText: {
    fontSize: 13,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  cancelText: {
    fontWeight: "600",
  },
  confirmButton: {
    flex: 1,
    backgroundColor: "#e94560",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmText: {
    color: "#fff",
    fontWeight: "bold",
  },
  pickerContainer: {
    borderRadius: 12,
    marginBottom: 8,
    overflow: "hidden",
  },
  noResults: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 24,
  },
  noResultsText: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },
  noResultsSubtext: {
    fontSize: 13,
    textAlign: "center",
  },
  resultCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  resultCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  resultRouteName: {
    fontSize: 15,
    fontWeight: "700",
  },
  resultMeta: {
    fontSize: 12,
  },
  sortToggleRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  sortToggleButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: "center",
  },
  sortToggleText: {
    fontSize: 12,
    fontWeight: "700",
  },
  badgeRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
  },
  matchBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  matchBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
