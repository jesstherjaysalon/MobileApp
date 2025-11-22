import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import LinearGradient from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import api from "../api";

const getStatusStyle = (status) => {
  switch (status) {
    case "completed":
      return { backgroundColor: "#dcfce7", color: "#166534" };
    case "ongoing":
      return { backgroundColor: "#fef9c3", color: "#854d0e" };
    case "pending":
      return { backgroundColor: "#e0f2fe", color: "#075985" };
    case "missed":
      return { backgroundColor: "#fee2e2", color: "#7f1d1d" };
    default:
      return { backgroundColor: "#f3f4f6", color: "#4b5563" };
  }
};

export default function ReschedDetails() {
  const route = useRoute();
  const navigation = useNavigation();
  const { rescheduleId, truckId } = route.params;

  const [details, setDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const response = await api.get(`/reschedules/${rescheduleId}/details`);
        setDetails(response.data?.rescheduleDetails || []);
      } catch (err) {
        setError(
          err.response?.data?.message || "Unable to fetch reschedule details"
        );
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [rescheduleId]);

  const handleStartRoute = async () => {
    if (!details || details.length === 0) {
      Alert.alert("Error", "No reschedule details available to start");
      return;
    }

    try {
      const firstSegment = details[0];
      const payload = { start_time: new Date().toISOString() };

      await api.patch(`/resched-details/${firstSegment.id}/status`, payload);

      const updated = [...details];
      updated[0] = { ...firstSegment, start_time: payload.start_time };
      setDetails(updated);

      const coordinates = details.map((d) => [Number(d.from_lng), Number(d.from_lat)]);
      const last = details[details.length - 1];
      coordinates.push([Number(last.to_lng), Number(last.to_lat)]);

      navigation.navigate("ReschedProgress", {
        rescheduleId,
        truckId,
        coordinates,
      });
    } catch (err) {
      console.error("❌ Failed to start route:", err.response?.data || err.message);
      Alert.alert("Error", "Failed to start the first segment");
    }
  };

  if (loading)
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#166534" />
        <Text style={{ marginTop: 12, color: "#166534" }}>
          Loading reschedule details...
        </Text>
      </SafeAreaView>
    );

  if (error)
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.error}>⚠️ {error}</Text>
      </SafeAreaView>
    );

  const totalDistance = details.reduce(
    (sum, r) => sum + Number(r.distance_km || 0),
    0
  );
  const totalDuration = details.reduce(
    (sum, r) => sum + Number(r.duration_min || 0),
    0
  );

  const isCompleted = details.every((d) => d.status === "completed");
  const hasMissed = details.some((d) => d.status === "missed");
  const hasPending = details.some((d) => d.status === "pending");

  const renderSummary = () => (
    <View style={styles.summaryRow}>
      <View style={styles.summaryCard}>
        <Icon name="map-marker-distance" size={28} color="#166534" />
        <Text style={styles.summaryLabel}>Total Distance</Text>
        <Text style={styles.summaryValue}>{totalDistance.toFixed(2)} km</Text>
      </View>
      <View style={styles.summaryCard}>
        <Icon name="clock-outline" size={28} color="#166534" />
        <Text style={styles.summaryLabel}>Total Duration</Text>
        <Text style={styles.summaryValue}>{Math.round(totalDuration)} min</Text>
      </View>
    </View>
  );

  const renderSegment = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardBody}>
        <View style={styles.routeRow}>
          <View style={styles.iconsColumn}>
            <Icon name="map-marker-circle" size={24} color="#16a34a" />
            <View style={styles.verticalLine} />
            <Icon name="flag-checkered" size={24} color="#dc2626" />
          </View>

          <View style={styles.detailsColumn}>
            <View style={styles.detailRow}>
              <Text style={styles.label}>From</Text>
              <Text style={styles.value}>{item.from_label}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>To</Text>
              <Text style={styles.value}>{item.to_label}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Distance</Text>
              <Text style={styles.value}>{item.distance_km} km</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Duration</Text>
              <Text style={styles.value}>{item.duration_min} min</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Speed</Text>
              <Text style={styles.value}>{item.speed_kmh} km/h</Text>
            </View>
            <View style={[styles.detailRow, { marginTop: 8 }]}>
              <Text style={styles.label}>Status</Text>
              <Text style={[styles.status, getStatusStyle(item.status)]}>
                {item.status}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={["#4ade80", "#16a34a", "#166534"]}
            style={styles.header}
          >
            <View style={styles.headerContent}>
              <Icon name="calendar-refresh" size={30} color="#fff" style={{ marginBottom: 8 }} />
              <Text style={styles.headerTitle}>Reschedule #{rescheduleId}</Text>
              <Text style={styles.headerSubtitle}>Truck #{truckId}</Text>
            </View>
          </LinearGradient>

          {renderSummary()}

          <Text style={styles.sectionTitle}>Reschedule Segments</Text>

          {details.length > 0 ? (
            <FlatList
              data={details}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderSegment}
              scrollEnabled={false}
            />
          ) : (
            <Text style={styles.noData}>No reschedule details found.</Text>
          )}
        </ScrollView>

        <SafeAreaView edges={["bottom"]} style={styles.bottomButtonContainer}>
          {isCompleted ? (
            <View style={[styles.fab, { backgroundColor: "#22c55e" }]}>
              <Icon name="check-circle-outline" size={24} color="#fff" />
              <Text style={styles.fabText}>Completed</Text>
            </View>
          ) : hasMissed ? (
            <View style={[styles.fab, { backgroundColor: "#9ca3af" }]}>
              <Icon name="close-circle-outline" size={24} color="#fff" />
              <Text style={styles.fabText}>Cannot Start</Text>
            </View>
          ) : hasPending ? (
            <TouchableOpacity style={styles.fab} onPress={handleStartRoute}>
              <Icon name="truck" size={24} color="#fff" />
              <Text style={styles.fabText}>Start Route</Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.fab, { backgroundColor: "#facc15" }]}>
              <Icon name="alert-circle-outline" size={24} color="#000" />
              <Text style={[styles.fabText, { color: "#000" }]}>No Segments</Text>
            </View>
          )}
        </SafeAreaView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f9fafb" },
  container: { flex: 1 },
  scrollArea: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  error: { color: "red", textAlign: "center" },

  header: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingVertical: 40,
    alignItems: "center",
    elevation: 4,
  },
  headerContent: { alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 24, fontWeight: "800" },
  headerSubtitle: { color: "#d1fae5", fontSize: 14, marginTop: 4 },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 24,
  },
  summaryCard: {
    width: "45%",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: "center",
    elevation: 3,
  },
  summaryLabel: { fontSize: 14, color: "#166534", marginTop: 6 },
  summaryValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#166534",
    marginTop: 2,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#166534",
    marginLeft: 18,
    marginBottom: 10,
  },

  card: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 18,
    elevation: 3,
    padding: 16,
  },
  cardBody: { marginTop: 0 },

  routeRow: { flexDirection: "row", gap: 12 },
  iconsColumn: { alignItems: "center", width: 40 },
  verticalLine: { width: 2, flex: 1, backgroundColor: "#94a3b8", marginVertical: 4 },
  detailsColumn: { flex: 1 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 2 },

  label: { fontSize: 14, color: "#166534" },
  value: { fontSize: 14, fontWeight: "600", color: "#14532d" },

  status: {
    fontSize: 13,
    fontWeight: "600",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    textTransform: "capitalize",
  },

  bottomButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#f9fafb",
    paddingVertical: 14,
    alignItems: "center",
    borderTopWidth: 0.5,
    borderColor: "#e5e7eb",
  },
  fab: {
    flexDirection: "row",
    backgroundColor: "#166534",
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: "center",
    gap: 8,
    elevation: 6,
  },
  fabText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  noData: {
    textAlign: "center",
    color: "#6b7280",
    marginTop: 30,
    fontSize: 16,
  },
});
