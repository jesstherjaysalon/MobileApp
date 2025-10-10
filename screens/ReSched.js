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
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const navigation = useNavigation();

  // ✅ Fetch schedules
  const fetchSchedules = async () => {
    try {
      const response = await api.get("/reschedules");
      setSchedules(response.data);
    } catch (error) {
      console.error("Error fetching schedules:", error.response?.data || error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  // ✅ Pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSchedules();
  }, []);

  // ✅ Filtering + Searching (now includes pickup date)
  const filteredSchedules = schedules.filter((item) => {
    const text = search.toLowerCase();
    const matchesSearch =
      item.truck?.model?.toLowerCase().includes(text) ||
      item.driver?.user?.name?.toLowerCase().includes(text) ||
      item.barangay?.name?.toLowerCase().includes(text) ||
      item.pickup_datetime?.toLowerCase().includes(text);

    const matchesFilter =
      filter === "all" ? true : item.status.toLowerCase() === filter;

    return matchesSearch && matchesFilter;
  });

  // ✅ Render each schedule card
  const renderItem = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.card}
      onPress={() =>
        navigation.navigate("ReschedDetails", {
          rescheduleId: item.id,
          truckId: item.truck?.id,
        })
      }
    >
      <View style={styles.cardHeader}>
        <View style={styles.rowCenter}>
          <MaterialIcons name="local-shipping" size={22} color="#1B5E20" />
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
        <Text style={styles.infoText}>{item.barangay?.name || "No barangay"}</Text>
      </View>

      <View style={styles.infoRow}>
        <MaterialIcons name="access-time" size={18} color="#2E7D32" />
        <Text style={styles.infoText}>Pickup: {item.pickup_datetime}</Text>
      </View>

      {item.remarks ? (
        <View style={styles.infoRow}>
          <MaterialIcons name="notes" size={18} color="#2E7D32" />
          <Text style={styles.remarksText}>{item.remarks}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );

  // ✅ Loading state
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

  // ✅ Main layout
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle={Platform.OS === "ios" ? "dark-content" : "light-content"}
        backgroundColor="#1B5E20"
      />
      <View style={styles.container}>
        <Text style={styles.headerTitle}>Reschedule List</Text>

        <TextInput
          style={styles.searchBar}
          placeholder="Search by pickup date"
          placeholderTextColor="#4E7D4A"
          value={search}
          onChangeText={setSearch}
        />

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
    marginBottom: 14,
    color: "#1B5E20",
    textAlign: "center",
    letterSpacing: 0.5,
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
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    marginBottom: 16,
  },
  filterRow: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    marginBottom: 12,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 25,
    backgroundColor: "#E8F5E9",
    borderWidth: 1,
    borderColor: "#A5D6A7",
  },
  filterButtonActive: {
    backgroundColor: "#1B5E20",
    borderColor: "#1B5E20",
  },
  filterText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1B5E20",
  },
  filterTextActive: {
    color: "#FFFFFF",
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "#E0F2F1",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  rowCenter: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  truckText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1B5E20",
    marginLeft: 6,
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
    fontSize: 13,
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
