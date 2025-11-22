import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Image,
  Dimensions,
  RefreshControl,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import { getUser, removeUser, removeToken } from "../storageUtils";
import api from "../api";

const { width } = Dimensions.get("window");

const ZonePage = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [zones, setZones] = useState([]);
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isClosed, setIsClosed] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  async function fetchZones() {
    try {
      if (!refreshing) setLoading(true);
      const response = await api.get("/weekly-zones");
      const wk = response?.data?.weekly_report ?? null;
      setWeeklyReport(
        wk ? { ...wk, submission_closed: response?.data?.submission_closed } : null
      );
      setZones(response?.data?.zones ?? []);
    } catch (error) {
      console.error("Fetch Zones Error:", error);
      Alert.alert("Error", "Unable to fetch zones. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadUser() {
    try {
      const userData = await getUser();
      if (userData) {
        setUser(userData);
        await fetchZones();
      } else {
        setUser(null);
        setLoading(false);
      }
    } catch (err) {
      console.error("Load User Error:", err);
      setLoading(false);
    }
  }

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!weeklyReport?.submitted_at) {
      setIsClosed(false);
      return;
    }
    const deadline = new Date(weeklyReport.submitted_at);
    setIsClosed(currentTime >= deadline);
  }, [weeklyReport, currentTime]);

  useEffect(() => {
    loadUser();
    const unsubscribe = navigation.addListener("focus", loadUser);
    return unsubscribe;
  }, [navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchZones();
  };

  const markSegregated = async (zoneReportId) => {
    if (isClosed || weeklyReport?.submission_closed || !weeklyReport?.is_open) {
      Alert.alert("Submission Closed", "Wait for the next weekly report.");
      return;
    }
    try {
      setLoading(true);
      await api.post("/weekly-zones/segregate", { zone_report_id: zoneReportId });
      setZones((prev) =>
        prev.map((z) => (z.id === zoneReportId ? { ...z, is_segregated: true } : z))
      );
      Alert.alert("Success", "Zone marked as segregated ✅");
    } catch (error) {
      console.error("Mark Segregated Error:", error);
      Alert.alert("Error", "Unable to mark as segregated. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await removeUser();
          await removeToken();
          navigation.replace("Login");
        },
      },
    ]);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "Invalid date";
    return d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrentDate = (date) =>
    date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "Asia/Manila",
    });

  const formatCurrentTime = (date) =>
    date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZone: "Asia/Manila",
    });

  const renderZone = ({ item }) => {
    const disabled =
      isClosed || weeklyReport?.submission_closed || !weeklyReport?.is_open || item.is_segregated;

    return (
      <View style={styles.zoneCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.zoneName}>{item.zone?.name ?? "Unnamed Zone"}</Text>
          <Text style={styles.zoneStatus}>
            Status:{" "}
            <Text
              style={{
                color: item.is_segregated ? "#388E3C" : "#FB8C00",
                fontWeight: "600",
              }}
            >
              {item.is_segregated ? "Segregated ✅" : "Pending ⏳"}
            </Text>
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.checkBtn, disabled && styles.disabledBtn]}
          onPress={() => !disabled && markSegregated(item.id)}
          activeOpacity={disabled ? 1 : 0.8}
        >
          <Text style={styles.checkBtnText}>
            {item.is_segregated ? "Done" : disabled ? "Locked" : "Segregate"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>
            <Icon name="dashboard" size={24} color="#1B5E20" /> Zone Leader
          </Text>

          <TouchableOpacity onPress={() => setShowDropdown(!showDropdown)}>
            <Icon name="account-circle" size={36} color="#1B5E20" />
          </TouchableOpacity>
        </View>

        {showDropdown && (
          <TouchableWithoutFeedback onPress={() => setShowDropdown(false)}>
            <View style={styles.dropdownOverlay}>
              <View style={styles.dropdownMenu}>
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => {
                    setShowDropdown(false);
                    navigation.navigate("Profile");
                  }}
                >
                  <Icon name="person" size={20} color="#1B5E20" />
                  <Text style={styles.dropdownText}>Profile</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => {
                    setShowDropdown(false);
                    handleLogout();
                  }}
                >
                  <Icon name="logout" size={20} color="#C62828" />
                  <Text style={[styles.dropdownText, { color: "#C62828" }]}>Logout</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        )}

        <Text style={styles.currentTime}>
          <Icon name="schedule" size={16} color="#2E7D32" /> {formatCurrentDate(currentTime)}{" "}
          {formatCurrentTime(currentTime)}
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color="#1B5E20" style={{ marginTop: 50 }} />
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingBottom: 120 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            <View style={styles.card}>
              <Text style={styles.welcome}>Welcome, {user?.name ?? "User"} 👋</Text>

              {weeklyReport ? (
                <View style={styles.reportCard}>
                  <Text style={styles.sectionTitle}>
                    <Icon name="assignment" size={18} color="#1B5E20" /> Weekly Report
                  </Text>
                  <Text style={styles.reportText}>ID: {weeklyReport.id}</Text>
                  <Text style={styles.reportText}>
                    Comply On: {formatDate(weeklyReport.comply_on)}
                  </Text>
                  <Text style={styles.reportText}>
                    Deadline: {formatDate(weeklyReport.submitted_at)}
                  </Text>
                  <Text style={styles.reportText}>
                    Status: {weeklyReport.is_open ? "Open ✅" : "Closed ❌"}
                  </Text>
                </View>
              ) : (
                <Text style={styles.noReportText}>No weekly report available</Text>
              )}

              <View style={styles.imageWrapper}>
                <Image
                  source={require("../assets/zonal.png")}
                  style={styles.illustration}
                  resizeMode="contain"
                />
              </View>

              {(isClosed || weeklyReport?.submission_closed || !weeklyReport?.is_open) && (
                <Text style={styles.closedMsg}>
                  <Icon name="block" size={16} color="#E74C3C" /> Submission Closed. Wait for the next
                  weekly report.
                </Text>
              )}

              <Text style={styles.sectionTitle}>
                <Icon name="map" size={18} color="#1B5E20" /> Your Zones
              </Text>

              {zones.length === 0 ? (
                <Text style={styles.noZones}>No zones assigned to you.</Text>
              ) : (
                <FlatList
                  data={zones}
                  keyExtractor={(item) => item.id?.toString() ?? Math.random().toString()}
                  renderItem={renderZone}
                  scrollEnabled={false}
                />
              )}
            </View>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
};

