// Schedule.js
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getUser } from "../storageUtils";
import { useNavigation } from "@react-navigation/native";
import api from "../api";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

export default function Schedule() {
  const [user, setUser] = useState(null);
  const [routePlans, setRoutePlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const navigation = useNavigation();

  const groupBySchedule = (plans) => {
    const groups = {};
    plans.forEach((plan) => {
      const scheduleId = plan.schedule?.id || "no-schedule-id";
      if (!groups[scheduleId]) groups[scheduleId] = [];
      groups[scheduleId].push(plan);
    });
    return groups;
  };

  const fetchRoutePlans = useCallback(async () => {
    try {
      setError(null);
      const storedUser = await getUser();
      setUser(storedUser);

      const response = await api.get("/route-plans");
      setRoutePlans(response.data.routePlans || []);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Unable to fetch schedule data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRoutePlans();
  }, [fetchRoutePlans]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRoutePlans();
  }, [fetchRoutePlans]);

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#166534" />
        <Text style={styles.loadingText}>Loading schedules...</Text>
      </View>
    );

  if (error)
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );

  const groupedSchedules = groupBySchedule(routePlans);

  const sortedSchedules = Object.entries(groupedSchedules).sort((a, b) => {
    const aDate = new Date(a[1][0]?.schedule?.pickup_datetime).getTime() || 0;
    const bDate = new Date(b[1][0]?.schedule?.pickup_datetime).getTime() || 0;
    return bDate - aDate;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f6fef7" />

      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerRow}>
          <MaterialIcons name="event-note" size={30} color="#166534" />
          <Text style={styles.headerText}>Schedules</Text>
        </View>

        {/* Description */}
        <Text style={styles.description}>
          View your assigned waste collection schedules below. Tap a schedule to
          see detailed route information and zone assignments.
        </Text>

        {/* Schedule List */}
        {sortedSchedules.length > 0 ? (
          <FlatList
            data={sortedSchedules}
            keyExtractor={([scheduleId]) => scheduleId}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={{ paddingBottom: 120 }}
            renderItem={({ item }) => {
              const [scheduleId, plans] = item;
              const schedule = plans[0]?.schedule;

              const pickupDateTime = schedule?.pickup_datetime;
              const scheduleName = pickupDateTime
                ? new Date(pickupDateTime).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })
                : "No Pickup Date";

              const barangayName = schedule?.barangay?.name || "N/A";
              const truck = schedule?.truck;
              const truckInfo = truck
                ? `${truck.plate_number || "N/A"} (${truck.model || "No model"})`
                : "N/A";

              const status = schedule?.status || "Unknown";
              const statusLower = status.toLowerCase();

              const statusStyle =
                statusLower === "pending"
                  ? styles.pendingBadge
                  : statusLower === "inactive"
                  ? styles.inactiveBadge
                  : styles.completedBadge;

              return (
                <TouchableOpacity
                  style={[
                    styles.card,
                    statusLower === "inactive" && { backgroundColor: "#fff4f4" },
                    statusLower === "completed" && { opacity: 0.75 },
                  ]}
                  activeOpacity={0.85}
                  disabled={statusLower === "completed"}
                  onPress={() =>
                    navigation.navigate("RouteDetailsScreen", {
                      routePlanId: schedule?.id,
                      truckId: schedule?.truck?.id,
                      pickup_datetime: schedule?.pickup_datetime,
                    })
                  }
                >
                  {/* HEADER */}
                  <View style={styles.cardHeader}>
                    <MaterialIcons
                      name="schedule"
                      size={24}
                      color="#14532d"
                      style={{ marginRight: 10 }}
                    />
                    <Text style={styles.pickupDate}>{scheduleName}</Text>
                  </View>

                  {/* INFO */}
                  <View style={styles.infoRow}>
                    <View style={styles.infoItem}>
                      <MaterialIcons
                        name="location-city"
                        size={20}
                        color="#166534"
                      />
                      <Text style={styles.infoValue}>{barangayName}</Text>
                    </View>

                    <View style={styles.infoItem}>
                      <MaterialIcons
                        name="local-shipping"
                        size={20}
                        color="#166534"
                      />
                      <Text style={styles.infoValue}>{truckInfo}</Text>
                    </View>
                  </View>

                  {/* STATUS */}
                  <View style={styles.statusContainer}>
                    <MaterialIcons
                      name="assignment-turned-in"
                      size={20}
                      color="#166534"
                    />
                    <View style={[styles.statusBadge, statusStyle]}>
                      <Text style={styles.statusText}>{status}</Text>
                    </View>
                  </View>

                  {/* ZONES */}
                  <Text style={styles.zonesHeader}>Zones</Text>

                  <View style={styles.zoneGrid}>
                    {plans.map((plan, index) => (
                      <View key={index} style={styles.zoneCell}>
                        <MaterialIcons
                          name="map"
                          size={18}
                          color="#166534"
                          style={{ marginRight: 4 }}
                        />
                        <Text style={styles.zoneName}>
                          {plan.zone?.name || "Unnamed Zone"}
                        </Text>
                      </View>
                    ))}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        ) : (
          <Text style={styles.noData}>No schedules found.</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

// ---------------------  STYLES  -----------------------

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f6fef7",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  container: { flex: 1, paddingHorizontal: 18, paddingTop: 10 },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10, color: "#166534", fontWeight: "600" },

  errorText: {
    fontSize: 16,
    color: "#c62828",
    textAlign: "center",
    marginHorizontal: 20,
  },
  retryBtn: {
    marginTop: 10,
    backgroundColor: "#166534",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  retryText: { color: "#fff", fontWeight: "600" },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  headerText: {
    fontSize: 28,
    fontWeight: "900",
    color: "#064e3b",
    marginLeft: 10,
  },

  description: {
    fontSize: 15,
    color: "#4b5563",
    marginBottom: 25,
    lineHeight: 20,
  },

  /* BIG MODERN CARD */
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 22,
    marginBottom: 26,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    borderLeftWidth: 5,
    borderLeftColor: "#15803d",
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  pickupDate: {
    fontSize: 20,
    fontWeight: "800",
    color: "#065f46",
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#064e3b",
    marginLeft: 6,
  },

  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  statusBadge: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginLeft: 8,
  },
  statusText: { fontWeight: "700", color: "#fff" },

  pendingBadge: { backgroundColor: "#4caf50" },
  inactiveBadge: { backgroundColor: "#e53935" },
  completedBadge: { backgroundColor: "#9e9e9e" },

  zonesHeader: {
    fontSize: 17,
    fontWeight: "800",
    color: "#065f46",
    marginBottom: 10,
  },

  /* 2-COLUMN GRID LAYOUT */
  zoneGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  zoneCell: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#dcfce7",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  zoneName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#065f46",
  },

  noData: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 40,
    fontWeight: "500",
  },
});
