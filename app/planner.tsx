import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { useState } from "react";
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useLanguage } from "../constants/langcontext";
import { useTheme } from "../constants/ThemeContext";

type Trip = {
  id: string;
  origin: string;
  destination: string;
  date: string;
  time: string;
};

export default function PlannerScreen() {
  const { language } = useLanguage();
  const { theme, colors } = useTheme();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const dividerColor = theme === "dark" ? "#333333" : "#dddddd";

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

  const addTrip = () => {
    if (!origin || !destination) return;
    const newTrip: Trip = {
      id: Date.now().toString(),
      origin,
      destination,
      date: formatDate(selectedDate),
      time: formatTime(selectedTime),
    };
    setTrips((prev) => [newTrip, ...prev]);
    setOrigin("");
    setDestination("");
    setSelectedDate(new Date());
    setSelectedTime(new Date());
    setModalVisible(false);
  };

  const deleteTrip = (id: string) => {
    setTrips((prev) => prev.filter((trip) => trip.id !== id));
  };

  const locations = [
    "Caloocan",
    "Las Piñas",
    "Makati",
    "Malabon",
    "Mandaluyong",
    "Manila",
    "Marikina",
    "Muntinlupa",
    "Navotas",
    "Parañaque",
    "Pasay",
    "Pasig",
    "Pateros",
    "Quezon City",
    "San Juan",
    "Taguig",
    "Valenzuela",
  ];

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
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.cardSecondary },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {language === "en" ? "Plan a Trip" : "Mag-plano ng Biyahe"}
            </Text>

            <Text style={[styles.inputLabel, { color: colors.text }]}>
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
                <Picker.Item label="Select current location..." value="" />
                {locations.map((loc) => (
                  <Picker.Item key={loc} label={loc} value={loc} />
                ))}
              </Picker>
            </View>
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
                <Picker.Item label="Select destination..." value="" />
                {locations.map((loc) => (
                  <Picker.Item key={loc} label={loc} value={loc} />
                ))}
              </Picker>
            </View>

            <View style={styles.dateTimeRow}>
              <View style={styles.dateTimeBlock}>
                <Text style={[styles.inputLabel, { color: colors.subtitle }]}>
                  {language === "en" ? "Date" : "Petsa"}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.dateTimeButton,
                    { backgroundColor: colors.input },
                  ]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={16} color="#e94560" />
                  <Text style={[styles.dateTimeText, { color: colors.text }]}>
                    {formatDate(selectedDate)}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.dateTimeBlock}>
                <Text style={[styles.inputLabel, { color: colors.subtitle }]}>
                  {language === "en" ? "Time" : "Oras"}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.dateTimeButton,
                    { backgroundColor: colors.input },
                  ]}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Ionicons name="time-outline" size={16} color="#e94560" />
                  <Text style={[styles.dateTimeText, { color: colors.text }]}>
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
                style={[styles.cancelButton, { backgroundColor: colors.input }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.cancelText, { color: colors.subtitle }]}>
                  {language === "en" ? "Cancel" : "Kanselahin"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={addTrip}>
                <Text style={styles.confirmText}>
                  {language === "en" ? "Add Trip" : "Idagdag"}
                </Text>
              </TouchableOpacity>
            </View>
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
  tripDateTime: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
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
    fontSize: 22,
    fontWeight: "bold",
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
  confirmText: {
    color: "#fff",
    fontWeight: "bold",
  },
  pickerContainer: {
    borderRadius: 12,
    marginBottom: 8,
    overflow: "hidden",
  },
});