export default ZonePage;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F9FAFB" },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 10,
  },
  title: { fontSize: 22, fontWeight: "700", color: "#1B5E20", letterSpacing: 0.3 },
  currentTime: {
    fontSize: 14,
    fontWeight: "500",
    color: "#388E3C",
    textAlign: "center",
    marginVertical: 12,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  welcome: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1B5E20",
    textAlign: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1B5E20",
    marginTop: 18,
    marginBottom: 8,
  },
  reportCard: {
    backgroundColor: "#E8F5E9",
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: "#43A047",
    marginBottom: 10,
  },
  reportText: { fontSize: 14, color: "#37474F", marginBottom: 4 },
  noReportText: { textAlign: "center", color: "#9E9E9E", marginTop: 10 },

  imageWrapper: {
    marginVertical: 20,
    backgroundColor: "#FAFAFA",
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  illustration: { width: "100%", height: 170 },

  closedMsg: {
    textAlign: "center",
    color: "#C62828",
    fontWeight: "600",
    marginTop: 6,
  },

  zoneCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F8E9",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  zoneName: { fontSize: 15, fontWeight: "600", color: "#2C3E50", marginBottom: 4 },
  zoneStatus: { fontSize: 13.5, color: "#546E7A" },

  checkBtn: {
    backgroundColor: "#2E7D32",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  checkBtnText: { color: "#fff", fontWeight: "600", fontSize: 13.5 },
  disabledBtn: { backgroundColor: "#A5D6A7" },
  noZones: { marginTop: 10, textAlign: "center", color: "#9E9E9E" },

  dropdownOverlay: {
    position: "absolute",
    top: 70,
    right: 0,
    width: width,
    height: "100%",
    zIndex: 999,
  },
  dropdownMenu: {
    backgroundColor: "#fff",
    borderRadius: 12,
    width: 180,
    alignSelf: "flex-end",
    paddingVertical: 8,
    marginRight: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  dropdownText: { marginLeft: 10, fontSize: 15, fontWeight: "500", color: "#2C3E50" },
});
