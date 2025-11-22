import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  PermissionsAndroid,
  Platform,
  ActivityIndicator,
  Image,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import Geolocation from "@react-native-community/geolocation";
import NetInfo from "@react-native-community/netinfo";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { getUser, removeUser, removeToken } from "../storageUtils";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { SafeAreaView } from "react-native-safe-area-context";
import dayjs from "dayjs";
import api from "../api";
import { DashboardModalContent } from "../modals/DashboardModal";


const HomePage = () => {
  const [user, setUser] = useState(null);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [watchId, setWatchId] = useState(null);
  const [gpsStatus, setGpsStatus] = useState(false);
  const [networkStatus, setNetworkStatus] = useState(false);
  const [missedSegments, setMissedSegments] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [dashboardModalVisible, setDashboardModalVisible] = useState(false); // ✅ Dashboard modal
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [selectedSegments, setSelectedSegments] = useState([]);
  const navigation = useNavigation();
  const mapRef = useRef(null);
    const [showTooltip, setShowTooltip] = useState(true);


  // ✅ Load user and missed segments when screen is focused
  useFocusEffect(
    useCallback(() => {
      const loadUserAndSegments = async () => {
        const userData = await getUser();
        if (userData) {
          setUser(userData);
          fetchMissedSegments(userData.id);
        }
      };
      loadUserAndSegments();
    }, [])
  );

  // ✅ Fetch missed segments
  const fetchMissedSegments = async (userId) => {
    try {
      const res = await api.get(`/missed-segments?user_id=${userId}`);
      const data = res.data;
      setMissedSegments(data.segments || []);
      setUnreadCount(data.count || 0);
    } catch (error) {
      console.log("Failed to load missed segments:", error.message);
      setMissedSegments([]);
      setUnreadCount(0);
    }
  };

  // ✅ Group segments by schedule_id
  const groupSegmentsBySchedule = (segments) => {
    const grouped = {};
    segments.forEach((seg) => {
      const key = seg.schedule_id;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(seg);
    });
    return grouped;
  };
  const groupedSegments = groupSegmentsBySchedule(missedSegments);

  // ✅ Select segment toggle
  const toggleSegmentSelection = (segmentId) => {
    setSelectedSegments((prev) =>
      prev.includes(segmentId)
        ? prev.filter((id) => id !== segmentId)
        : [...prev, segmentId]
    );
  };

  // ✅ Retrieve selected segments with confirmation
  const handleRetrieveSelected = async () => {
    if (selectedSegments.length === 0) {
      Alert.alert("No Selection", "Please select at least one segment.");
      return;
    }

    Alert.alert(
      "Confirm Retrieval",
      `Are you sure you want to retrieve ${selectedSegments.length} missed segment(s)?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Confirm",
          style: "default",
          onPress: async () => {
            try {
              console.log("Retrieving segments:", selectedSegments);

              // ✅ You no longer need to send truck_id
              await api.post("/retrieve-segments", {
                leg_ids: selectedSegments,
              });

              Alert.alert(
                "Success",
                "Selected missed segments retrieved successfully."
              );
              setSelectedSegments([]);
              setModalVisible(false);
              await fetchMissedSegments(user?.id);
            } catch (err) {
              console.log("Retrieve error:", err.response?.data || err.message);
              Alert.alert(
                "Error",
                err.response?.data?.error ||
                "Failed to retrieve selected segments."
              );
            }
          },
        },
      ]
    );
  };


  // ✅ GPS & Network Watchers
  useEffect(() => {
    requestLocationPermission();
    const unsubscribe = NetInfo.addEventListener((state) => {
      setNetworkStatus(state.isConnected && state.isInternetReachable);
    });
    return () => {
      if (watchId !== null) Geolocation.clearWatch(watchId);
      unsubscribe();
    };
  }, []);

  const requestLocationPermission = async () => {
    if (Platform.OS === "android") {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ]);
        if (
          granted["android.permission.ACCESS_FINE_LOCATION"] ===
          PermissionsAndroid.RESULTS.GRANTED
        ) {
          getInitialLocationThenWatch();
        } else {
          Alert.alert("Permission Denied", "Location access was denied.");
          setGpsStatus(false);
          setLoading(false);
        }
      } catch (err) {
        setGpsStatus(false);
        setLoading(false);
      }
    } else {
      getInitialLocationThenWatch();
    }
  };

  const getInitialLocationThenWatch = () => {
    Geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setGpsStatus(true);
        setLoading(false);
        startWatchingLocation();
      },
      (err) => {
        Alert.alert("Error", err.message);
        setGpsStatus(false);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 }
    );
  };

  const startWatchingLocation = () => {
    const id = Geolocation.watchPosition(
      (pos) => {
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setGpsStatus(true);
      },
      () => setGpsStatus(false),
      { enableHighAccuracy: true, distanceFilter: 1, interval: 5000, fastestInterval: 2000 }
    );
    setWatchId(id);
  };

  const handleLogout = async () => {
    await removeUser();
    await removeToken();
    navigation.replace("Login");
  };

  const handleNotificationPress = async () => {
    setModalVisible(true);
    setUnreadCount(0);
    await fetchMissedSegments(user?.id);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
    {/* Header */}
<View style={styles.headerContainer}>
  <View style={styles.headerTop}>
    <View style={styles.headerBar}>
      {/* Dashboard Icon with Tooltip */}
      <View style={{ alignItems: "center" }}>
        <TouchableOpacity onPress={() => setDashboardModalVisible(true)}>
          <MaterialIcons name="dashboard" size={30} color="#fff" />
        </TouchableOpacity>

        {/* Tooltip message above the icon */}
        {showTooltip && (  // state to control tooltip visibility
          <View style={styles.tooltipContainer}>
            <Text style={styles.tooltipText}>Please click here for key features</Text>

            {/* Close Button */}
            <TouchableOpacity
              style={styles.tooltipCloseButton}
              onPress={() => setShowTooltip(false)}
            >
              <Text style={styles.tooltipCloseText}>×</Text>
            </TouchableOpacity>

            {/* Arrow pointing down to icon */}
            <View style={styles.tooltipArrow} />
          </View>
        )}
      </View>

      {/* Header Title */}
      <Text style={styles.headerTitle}>Driver Dashboard</Text>
    </View>
 



            <TouchableOpacity style={styles.notificationButton} onPress={handleNotificationPress}>
              <MaterialIcons name="flag" size={28} color="yellow" />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.headerSubtitle}>
            Stay connected, monitor your live location, and manage your route assignments efficiently.
          </Text>
        </View>

        {/* Map */}
        <View style={styles.mapContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#27AE60" />
              <Text style={styles.fetching}>Fetching your location...</Text>
            </View>
          ) : location ? (
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              region={{
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
            >
              <Marker coordinate={location}>
                <View style={styles.markerContainer}>
                  <View style={styles.pinMarker} />
                  <Image
                    source={{
                      uri: "https://cdn-icons-png.flaticon.com/512/1995/1995574.png",
                    }}
                    style={styles.truckImage}
                    resizeMode="contain"
                  />
                </View>
              </Marker>
            </MapView>
          ) : (
            <Text style={styles.fetching}>No location available</Text>
          )}
        </View>

        {/* Main Card */}
        <View style={styles.mainCard}>
          <Text style={styles.heading}>You’re Online, Driver!</Text>
          <Text style={styles.subText}>Keep your GPS active for accurate schedule tracking.</Text>
          {user && (
            <Text style={styles.welcome}>
              Welcome back, <Text style={styles.username}>{user.name}</Text>
            </Text>
          )}
          <View style={styles.statusBadge}>
            <MaterialIcons name="check-circle" size={20} color="#fff" />
            <Text style={styles.statusText}>Online</Text>
          </View>

          {location && (
            <View style={styles.locationCard}>
              <MaterialIcons name="my-location" size={22} color="#27AE60" />
              <Text style={styles.locationText}>
                {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
              </Text>
            </View>
          )}
        </View>

        {/* System Status */}
        <View style={styles.statusContainer}>
          <Text style={styles.statusHeader}>System Status</Text>
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <MaterialIcons
                name="gps-fixed"
                size={28}
                color={gpsStatus ? "#27AE60" : "#e74c3c"}
              />
              <Text style={[styles.statusLabel, { color: gpsStatus ? "#27AE60" : "#e74c3c" }]}>
                GPS {gpsStatus ? "Active" : "Inactive"}
              </Text>
            </View>
            <View style={styles.statusItem}>
              <MaterialIcons
                name="signal-cellular-alt"
                size={28}
                color={networkStatus ? "#27AE60" : "#e74c3c"}
              />
              <Text
                style={[styles.statusLabel, { color: networkStatus ? "#27AE60" : "#e74c3c" }]}
              >
                Network {networkStatus ? "Stable" : "Disconnected"}
              </Text>
            </View>
          </View>
        </View>

        {/* Logout
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialIcons name="logout" size={22} color="#fff" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity> */}
      </ScrollView>

      {/* 🔔 Modal for Missed Segments */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <MaterialIcons name="error-outline" size={22} color="#e53935" />
              <Text style={styles.modalTitle}>Missed Segments</Text>
            </View>

            {Object.keys(groupedSegments).length > 0 ? (
              <ScrollView style={{ maxHeight: 420 }}>
                {Object.entries(groupedSegments).map(([scheduleId, segments]) => {
                  const firstSeg = segments[0];
                  const pickupDate = firstSeg.schedule?.pickup_datetime
                    ? dayjs(firstSeg.schedule.pickup_datetime).format("MMMM D, YYYY h:mm A")
                    : "Unknown Date";

                  const barangay = firstSeg.schedule?.barangay?.name || "Unknown Barangay";
                  const driver = firstSeg.schedule?.driver?.user?.name || "Unassigned Driver";

                  return (
                    <View key={scheduleId} style={styles.groupBox}>
                      <TouchableOpacity
                        style={styles.groupHeader}
                        onPress={() =>
                          setExpandedGroup(expandedGroup === scheduleId ? null : scheduleId)
                        }
                      >
                        <MaterialIcons
                          name={expandedGroup === scheduleId ? "expand-less" : "expand-more"}
                          size={22}
                          color="#2e7d32"
                        />
                        <Text style={styles.groupHeaderText}>
                          Schedule on {pickupDate}
                        </Text>
                      </TouchableOpacity>

                      <View style={{ marginLeft: 28, marginBottom: 8 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 3 }}>
                          <MaterialIcons name="location-city" size={18} color="#1b5e20" />
                          <Text style={{ fontSize: 13, color: "#333", marginLeft: 6 }}>
                            <Text style={{ fontWeight: "600" }}>Barangay:</Text> {barangay}
                          </Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          <MaterialIcons name="person" size={18} color="#1b5e20" />
                          <Text style={{ fontSize: 13, color: "#333", marginLeft: 6 }}>
                            <Text style={{ fontWeight: "600" }}>Driver:</Text> {driver}
                          </Text>
                        </View>
                      </View>

                    {expandedGroup === scheduleId &&
  segments.map((item) => (
    <TouchableOpacity
      key={item.id}
      style={[
        styles.missedItem,
        selectedSegments.includes(item.id) && {
          backgroundColor: "#E8F5E9",
          borderColor: "#27AE60",
        },
      ]}
      onPress={() => toggleSegmentSelection(item.id)}
    >
      <MaterialIcons
        name={
          selectedSegments.includes(item.id)
            ? "check-box"
            : "check-box-outline-blank"
        }
        color={
          selectedSegments.includes(item.id)
            ? "#27AE60"
            : "#aaa"
        }
        size={22}
      />
      <View style={{ flex: 1 }}>
        <Text style={styles.missedText}>
          {`${item.from_zone?.name || ""}${item.from_terminal
            ? ": " + item.from_terminal.name
            : ""
            } ➜ ${item.to_zone?.name || ""}${item.to_terminal
              ? ": " + item.to_terminal.name
              : ""
            }`}
        </Text>

        {/* Remarks for this segment */}
        {item.remarks ? (
          <Text style={styles.remarksText}>
            <Text style={{ fontWeight: "600" }}>Remarks:</Text> {item.remarks}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  ))}

                       
                    </View>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={styles.emptyState}>
                <MaterialIcons name="check-circle" size={48} color="#2e7d32" />
                <Text style={styles.noMissed}>No missed segments found.</Text>
              </View>
            )}

            {selectedSegments.length > 0 && (
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: "#27AE60" }]}
                onPress={handleRetrieveSelected}
              >
                <Text style={styles.closeText}>
                  Retrieve Selected ({selectedSegments.length})
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.closeButton, { marginTop: 10 }]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>


      {/* 📊 Dashboard Modal */}
      <Modal
        visible={dashboardModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setDashboardModalVisible(false)}
      >
        <View style={dashboardStyles.backdrop}>
        
            {/* Dashboard Content */}
            <DashboardModalContent />

            {/* Close Button */}
            <TouchableOpacity
              onPress={() => setDashboardModalVisible(false)}
            >
              <Text style={dashboardStyles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
        
      </Modal>


    </SafeAreaView>
  );
};

export default HomePage;

const dashboardStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContainer: {
    width: "90%",
    maxHeight: "80%",
    backgroundColor: "#f0f9f4",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  closeBtn: {
    marginTop: 20,
    backgroundColor: "#27AE60",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  closeText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f0f9f4" },
  scrollContent: { flexGrow: 1, padding: 20 },
  headerContainer: {
    backgroundColor: "#2e7d32",
    borderRadius: 20,
    padding: 22,
    marginBottom: 18,
  },
  closeText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerBar: { flexDirection: "row", alignItems: "center", gap: 10 },
  notificationButton: { position: "relative", padding: 5 },
  badge: {
    position: "absolute",
    right: 2,
    top: 2,
    backgroundColor: "#e53935",
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#fff" },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    marginTop: 8,
    lineHeight: 20,
  },
  mapContainer: {
    height: 250,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 25,
  },
  map: { flex: 1 },
  markerContainer: { alignItems: "center" },
  pinMarker: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#e74c3c",
    marginBottom: 4,
  },
  truckImage: { width: 45, height: 45 },
  mainCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    marginBottom: 25,
  },
  heading: { fontSize: 22, fontWeight: "800", color: "#14532d" },
  subText: {
    fontSize: 15,
    color: "#388e3c",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 16,
    lineHeight: 22,
  },
  welcome: { fontSize: 16, color: "#2C3E50", textAlign: "center", marginBottom: 8 },
  username: { fontWeight: "700", color: "#1b5e20" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#27AE60",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 25,
    marginBottom: 12,
  },
  statusText: { color: "#fff", fontWeight: "600", marginLeft: 6, fontSize: 14 },
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(39,174,96,0.08)",
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  locationText: { fontSize: 16, fontWeight: "600", color: "#1b5e20", marginLeft: 8 },
  fetching: { fontSize: 14, color: "#7f8c8d", marginTop: 10, textAlign: "center" },
  loadingContainer: { alignItems: "center", justifyContent: "center", height: 250 },
  statusContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 25,
  },
  statusHeader: { fontWeight: "700", fontSize: 16, marginBottom: 10, color: "#1b5e20" },
  statusRow: { flexDirection: "row", justifyContent: "space-around" },
  statusItem: { alignItems: "center" },
  statusLabel: { marginTop: 4, fontSize: 13, fontWeight: "600" },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e53935",
    paddingVertical: 14,
    borderRadius: 30,
    marginBottom: 40,
  },
  logoutText: { color: "#fff", fontWeight: "700", fontSize: 16, marginLeft: 8 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18,
  },
  modalBox: {
    backgroundColor: "#ffffff",
    width: "100%",
    borderRadius: 18,
    padding: 20,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    paddingBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1b5e20",
    marginLeft: 8,
  },
  groupBox: {
    backgroundColor: "#f8fdf8",
    borderRadius: 12,
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    flexWrap: "wrap",
  },
  groupHeaderText: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#14532d",
    lineHeight: 20,
  },
  missedItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fff5f5",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#ffe0e0",
  },
  missedText: {
    flex: 1,
    flexWrap: "wrap",
    fontSize: 14,
    color: "#c62828",
    lineHeight: 20,
    marginLeft: 8,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  noMissed: {
    fontSize: 16,
    color: "#1b5e20",
    marginTop: 12,
    textAlign: "center",
    lineHeight: 22,
  },
  closeButton: {
    backgroundColor: "#27AE60",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  closeText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  remarksText: {
  fontSize: 12,
  color: "#555",
  marginTop: 2,
  marginLeft: 28, // slightly indented
},
tooltipContainer: {
  position: "absolute",
  left: 40, // distance from icon (adjust as needed)
  top: 0,   // vertical alignment relative to icon
  backgroundColor: "rgba(0,0,0,0.8)",
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 8,
  flexDirection: "row", // horizontal layout
  alignItems: "center",
  zIndex: 10,
  minWidth: 180,
},
tooltipText: {
  color: "#fff",
  fontSize: 12,
  textAlign: "left",
},
tooltipArrow: {
  width: 0,
  height: 0,
  borderTopWidth: 6,
  borderBottomWidth: 6,
  borderLeftWidth: 6, // arrow pointing left
  borderTopColor: "transparent",
  borderBottomColor: "transparent",
  borderLeftColor: "rgba(0,0,0,0.8)",
  marginRight: 6,
},
tooltipCloseButton: {
  marginLeft: 10,
  padding: 2,
},
tooltipCloseText: {
  color: "#fff",
  fontSize: 14,
  fontWeight: "bold",
},

});
