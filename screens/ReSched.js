import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
  Platform,
  RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import api from "../api";

export default function ReSched() {
  const [schedules, setSchedules] = useState([]); // must be array
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const navigation = useNavigation();

  // Fetch schedules
  const fetchSchedules = async () => {
    try {
      const response = await api.get("/reschedules");

      // FIXED: backend returns { reschedules: [...], pendingCount: X }
      const data = response.data.reschedules ?? [];

      // Ensure array
      setSchedules(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(
        "Error fetching schedules:",
        error.response?.data || error.message
      );

      setSchedules([]); // avoid undefined
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSchedules();
  }, []);

  // Filtering
  const filteredSchedules = schedules.filter((item) => {
    const text = search.toLowerCase();

    return (
      item.truck?.model?.toLowerCase().includes(text) ||
      item.driver?.user?.name?.toLowerCase().includes(text) ||
      item.barangay?.name?.toLowerCase().includes(text) ||
      item.pickup_datetime?.toLowerCase().includes(text)
    );
  });

  const formatPickup = (datetime) => {
    if (!datetime) return "No pickup date";
    const date = new Date(datetime);
    return date.toLocaleString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: undefined,
      hour12: true,
    });
  };

  const renderZones = (zones) => {
    if (!zones || zones.length === 0) return null;

    const rows = [];
    for (let i = 0; i < zones.length; i += 2) {
      rows.push(zones.slice(i, i + 2));
    }

    return (
      <View style={styles.zoneContainer}>
        <Text style={styles.zoneTitle}>Zones</Text>
        {rows.map((row, index) => (
          <View key={index} style={styles.zoneRow}>
            {row.map((zone) => (
              <View key={zone.id} style={styles.zoneCell}>
                <MaterialIcons
                  name="map"
                  size={16}
                  color="#065f46"
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.zoneText}>{zone.name}</Text>
              </View>
            ))}
            {row.length === 1 && (
              <View style={[styles.zoneCell, { opacity: 0 }]} />
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[
        styles.card,
        item.status === "completed" && { opacity: 0.75 },
        item.status === "inactive" && { backgroundColor: "#fff4f4" },
      ]}
      onPress={() =>
        navigation.navigate("ReschedDetails", {
          rescheduleId: item.id,
          truckId: item.truck?.id,
        })
      }
    >
      <View style={styles.cardHeader}>
        <View style={styles.rowCenter}>
          <MaterialIcons name="local-shipping" size={22} color="#065f46" />
          <Text style={styles.truckText}>{item.truck?.model || "N/A"}</Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                item.status === "pending"
                  ? "#F59E0B"
                  : item.status === "completed"
                  ? "#10B981"
                  : "#EF4444",
            },
          ]}
        >
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <MaterialIcons name="person" size={18} color="#2E7D32" />
        <Text style={styles.infoText}>
          {item.driver?.user?.name || "No driver assigned"}
        </Text>
      </View>

      <View style={styles.infoRow}>
        <MaterialIcons name="location-city" size={18} color="#2E7D32" />
        <Text style={styles.infoText}>
          {item.barangay?.name || "No barangay"}
        </Text>
      </View>

      <View style={styles.infoRow}>
        <MaterialIcons name="access-time" size={18} color="#2E7D32" />
        <Text style={styles.infoText}>
          Pickup: {formatPickup(item.pickup_datetime)}
        </Text>
      </View>

      {item.remarks && (
        <View style={styles.infoRow}>
          <MaterialIcons name="notes" size={18} color="#2E7D32" />
          <Text style={styles.remarksText}>{item.remarks}</Text>
        </View>
      )}

      {renderZones(item.zones)}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#1B5E20" />
          <Text style={styles.loadingText}>Loading schedules...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle={Platform.OS === "ios" ? "dark-content" : "light-content"}
        backgroundColor="#1B5E20"
      />
      <View style={styles.container}>
        <Text style={styles.headerTitle}>Reschedule List</Text>

        <Text style={styles.description}>
          View all rescheduled waste collection schedules below. Tap a schedule
          to see detailed route information and zone assignments.
        </Text>

        <TextInput
          style={styles.searchBar}
          placeholder="Search schedules..."
          placeholderTextColor="#4E7D4A"
          value={search}
          onChangeText={setSearch}
        />

        <FlatList
          data={filteredSchedules}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No matching schedules found.</Text>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAF8",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 8,
    color: "#1B5E20",
    textAlign: "center",
  },
  description: {
    fontSize: 15,
    color: "#4b5563",
    marginBottom: 16,
    textAlign: "center",
    lineHeight: 20,
  },
  searchBar: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#1B5E20",
    borderWidth: 1,
    borderColor: "#C8E6C9",
    marginBottom: 16,
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 22,
    marginVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    borderLeftWidth: 5,
    borderLeftColor: "#15803d",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  rowCenter: {
    flexDirection: "row",
    alignItems: "center",
  },
  truckText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#065f46",
    marginLeft: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: {
    color: "#FFFFFF",
    fontWeight: "600",
    textTransform: "capitalize",
  },
  infoText: {
    fontSize: 14,
    color: "#2E7D32",
    marginLeft: 6,
  },
  remarksText: {
    fontSize: 13,
    color: "#2E7D32",
    fontStyle: "italic",
    marginLeft: 6,
  },
  zoneContainer: {
    marginTop: 12,
    backgroundColor: "#E8F5E9",
    padding: 10,
    borderRadius: 12,
  },
  zoneTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#065f46",
    marginBottom: 6,
  },
  zoneRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  zoneCell: {
    flexDirection: "row",
    alignItems: "center",
    width: "48%",
    backgroundColor: "#dcfce7",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  zoneText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#065f46",
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 8,
    fontSize: 16,
    color: "#1B5E20",
    fontWeight: "500",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 50,
    fontSize: 15,
    color: "#4CAF50",
    fontWeight: "500",
  },
});
