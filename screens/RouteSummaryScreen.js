// RouteSummaryScreen.jsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  StatusBar,
  Platform,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import CheckBox from "@react-native-community/checkbox";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import LinearGradient from "react-native-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import api from "../api";

export default function RouteSummaryScreen() {
  const navigation = useNavigation();
  const { params } = useRoute() || {};
  const insets = useSafeAreaInsets();

  const { routePlanId, completedCount = 0, missedZones = [] } = params || {};

  // ✅ Hooks must be declared unconditionally at the top
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState(null);
  const [reasons, setReasons] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [summary, setSummary] = useState(null);

  // Fetch schedule and summary on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!routePlanId) return;

        const scheduleRes = await api.get(`/garbage-schedules/${routePlanId}`);
        setSchedule(scheduleRes.data);

        const summaryRes = await api.get(`/summary/${routePlanId}`);
        setSummary(summaryRes.data.data);
      } catch (err) {
        console.error("❌ Failed to fetch summary:", err.response?.data || err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [routePlanId]);

  const toggleReason = (zoneId, reason) => {
    setReasons((prev) => {
      const current = prev[zoneId] || [];
      return current.includes(reason)
        ? { ...prev, [zoneId]: current.filter((r) => r !== reason) }
        : { ...prev, [zoneId]: [...current, reason] };
    });
  };

  const handleFinish = async () => {
    setSubmitting(true);
    setSubmitted(false);

    try {
      const allReasons = Object.values(reasons).flat();
      const uniqueReasons = [...new Set(allReasons)];
      const missedCount =
        missedZones && missedZones.length > 0 ? missedZones.length : Object.keys(reasons).length;

      const start = summary?.first_start_time ? new Date(summary.first_start_time) : null;
      const end = summary?.last_completed_at ? new Date(summary.last_completed_at) : null;

      let totalDurationSecs = 0;
      if (start && end) totalDurationSecs = Math.floor((end - start) / 1000);

      const payload = {
        schedule_id: routePlanId,
        completed_count: completedCount,
        missed_count: missedCount,
        total_duration: totalDurationSecs,
        missed_reasons: uniqueReasons,
      };

      await api.post("/route-summaries", payload);

      setSubmitted(true);
      setTimeout(() => {
        setSubmitting(false);
        navigation.navigate("Home");
      }, 1200);
    } catch (err) {
      console.error("❌ Error submitting summary:", err.response?.data || err.message);
      setSubmitting(false);
    }
  };

  // Compute Total Duration
  const totalDuration = summary?.first_start_time && summary?.last_completed_at
    ? (() => {
        const diffSecs = (new Date(summary.last_completed_at) - new Date(summary.first_start_time)) / 1000;
        const mins = Math.floor(diffSecs / 60);
        const secs = Math.floor(diffSecs % 60);
        return mins > 0 ? `${mins} min ${secs} sec` : `${secs} sec`;
      })()
    : "0 sec";

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading summary...</Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : insets.top }]}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#f3f4f6" />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Schedule Card */}
        <LinearGradient colors={["#4f46e5", "#2563eb"]} style={styles.scheduleCard}>
          <Text style={styles.cardHeader}>Schedule Details</Text>
          <View style={styles.row}>
            <MaterialIcons name="event" size={22} color="#fff" />
            <Text style={styles.scheduleText}>
              {schedule?.pickup_datetime ? new Date(schedule.pickup_datetime).toLocaleDateString() : "No date"}
            </Text>
          </View>
          <View style={styles.row}>
            <MaterialIcons name="access-time" size={22} color="#fff" />
            <Text style={styles.scheduleText}>
              {schedule?.pickup_datetime ? new Date(schedule.pickup_datetime).toLocaleTimeString() : "No time"}
            </Text>
          </View>
          <View style={styles.row}>
            <MaterialIcons name="person" size={22} color="#fff" />
            <Text style={styles.scheduleText}>Driver: {schedule?.driver?.user?.name || "N/A"}</Text>
          </View>
          <View style={styles.row}>
            <MaterialIcons name="local-shipping" size={22} color="#fff" />
            <Text style={styles.scheduleText}>
              Truck: {schedule?.truck ? `${schedule.truck.plate_number} (${schedule.truck.model})` : "N/A"}
            </Text>
          </View>
        </LinearGradient>

        {/* Stats Card */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Route Overview</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <MaterialIcons name="check-circle" size={30} color="#16a34a" />
              <Text style={styles.statValue}>{completedCount}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statBox}>
              <MaterialIcons name="cancel" size={30} color="#dc2626" />
              <Text style={styles.statValue}>{missedZones.length}</Text>
              <Text style={styles.statLabel}>Missed</Text>
            </View>
            <View style={styles.statBox}>
              <MaterialIcons name="schedule" size={30} color="#2563eb" />
              <Text style={styles.statValue}>{totalDuration}</Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>
          </View>
        </View>

        {/* Missed Zones */}
        {missedZones.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardHeader}>Missed Segments</Text>
            <ScrollView style={{ maxHeight: 280 }}>
              {missedZones.map((zone, idx) => (
                <View key={zone.id || idx} style={styles.zoneContainer}>
                  <View style={styles.zoneHeader}>
                    <MaterialIcons name="place" size={20} color="#2563eb" />
                    <Text style={styles.zoneText}>{zone.to_name || "Unknown Zone"}</Text>
                  </View>
                  <View style={styles.checkboxRow}>
                    <CheckBox
                      value={reasons[zone.id]?.includes("Not segregated") || false}
                      onValueChange={() => toggleReason(zone.id, "Not segregated")}
                      tintColors={{ true: "#2563eb", false: "#9ca3af" }}
                    />
                    <Text style={styles.checkboxLabel}>Not segregated</Text>
                  </View>
                  <View style={styles.checkboxRow}>
                    <CheckBox
                      value={reasons[zone.id]?.includes("Flooding / Flat tire / Damage") || false}
                      onValueChange={() => toggleReason(zone.id, "Flooding / Flat tire / Damage")}
                      tintColors={{ true: "#2563eb", false: "#9ca3af" }}
                    />
                    <Text style={styles.checkboxLabel}>Flooding / Flat tire / Damage</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Finish Button */}
        <TouchableOpacity style={styles.button} onPress={handleFinish} activeOpacity={0.85}>
          <LinearGradient colors={["#4f46e5", "#2563eb"]} style={styles.buttonInner}>
            <MaterialIcons name="done" size={22} color="#fff" />
            <Text style={styles.buttonText}>Finish & Submit</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal */}
      <Modal transparent visible={submitting}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            {submitted ? (
              <>
                <MaterialIcons name="check-circle" size={56} color="#16a34a" />
                <Text style={styles.modalText}>Summary Submitted!</Text>
              </>
            ) : (
              <>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={styles.modalText}>Submitting summary...</Text>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, color: "#6b7280", fontSize: 16, fontWeight: "600" },

  scheduleCard: {
    margin: 16,
    padding: 20,
    borderRadius: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  cardHeader: { fontSize: 18, fontWeight: "700", marginBottom: 12, color: "#fff" },
  row: { flexDirection: "row", alignItems: "center", marginVertical: 6 },
  scheduleText: { fontSize: 15, fontWeight: "600", marginLeft: 8, color: "#fff" },

  statsCard: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 24,
    borderRadius: 22,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  statsTitle: { fontSize: 20, fontWeight: "700", color: "#111827", marginBottom: 16 },
  statsRow: { flexDirection: "row", justifyContent: "space-between" },
  statBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 18,
    marginHorizontal: 6,
    borderRadius: 16,
    backgroundColor: "#f9fafb",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  statValue: { fontSize: 18, fontWeight: "700", color: "#111827", marginTop: 6 },
  statLabel: { fontSize: 14, color: "#6b7280", marginTop: 2 },

  card: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  zoneContainer: {
    backgroundColor: "#f9fafb",
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  zoneHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  zoneText: { fontSize: 15, fontWeight: "600", marginLeft: 6, color: "#111827" },
  checkboxRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  checkboxLabel: { fontSize: 14, color: "#111827", marginLeft: 8 },

  button: { margin: 20, borderRadius: 18, overflow: "hidden", elevation: 4 },
  buttonInner: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16, marginLeft: 8 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "80%",
    backgroundColor: "#fff",
    padding: 28,
    borderRadius: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  modalText: { marginTop: 12, fontSize: 16, fontWeight: "600", color: "#374151" },
});
