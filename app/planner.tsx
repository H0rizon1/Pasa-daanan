import { addRecentTrip } from "@/constants/recentTrips";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { collection, getDocs } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
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
  transfers: number;
  date: string;
  time: string;
};

type Leg = {
  route: FirestoreRoute;
  boardStop: Stop;
  alightStop: Stop;
};

type TripOption = {
  legs: Leg[];
  totalFare: number;
  totalDurationMinutes: number | null;
  legWalkMeters: number[];
};

const WALK_TRANSFER_DISTANCE_M = 300;
const MAX_LEGS = 3;
const MAX_STATES_EXPLORED = 20000;
const MAX_TRIP_OPTIONS = 8;
const PICKER_STOP_COUNT = 20;
const PLANNED_TRIPS_KEY = "pasada_planned_trips";

function parseDurationMinutes(duration: string): number | null {
  const hourMatch = duration.match(/(\d+)\s*hr/i);
  const minMatch = duration.match(/(\d+)\s*min/i);
  const hours = hourMatch ? parseInt(hourMatch[1], 10) : 0;
  const mins = minMatch ? parseInt(minMatch[1], 10) : 0;
  if (!hourMatch && !minMatch) return null;
  return hours * 60 + mins;
}

function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours > 0 && mins > 0) return `${hours} hr ${mins} mins`;
  if (hours > 0) return `${hours} hr`;
  return `${mins} mins`;
}

