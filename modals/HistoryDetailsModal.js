import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
} from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons"; // ← use this
import api from "../api";

export default function HistoryDetailsModal({ visible, item, onClose }) {
  const [details, setDetails] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && item) loadDetails();
  }, [visible, item]);

  const loadDetails = async () => {
    setLoading(true);
    try {
      const url =
        item.type === "schedule"
          ? `/driver/history/schedule/details?schedule_id=${item.id}`
          : `/driver/history/reschedule/details?reschedule_id=${item.id}`;

      const res = await api.get(url);
      console.log("Fetched details for", item.type, item.id, res.data);
      setDetails(res.data);
    } catch (error) {
      console.log("Error loading details:", error);
    }
    setLoading(false);
  };

  const formatLocation = (zoneObj, terminalObj) => {
    const zoneName = zoneObj?.name || "Unknown Zone";
    const terminalName = terminalObj?.name;
    return terminalName ? `${zoneName} : ${terminalName}` : zoneName;
  };

  const renderDetail = ({ item, index }) => {
    const from = formatLocation(item.from_zone, item.from_terminal);
    const to = formatLocation(item.to_zone, item.to_terminal);

    // Status badge colors
    const statusColor =
      item.status === "completed"
        ? "#4CAF50"
        : item.status === "pending"
        ? "#FF9800"
        : "#F44336";

    return (
      <View style={styles.detailCard}>
        <View style={styles.segmentHeader}>
          <MaterialIcons name="directions" size={20} color="#1976D2" />
          <Text style={styles.segmentTitle}> Segment {index + 1}</Text>
        </View>

        <View style={styles.locationRow}>
          <MaterialIcons name="arrow-forward" size={18} color="#555" />
          <Text style={styles.detailText}>
            <Text style={styles.bold}>From:</Text> {from}
          </Text>
        </View>

        <View style={styles.locationRow}>
          <MaterialIcons name="flag" size={18} color="#555" />
          <Text style={styles.detailText}>
            <Text style={styles.bold}>To:</Text> {to}
          </Text>
        </View>

        <Text style={styles.detailText}>Distance: {item.distance_km} km</Text>
        <Text style={styles.detailText}>Duration: {item.duration_min} min</Text>

        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.wrapper}>
        <View style={styles.box}>
          <View style={styles.header}>
            <Text style={styles.title}>Route Details</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={26} color="#333" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" style={{ marginTop: 20 }} />
          ) : details.length === 0 ? (
            <Text style={styles.noData}>No details found</Text>
          ) : (
            <FlatList
              data={details}
              keyExtractor={(x) => x.id.toString()}
              renderItem={renderDetail}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{ paddingBottom: 10 }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 20,
  },
  box: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    maxHeight: "80%", // scrollable
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
  },
  segmentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  segmentTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 4,
  },
  detailCard: {
    backgroundColor: "#f7f7f7",
    padding: 12,
    borderRadius: 12,
    marginVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 2,
  },
  bold: { fontWeight: "bold" },
  detailText: { fontSize: 14, marginLeft: 4 },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginTop: 6,
  },
  statusText: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  noData: { textAlign: "center", marginTop: 20, fontSize: 16, color: "#555" },
});
