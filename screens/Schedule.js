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
  const [filter, setFilter] = useState("all");

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
      setError(
        err.response?.data?.message || "Unable to fetch schedule data."
      );
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
        <ActivityIndicator size="large" color="#006400" />
        <Text style={{ marginTop: 10, color: "#006400", fontWeight: "600" }}>
          Loading schedules...
        </Text>
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

  const filteredPlans =
    filter === "all"
      ? routePlans
      : routePlans.filter(
          (plan) => plan.schedule?.status?.toLowerCase() === filter
        );

  const groupedSchedules = groupBySchedule(filteredPlans);

  const sortedSchedules = Object.entries(groupedSchedules).sort((a, b) => {
    const aDate = new Date(a[1][0]?.schedule?.pickup_datetime).getTime() || 0;
    const bDate = new Date(b[1][0]?.schedule?.pickup_datetime).getTime() || 0;
    return bDate - aDate;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#eafbea" />

      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerRow}>
          <MaterialIcons name="event-note" size={26} color="#006400" />
          <Text style={styles.headerText}>
            Schedules for {user?.name || "User"}
          </Text>
        </View>

        {/* Filter Buttons */}
        <View style={styles.filterRow}>
          {["all", "pending", "completed"].map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterButton,
                filter === status && styles.filterButtonActive,
              ]}
              onPress={() => setFilter(status)}
            >
              <MaterialIcons
                name={
                  status === "all"
                    ? "list"
                    : status === "pending"
                    ? "schedule"
                    : "check-circle"
                }
                size={18}
                color={filter === status ? "#fff" : "#1b5e20"}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.filterText,
                  filter === status && styles.filterTextActive,
                ]}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Schedule List */}
        {sortedSchedules.length > 0 ? (
          <FlatList
            data={sortedSchedules}
            keyExtractor={([scheduleId]) => scheduleId}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={{ paddingBottom: 100 }}
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
                  ? styles.activeBadge
                  : statusLower === "inactive"
                  ? styles.inactiveBadge
                  : styles.completedBadge;

              return (
                <TouchableOpacity
                  style={[
                    styles.card,
                    statusLower === "inactive" && { backgroundColor: "#ffebee" },
                    statusLower === "completed" && { opacity: 0.7 },
                  ]}
                  activeOpacity={0.9}
                  disabled={statusLower === "completed"}
                  onPress={() =>
                    navigation.navigate("RouteDetailsScreen", {
                      routePlanId: schedule?.id,
                      truckId: schedule?.truck?.id,
                      pickup_datetime: schedule?.pickup_datetime,
                    })
                  }
                >
                  <View style={styles.cardHeader}>
                    <MaterialIcons
                      name="schedule"
                      size={20}
                      color="#2e7d32"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.pickupDate}>{scheduleName}</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <View style={styles.infoItem}>
                      <MaterialIcons
                        name="location-city"
                        size={18}
                        color="#2e7d32"
                      />
                      <Text style={styles.infoValue}>{barangayName}</Text>
                    </View>

                    <View style={styles.infoItem}>
                      <MaterialIcons
                        name="local-shipping"
                        size={18}
                        color="#2e7d32"
                      />
                      <Text style={styles.infoValue}>{truckInfo}</Text>
                    </View>

                    <View style={styles.infoItem}>
                      <MaterialIcons
                        name="assignment-turned-in"
                        size={18}
                        color="#2e7d32"
                      />
                      <View style={[styles.statusBadge, statusStyle]}>
                        <Text style={styles.statusText}>{status}</Text>
                      </View>
                    </View>
                  </View>

                  <Text style={styles.zonesHeader}>Zones</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                  >
                    {plans.map((plan, index) => (
                      <View key={index} style={styles.zoneItem}>
                        <MaterialIcons
                          name="map"
                          size={16}
                          color="#006400"
                          style={{ marginRight: 4 }}
                        />
                        <Text style={styles.zoneName}>
                          {plan.zone?.name || "Unnamed Zone"}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                </TouchableOpacity>
              );
            }}
          />
        ) : (
          <Text style={styles.noData}>No schedules found</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#eafbea",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  container: { flex: 1, paddingHorizontal: 18, paddingTop: 12 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  headerText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#004d00",
    marginLeft: 10,
  },
  errorText: {
    fontSize: 16,
    color: "#c62828",
    textAlign: "center",
    marginHorizontal: 20,
  },
  retryBtn: {
    marginTop: 10,
    backgroundColor: "#006400",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  retryText: { color: "#fff", fontWeight: "600" },
  filterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#c8e6c9",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 24,
  },
  filterButtonActive: { backgroundColor: "#006400" },
  filterText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1b5e20",
  },
  filterTextActive: { color: "#fff" },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: "#2e7d32",
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  pickupDate: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1b5e20",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  infoItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 6,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1b5e20",
    marginLeft: 6,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginLeft: 6,
  },
  statusText: { fontWeight: "700", color: "#fff" },
  activeBadge: { backgroundColor: "#4caf50" },
  inactiveBadge: { backgroundColor: "#f44336" },
  completedBadge: { backgroundColor: "#9e9e9e" },
  zonesHeader: {
    fontSize: 15,
    fontWeight: "700",
    color: "#004d00",
    marginTop: 8,
    marginBottom: 6,
  },
  zoneItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#c8e6c9",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginRight: 8,
  },
  zoneName: { fontSize: 14, fontWeight: "600", color: "#004d00" },
  noData: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 40,
    fontWeight: "500",
  },
});
