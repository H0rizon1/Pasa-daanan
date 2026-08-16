import AsyncStorage from "@react-native-async-storage/async-storage";

export type RecentTrip = {
  id: string;
  origin: string;
  destination: string;
  detail: string;
  fare?: number;
  timestamp: number;
};

const STORAGE_KEY = "para_recent_trips";
const MAX_RECENT_TRIPS = 25;

export async function getRecentTrips(): Promise<RecentTrip[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as RecentTrip[];
  } catch (error) {
    console.error("Error reading recent trips: ", error);
    return [];
  }
}

export async function addRecentTrip(
  trip: Omit<RecentTrip, "id" | "timestamp">,
): Promise<RecentTrip[]> {
  try {
    const existing = await getRecentTrips();

    const isDuplicateOfLatest =
      existing[0]?.origin === trip.origin &&
      existing[0]?.destination === trip.destination &&
      existing[0]?.detail === trip.detail;

    const newTrip: RecentTrip = {
      ...trip,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
    };

    const updated = isDuplicateOfLatest
      ? [newTrip, ...existing.slice(1)]
      : [newTrip, ...existing];

    const trimmed = updated.slice(0, MAX_RECENT_TRIPS);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    return trimmed;
  } catch (error) {
    console.error("Error saving recent trip: ", error);
    return getRecentTrips();
  }
}

export async function deleteRecentTrip(id: string): Promise<RecentTrip[]> {
  try {
    const existing = await getRecentTrips();
    const updated = existing.filter((t) => t.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error("Error deleting recent trip: ", error);
    return getRecentTrips();
  }
}

export async function clearRecentTrips(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Error clearning recent trips: ", error);
  }
}
