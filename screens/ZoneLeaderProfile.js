import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import LinearGradient from "react-native-linear-gradient";
import api from "../api"; // your axios instance with auth token
import dayjs from "dayjs"; // for date formatting

const ZoneLeaderProfile = () => {
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
    fetchHistory();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get("/zone-leader/profile");
      if (response.data.success) {
        setProfile(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching zone leader profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await api.get("/zone-leader/history");
      if (response.data.success) {
        setHistory(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching history:", error);
    }
  };

  const getInitials = (first, last) => `${first[0] || ""}${last[0] || ""}`.toUpperCase();

  if (loading) {
    return <ActivityIndicator size="large" style={styles.loader} color="#2563EB" />;
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No profile found</Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={["#D9F0E6", "#B7E4C7"]} style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {/* Profile Card */}
        <View style={styles.card}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(profile.firstname, profile.lastname)}</Text>
            </View>
          </View>

          <Text style={styles.header}>{profile.firstname} {profile.lastname}</Text>

          {/* Phone */}
          <View style={styles.row}>
            <View style={styles.iconLabel}>
              <MaterialIcons name="phone" size={20} color="#2563EB" />
              <Text style={styles.label}>Phone:</Text>
            </View>
            <Text style={styles.value}>{profile.phone_number}</Text>
          </View>

          {/* Barangay */}
          <View style={styles.row}>
            <View style={styles.iconLabel}>
              <MaterialIcons name="location-on" size={20} color="#2563EB" />
              <Text style={styles.label}>Barangay:</Text>
            </View>
            <Text style={styles.value}>{profile.barangay?.name || "N/A"}</Text>
          </View>

          {/* Status */}
          <View style={styles.row}>
            <View style={styles.iconLabel}>
              <MaterialIcons name="verified" size={20} color="#2563EB" />
              <Text style={styles.label}>Status:</Text>
            </View>
            <View style={[styles.statusBadge, profile.is_active ? styles.active : styles.inactive]}>
              <Text style={styles.statusText}>{profile.is_active ? "Active" : "Inactive"}</Text>
            </View>
          </View>
        </View>

        {/* Zones */}
        <Text style={styles.subHeader}>Zones</Text>
        <View style={styles.zonesContainer}>
          {profile.zones && profile.zones.length > 0 ? (
            profile.zones.map((zone, index) => (
              <View
                key={zone.id}
                style={[styles.zoneBadge, { backgroundColor: zoneColors[index % zoneColors.length] }]}
              >
                <Text style={styles.zoneText}>{zone.name}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No zones assigned</Text>
          )}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Weekly Reports History */}
        <Text style={styles.subHeader}>Weekly Report History</Text>
        {history.length > 0 ? (
          history.map((report) => (
            <View key={report.id} style={styles.historyCard}>
              <View style={styles.row}>
                <MaterialIcons name="event" size={20} color="#2563EB" />
                <Text style={styles.historyDate}>
                  Comply On: {dayjs(report.comply_on).format("MMMM D YYYY")}
                </Text>
              </View>
              <Text>Status: {report.status}</Text>
              <Text>
                Submitted At: {report.submitted_at ? dayjs(report.submitted_at).format("MMMM D YYYY") : "N/A"}
              </Text>

              <Text style={styles.historySubHeader}>Zone Reports:</Text>
              {report.zone_reports && report.zone_reports.length > 0 ? (
                report.zone_reports.map((zr) => (
                  <View key={zr.id} style={styles.zoneRow}>
                    <Text style={styles.zoneName}>{zr.zone?.name || "Unknown Zone"}</Text>
                    <Text
                      style={[
                        styles.segregated,
                        { color: zr.is_segregated ? "#10B981" : "#EF4444" }, // green if segregated, red if not
                      ]}
                    >
                      {zr.is_segregated ? "Segregated" : "Not Segregated"}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No zone reports for your assigned zones</Text>
              )}
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No weekly report history found</Text>
        )}
      </ScrollView>
    </LinearGradient>
  );
};

export default ZoneLeaderProfile;

const zoneColors = ["#2563EB", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444"];

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },

  avatarContainer: { alignItems: "center", marginBottom: 16 },
  avatar: {
    backgroundColor: "#2563EB",
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#2563EB",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  avatarText: { color: "#fff", fontSize: 32, fontWeight: "bold" },

  header: { fontSize: 24, fontWeight: "bold", color: "#111827", textAlign: "center" },
  userId: { fontSize: 14, color: "#6B7280", textAlign: "center", marginBottom: 16 },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 6,
  },
  iconLabel: { flexDirection: "row", alignItems: "center", gap: 6 },
  label: { fontSize: 16, color: "#6B7280", fontWeight: "500" },
  value: { fontSize: 16, color: "#111827", fontWeight: "600" },

  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 18,
    borderRadius: 25,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  active: { backgroundColor: "#34D399" },
  inactive: { backgroundColor: "#F87171" },
  statusText: { color: "#fff", fontWeight: "700" },

  subHeader: { fontSize: 20, fontWeight: "600", marginBottom: 12, color: "#2563EB" },
  zonesContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

  zoneBadge: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 25,
    margin: 4,
    minWidth: 90,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  zoneText: { color: "#fff", fontWeight: "600", fontSize: 14 },

  divider: {
    borderBottomColor: "#2563EB",
    borderBottomWidth: 1,
    marginVertical: 16,
  },

  historyCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  historyDate: { fontSize: 16, fontWeight: "600", marginLeft: 6 },
  historySubHeader: { fontSize: 16, fontWeight: "600", marginTop: 8, marginBottom: 4, color: "#2563EB" },
  zoneRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 2 },
  zoneName: { fontWeight: "500" },
  segregated: { fontWeight: "600" },

  emptyText: { fontSize: 14, color: "#9CA3AF", marginVertical: 4 },
});