function haversineMeters(a: Stop, b: Stop): number {
  if (
    typeof a.lat !== "number" ||
    typeof a.lng !== "number" ||
    typeof b.lat !== "number" ||
    typeof b.lng !== "number"
  ) {
    return Infinity;
  }
  const R = 6371000;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

type SearchState = {
  legs: Leg[];
  visitedStops: Set<string>;
  totalFare: number;
  totalDurationMinutes: number | null;
  legWalks: number[];
};

type RouteGraph = {
  getBoardableFrom: (stopName: string) => { seg: Leg; walkMeters: number }[];
};

function buildRouteGraph(routes: FirestoreRoute[]): RouteGraph {
  const allSegments: Leg[] = [];
  for (const route of routes) {
    for (let i = 0; i < route.stops.length; i++) {
      for (let j = i + 1; j < route.stops.length; j++) {
        allSegments.push({
          route,
          boardStop: route.stops[i],
          alightStop: route.stops[j],
        });
      }
    }
  }

  const segmentsByBoardStop = new Map<string, Leg[]>();
  for (const seg of allSegments) {
    const arr = segmentsByBoardStop.get(seg.boardStop.name) ?? [];
    arr.push(seg);
    segmentsByBoardStop.set(seg.boardStop.name, arr);
  }

  const allStops = new Map<string, Stop>();
  for (const route of routes) {
    for (const stop of route.stops) {
      if (!allStops.has(stop.name)) allStops.set(stop.name, stop);
    }
  }

  function getBoardableFrom(
    stopName: string,
  ): { seg: Leg; walkMeters: number }[] {
    const options: { seg: Leg; walkMeters: number }[] = [];
    for (const seg of segmentsByBoardStop.get(stopName) ?? []) {
      options.push({ seg, walkMeters: 0 });
    }
    const fromStop = allStops.get(stopName);
    if (fromStop) {
      for (const [otherName, segs] of segmentsByBoardStop.entries()) {
        if (otherName === stopName) continue;
        const otherStop = allStops.get(otherName);
        if (!otherStop) continue;
        const dist = haversineMeters(fromStop, otherStop);
        if (dist <= WALK_TRANSFER_DISTANCE_M) {
          for (const seg of segs) options.push({ seg, walkMeters: dist });
        }
      }
    }
    return options;
  }

  return { getBoardableFrom };
}

function getWellConnectedStops(
  routes: FirestoreRoute[],
  topN: number,
): string[] {
  const graph = buildRouteGraph(routes);
  const allStopNames = Array.from(
    new Set(routes.flatMap((r) => r.stops.map((s) => s.name))),
  );

  function reachableFrom(origin: string): Set<string> {
    const reachable = new Set<string>();
    const queue: { stop: string; legsUsed: number; visited: Set<string> }[] = [
      { stop: origin, legsUsed: 0, visited: new Set([origin]) },
    ];
    let statesExplored = 0;

    while (queue.length > 0 && statesExplored < MAX_STATES_EXPLORED) {
      const state = queue.shift() as (typeof queue)[number];
      statesExplored++;
      if (state.stop !== origin) reachable.add(state.stop);
      if (state.legsUsed >= MAX_LEGS) continue;
      for (const { seg } of graph.getBoardableFrom(state.stop)) {
        if (state.visited.has(seg.alightStop.name)) continue;
        queue.push({
          stop: seg.alightStop.name,
          legsUsed: state.legsUsed + 1,
          visited: new Set([...state.visited, seg.alightStop.name]),
        });
      }
    }
    return reachable;
  }

  const outSets = new Map<string, Set<string>>();
  for (const name of allStopNames) outSets.set(name, reachableFrom(name));

  const inCounts = new Map<string, number>(allStopNames.map((n) => [n, 0]));
  for (const set of outSets.values()) {
    for (const target of set) {
      inCounts.set(target, (inCounts.get(target) ?? 0) + 1);
    }
  }

  const scored = allStopNames.map((name) => {
    const outCount = outSets.get(name)?.size ?? 0;
    const inCount = inCounts.get(name) ?? 0;
    return { name, outCount, inCount, minCount: Math.min(outCount, inCount) };
  });

  return scored
    .sort(
      (a, b) =>
        b.minCount - a.minCount ||
        b.outCount + b.inCount - (a.outCount + a.inCount),
    )
    .slice(0, topN)
    .map((s) => s.name)
    .sort((a, b) => a.localeCompare(b));
}

function findTripOptions(
  routes: FirestoreRoute[],
  origin: string,
  destination: string,
): TripOption[] {
  const graph = buildRouteGraph(routes);

  const results: TripOption[] = [];
  const queue: SearchState[] = [
    {
      legs: [],
      visitedStops: new Set([origin]),
      totalFare: 0,
      totalDurationMinutes: 0,
      legWalks: [],
    },
  ];
  let statesExplored = 0;

  while (queue.length > 0 && statesExplored < MAX_STATES_EXPLORED) {
    const state = queue.shift() as SearchState;
    statesExplored++;

    const currentStop =
      state.legs.length === 0
        ? origin
        : state.legs[state.legs.length - 1].alightStop.name;

    if (state.legs.length > 0 && currentStop === destination) {
      results.push({
        legs: state.legs,
        totalFare: state.totalFare,
        totalDurationMinutes: state.totalDurationMinutes,
        legWalkMeters: state.legWalks,
      });
      continue;
    }

    if (state.legs.length >= MAX_LEGS) continue;

    for (const { seg, walkMeters } of graph.getBoardableFrom(currentStop)) {
      if (state.visitedStops.has(seg.alightStop.name)) continue; // no cycles
      const legDuration = parseDurationMinutes(seg.route.duration);
      queue.push({
        legs: [...state.legs, seg],
        visitedStops: new Set([...state.visitedStops, seg.alightStop.name]),
        totalFare: state.totalFare + seg.route.fare,
        totalDurationMinutes:
          state.totalDurationMinutes !== null && legDuration !== null
            ? state.totalDurationMinutes + legDuration
            : null,
        legWalks: [...state.legWalks, walkMeters],
      });
    }
  }

  return results
    .sort((a, b) => a.totalFare - b.totalFare)
    .slice(0, MAX_TRIP_OPTIONS);
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

  const [searchResults, setSearchResults] = useState<TripOption[] | null>(null);
  const [sortMode, setSortMode] = useState<"fare" | "duration">("fare");
  const [searching, setSearching] = useState(false);

  const dividerColor = theme === "dark" ? "#333333" : "#dddddd";
  const [tripsLoaded, setTripsLoaded] = useState(false);

  useEffect(() => {
    fetchRoutes();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PLANNED_TRIPS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setTrips(parsed as Trip[]);
        }
      } catch (error) {
        console.error("Error loading planned trips: ", error);
      } finally {
        setTripsLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!tripsLoaded) return;
    AsyncStorage.setItem(PLANNED_TRIPS_KEY, JSON.stringify(trips)).catch(
      (error) => console.error("Error saving planned trips: ", error),
    );
  }, [trips, tripsLoaded]);

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

  const stopNames = useMemo(
    () => getWellConnectedStops(routes, PICKER_STOP_COUNT),
    [routes],
  );

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
    setSearching(true);
    setTimeout(() => {
      setSearchResults(findTripOptions(routes, origin, destination));
      setSearching(false);
    }, 0);
  };

  const handleSelectOption = async (option: TripOption) => {
    const firstLeg = option.legs[0];
    const lastLeg = option.legs[option.legs.length - 1];
    const routeName = option.legs.map((leg) => leg.route.name).join(" → ");
    const durationText =
      option.totalDurationMinutes !== null
        ? formatMinutes(option.totalDurationMinutes)
        : option.legs.map((leg) => leg.route.duration).join(" + ");

    const newTrip: Trip = {
      id: Date.now().toString(),
      origin: firstLeg.boardStop.name,
      destination: lastLeg.alightStop.name,
      routeName,
      fare: option.totalFare,
      duration: durationText,
      transfers: option.legs.length - 1,
      date: formatDate(selectedDate),
      time: formatTime(selectedTime),
    };
    setTrips((prev) => [newTrip, ...prev]);

    addRecentTrip({
      origin: firstLeg.boardStop.name,
      destination: lastLeg.alightStop.name,
      detail: routeName,
      fare: option.totalFare,
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
                ? "Tap + , pick From/To, Find Route, then Add trip!"
                : "I-tap ang +, pumili ng ruta, tapos Idagdag ang biyahe!"}
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
                    {trip.transfers > 0
                      ? language === "en"
                        ? ` · ${trip.transfers} transfer${trip.transfers > 1 ? "s" : ""}`
                        : ` · ${trip.transfers} lipat`
                      : ""}
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
        style={[
          styles.fab,
          { backgroundColor: colors.heading, shadowColor: colors.heading },
        ]}
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
                          (!origin ||
                            !destination ||
                            origin === destination ||
                            searching) &&
                            styles.confirmButtonDisabled,
                        ]}
                        onPress={handleFindRoute}
                        disabled={
                          !origin ||
                          !destination ||
                          origin === destination ||
                          searching
                        }
                      >
                        {searching ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.confirmText}>
                            {language === "en" ? "Find Route" : "Hanapin"}
                          </Text>
                        )}
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
                        ? "No route found between these stops."
                        : "Walang nahanap na ruta sa pagitan ng mga himpilang ito."}
                    </Text>
                    <Text
                      style={[
                        styles.noResultsSubtext,
                        { color: colors.subtitle },
                      ]}
                    >
                      {language === "en"
                        ? "Checked direct routes and routes with up to 2 transfers - these stops just aren't connected yet in the current data."
                        : "Sinuri ang direktang ruta at ruta na may hanggang 2 lipat - wala pang koneksyon ang mga himpilang ito sa kasalukuyang datos."}
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
                        const cheapestFare = Math.min(
                          ...searchResults.map((o) => o.totalFare),
                        );
                        const knownDurations = searchResults
                          .map((o) => o.totalDurationMinutes)
                          .filter((d): d is number => d !== null);
                        const fastestDuration =
                          knownDurations.length > 0
                            ? Math.min(...knownDurations)
                            : null;

                        const sorted = [...searchResults].sort((a, b) => {
                          if (sortMode === "fare") {
                            return a.totalFare - b.totalFare;
                          }
                          const da = a.totalDurationMinutes;
                          const db = b.totalDurationMinutes;
                          if (da === null && db === null) return 0;
                          if (da === null) return 1;
                          if (db === null) return -1;
                          return da - db;
                        });

                        return sorted.map((option) => {
                          const isCheapest = option.totalFare === cheapestFare;
                          const isFastest =
                            fastestDuration !== null &&
                            option.totalDurationMinutes === fastestDuration;
                          const transferCount = option.legs.length - 1;
                          const key = option.legs
                            .map(
                              (leg) =>
                                `${leg.route.id}:${leg.boardStop.name}>${leg.alightStop.name}`,
                            )
                            .join("|");

                          return (
                            <View
                              key={key}
                              style={[
                                styles.resultCard,
                                { backgroundColor: colors.input },
                              ]}
                            >
                              {option.legs.map((leg, index) => (
                                <View key={`${key}-${index}`}>
                                  {index === 0 &&
                                    option.legWalkMeters[0] > 0 && (
                                      <View style={styles.transferRow}>
                                        <Ionicons
                                          name="walk"
                                          size={13}
                                          color={colors.subtitle}
                                        />
                                        <Text
                                          style={[
                                            styles.transferText,
                                            { color: colors.subtitle },
                                          ]}
                                        >
                                          {language === "en"
                                            ? `Walk ${Math.round(option.legWalkMeters[0])}m to `
                                            : `Lumakad ng ${Math.round(option.legWalkMeters[0])}m papuntang `}
                                          {leg.boardStop.name}
                                        </Text>
                                      </View>
                                    )}
                                  {index > 0 && (
                                    <View style={styles.transferRow}>
                                      <Ionicons
                                        name="swap-horizontal"
                                        size={13}
                                        color={colors.subtitle}
                                      />
                                      <Text
                                        style={[
                                          styles.transferText,
                                          { color: colors.subtitle },
                                        ]}
                                      >
                                        {language === "en"
                                          ? "Transfer at "
                                          : "Lipat sa "}
                                        {leg.boardStop.name}
                                        {option.legWalkMeters[index] > 0
                                          ? language === "en"
                                            ? ` (${Math.round(option.legWalkMeters[index])}m walk)`
                                            : ` (${Math.round(option.legWalkMeters[index])}m na lakad)`
                                          : ""}
                                      </Text>
                                    </View>
                                  )}
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
                                      {leg.route.name}
                                    </Text>
                                  </View>
                                </View>
                              ))}

                              <Text
                                style={[
                                  styles.resultMeta,
                                  { color: colors.subtitle },
                                ]}
                              >
                                ₱{option.totalFare} ·{" "}
                                {option.totalDurationMinutes !== null
                                  ? formatMinutes(option.totalDurationMinutes)
                                  : option.legs
                                      .map((leg) => leg.route.duration)
                                      .join(" + ")}
                                {transferCount > 0
                                  ? language === "en"
                                    ? ` · ${transferCount} transfer${transferCount > 1 ? "s" : ""}`
                                    : ` · ${transferCount} lipat`
                                  : ""}
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

                              <TouchableOpacity
                                style={styles.addTripButton}
                                onPress={() => handleSelectOption(option)}
                              >
                                <Ionicons
                                  name="add-circle"
                                  size={18}
                                  color="#fff"
                                />
                                <Text style={styles.addTripText}>
                                  {language === "en"
                                    ? "Add trip"
                                    : "Idagdag ang biyahe"}
                                </Text>
                              </TouchableOpacity>
                            </View>
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
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
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
  transferRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginVertical: 4,
    marginLeft: 4,
  },
  transferText: {
    fontSize: 11,
    fontStyle: "italic",
    flexShrink: 1,
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
  addTripButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#e94560",
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 12,
  },
  addTripText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
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
