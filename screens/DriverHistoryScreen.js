import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LinearGradient from "react-native-linear-gradient";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import dayjs from "dayjs";
import api from "../api";
import HistoryDetailsModal from "../modals/HistoryDetailsModal";

export default function DriverHistoryScreen() {
  // State hooks
  const [history, setHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);

  // Fetch history when component mounts
  useEffect(() => {
    loadHistory();
  }, []);

  // Filter history when search text changes
  useEffect(() => {
    if (!searchText) {
      setFilteredHistory(history);
      return;
    }

    const searchLower = searchText.toLowerCase();
    const filtered = history.filter(
      (item) =>
        item.barangay?.toLowerCase().includes(searchLower) ||
        item.title?.toLowerCase().includes(searchLower) ||
        dayjs(item.datetime).format("MMM D, YYYY").toLowerCase().includes(searchLower)
    );
    setFilteredHistory(filtered);
  }, [searchText, history]);

  // Load history from API
  const loadHistory = async () => {
    try {
      setLoading(true);
      const res = await api.get("/driver/history");
      const merged = [];

      // Merge schedules
      res.data.schedules.forEach((s) => {
        merged.push({
          id: s.id,
          type: "schedule",
          title: "Schedule",
          datetime: s.pickup_datetime,
          complete_at: s.complete_at || null,
          barangay: s.barangay?.name || "N/A",
          status: s.status,
        });
      });

      // Merge reschedules
      res.data.reschedules.forEach((r) => {
        merged.push({
          id: r.id,
          type: "reschedule",
          title: "Reschedule",
          datetime: r.pickup_datetime,
          complete_at: r.complete_at || null,
          barangay: r.barangay?.name || "N/A",
          status: r.status,
        });
      });

      // Sort by date descending
      merged.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));

      setHistory(merged);
      setFilteredHistory(merged);
    } catch (err) {
      console.error("❌ ERROR LOADING HISTORY:", err);
    } finally {
      setLoading(false);
    }
  };

  // Open modal with details
  const openDetails = (item) => {
    setSelectedItem(item);
    setModalVisible(true);
  };

  // Close modal
  const closeModal = () => {
    setSelectedItem(null);
    setModalVisible(false);
  };

  // Render each history card
  const renderItem = ({ item }) => {
    const cardColor = item.type === "schedule" ? "#E8F5E9" : "#FFF3E0";
    const borderColor = item.type === "schedule" ? "#4CAF50" : "#FF9800";

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: cardColor, borderLeftColor: borderColor }]}
        onPress={() => openDetails(item)}
        activeOpacity={0.85}
      >
        {/* Card Header: Icon + Title */}
        <View style={styles.cardHeader}>
          <MaterialIcons
            name={item.type === "schedule" ? "calendar-today" : "update"}
            size={26}
            color={borderColor}
          />
          <Text style={styles.title}>{item.title}</Text>
        </View>

        {/* Card Body */}
        <View style={styles.cardBody}>
          {/* Barangay */}
          <View style={styles.row}>
            <MaterialIcons name="location-on" size={18} color="#555" />
            <Text style={styles.label}>{item.barangay}</Text>
          </View>

          {/* Pickup Date */}
          <View style={styles.row}>
            <MaterialIcons name="event" size={18} color="#555" />
            <Text style={styles.label}>
              {dayjs(item.datetime).format("ddd, MMM D, YYYY HH:mm")}
            </Text>
          </View>

          {/* Completion Date (optional) */}
          
            <View style={styles.row}>
              <MaterialIcons name="check" size={18} color="#555" />
              <Text style={styles.label}>
                {dayjs(item.completed_at).format("ddd, MMM D, YYYY HH:mm")}
              </Text>
            </View>
        

          {/* Status Badge */}
          <View
            style={[
              styles.statusBadge,
              item.status === "completed" ? styles.completed : styles.pending,
            ]}
          >
            <Text style={styles.statusText}>{item.status?.toUpperCase() || "PENDING"}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render when no data
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="history" size={60} color="#ccc" />
      <Text style={styles.emptyText}>No history available</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2E7D32" />

      {/* Header with gradient */}
      <LinearGradient
        colors={["#A8E6A3", "#2E7D32"]}
        style={styles.headerCard}
      >
        <Text style={styles.header}>Driver History</Text>
      </LinearGradient>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={22} color="#555" />
        <TextInput
          placeholder="Search by barangay, type, or date..."
          style={styles.searchInput}
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {/* Loading indicator */}
      {loading ? (
        <ActivityIndicator size="large" color="#2E7D32" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={filteredHistory}
          keyExtractor={(item) => item.type + "_" + item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20, paddingTop: 10 }}
          ListEmptyComponent={renderEmpty}
        />
      )}

      {/* Modal for detailed view */}
      <HistoryDetailsModal
        visible={modalVisible}
        item={selectedItem}
        onClose={closeModal}
      />
    </SafeAreaView>
  );
}

// ---------------------------- STYLES ----------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },

  // Gradient header card
  headerCard: {
    paddingVertical: 22,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: "center",
    margin: 16,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },

  header: { fontSize: 28, fontWeight: "bold", color: "#fff", textAlign: "center" },

  // Search input
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 15,
    elevation: 5,
  },

  searchInput: { flex: 1, marginLeft: 10, fontSize: 16, color: "#333" },

  // History card (floating style)
  card: {
    padding: 18,
    borderRadius: 18,
    marginHorizontal: 16,
    marginBottom: 16,
    borderLeftWidth: 5,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 9,
    backgroundColor: "#fff",
  },

  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },

  cardBody: { paddingLeft: 2 },

  row: { flexDirection: "row", alignItems: "center", marginBottom: 6 },

  title: { fontSize: 18, fontWeight: "bold", marginLeft: 10, color: "#333" },

  label: { fontSize: 15, color: "#555", marginLeft: 6 },

  statusBadge: {
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    alignSelf: "flex-start",
  },

  completed: { backgroundColor: "#4CAF50" },
  pending: { backgroundColor: "#FF9800" },

  statusText: { color: "#fff", fontWeight: "bold", fontSize: 12 },

  // Empty state
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", marginTop: 50 },
  emptyText: { fontSize: 18, color: "#aaa", marginTop: 12 },
});
