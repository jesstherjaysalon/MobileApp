import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import LinearGradient from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import moment from "moment-timezone";
import api from "../api";

const getStatusStyle = (status) => {
  switch (status) {
    case "completed":
      return { backgroundColor: "#E8F5E9", color: "#1B5E20" };
    case "ongoing":
      return { backgroundColor: "#FFF8E1", color: "#F57F17" };
    default:
      return { backgroundColor: "#FFEBEE", color: "#C62828" };
  }
};

const formatDuration = (value) => {
  if (!value || value <= 0) return "0";
  if (value < 1) return `${value} sec`;
  if (Number.isInteger(value)) return `${value} min`;
  return `${value} min`;
};

const formatDistance = (km) => {
  if (!km || km <= 0) return "0 m";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(2)} km`;
};

export default function RouteDetailsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { routePlanId, truckId } = route.params;

  const insets = useSafeAreaInsets();
  const [details, setDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [starting, setStarting] = useState(false);
  const [barangayName, setBarangayName] = useState("Unknown");
  const [pickupDatetime, setPickupDatetime] = useState(null);

  const fetchDetails = async () => {
    try {
      const response = await api.get(`/route-details/${routePlanId}`);
      const routeDetails = response.data?.routeDetails || [];
      setDetails(routeDetails);

      if (routeDetails.length > 0) {
        const first = routeDetails[0];
        setBarangayName(first.schedule?.barangay?.name || "Unknown");
        setPickupDatetime(first.schedule?.pickup_datetime || null);
      }

      setError(null);
    } catch (err) {
      console.log("❌ API Error:", err.response?.data || err.message);
      setError(err.response?.data?.message || "Failed to fetch route details");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [routePlanId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDetails();
  }, []);

  const handleStartRoute = async () => {
    if (!details.length) {
      Alert.alert("Error", "No route details available to start");
      return;
    }

    if (!pickupDatetime) {
      Alert.alert("Error", "Pickup datetime not available");
      return;
    }

    const pickupDateTimeManila = moment.tz(pickupDatetime, "Asia/Manila");
    const nowManila = moment.tz("Asia/Manila");
    const isScheduleAvailable = nowManila.isSameOrAfter(pickupDateTimeManila);

    if (!isScheduleAvailable) {
      Alert.alert(
        "Schedule Not Yet Available",
        `This route will be available starting ${pickupDateTimeManila.format("MMMM Do YYYY, h:mm A")}`
      );
      return;
    }

    Alert.alert("Start Route", "Are you sure you want to begin this route?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Start",
        onPress: async () => {
          try {
            setStarting(true);
            await api.patch(`/garbage_schedules/${routePlanId}/start`, {
              remarks: "Route started",
              start_time: moment().tz("Asia/Manila").format("YYYY-MM-DD HH:mm:ss"),
            });

            const coordinates = details.map((d) => [Number(d.from_lng), Number(d.from_lat)]);
            const last = details[details.length - 1];
            coordinates.push([Number(last.to_lng), Number(last.to_lat)]);

            navigation.navigate("RouteProgress", { routePlanId, coordinates, truckId });
          } catch {
            Alert.alert("Error", "Failed to start the route. Try again.");
          } finally {
            setStarting(false);
          }
        },
      },
    ]);
  };

  if (loading)
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#1B5E20" />
        <Text style={styles.loadingText}>Loading route details...</Text>
      </SafeAreaView>
    );

  if (error)
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.error}>Error: {error}</Text>
      </SafeAreaView>
    );

  const totalDistance = details.reduce((sum, r) => sum + Number(r.distance_km || 0), 0);
  const totalDuration = Number(details.reduce((sum, r) => sum + Number(r.duration_min || 0), 0).toFixed(2));

  const renderSummary = () => (
    <View style={styles.summaryContainer}>
      {[
        { icon: "map-marker-distance", label: "Total Distance", value: formatDistance(totalDistance) },
        { icon: "clock-outline", label: "Total Duration", value: formatDuration(totalDuration) },
      ].map((item, index) => (
        <View key={index} style={styles.summaryCard}>
          <Icon name={item.icon} size={28} color="#1B5E20" />
          <Text style={styles.summaryLabel}>{item.label}</Text>
          <Text style={styles.summaryValue}>{item.value}</Text>
        </View>
      ))}
    </View>
  );

  const renderSegment = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardBody}>
        <View style={styles.routeRow}>
          <View style={styles.iconsColumn}>
            <Icon name="map-marker-circle" size={24} color="#16a34a" />
            <View style={styles.verticalLine} />
            <Icon name="flag-checkered" size={24} color="#dc2626" />
          </View>

          <View style={styles.detailsColumn}>
            <View style={styles.detailRow}>
              <Text style={styles.label}>From</Text>
              <Text style={styles.value}>{item.from_name}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>To</Text>
              <Text style={styles.value}>{item.to_name}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Distance</Text>
              <Text style={styles.value}>{formatDistance(Number(item.distance_km || 0))}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Duration</Text>
              <Text style={styles.value}>{formatDuration(Number(item.duration_min || 0))}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Speed</Text>
              <Text style={styles.value}>{item.speed_kmh || 0} km/h</Text>
            </View>
            <View style={[styles.detailRow, { marginTop: 8 }]}>
              <Text style={styles.label}>Status</Text>
              <Text style={[styles.status, getStatusStyle(item.status)]}>{item.status}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  const pickupDateTimeManila = pickupDatetime
    ? moment.tz(pickupDatetime, "Asia/Manila")
    : null;
  const nowManila = moment.tz("Asia/Manila");
  const isScheduleAvailable = pickupDateTimeManila ? nowManila.isSameOrAfter(pickupDateTimeManila) : false;
  const formattedPickup = pickupDateTimeManila ? pickupDateTimeManila.format("MMMM Do YYYY, h:mm A") : "Unknown";

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={["#4CAF50", "#2E7D32"]} style={styles.header}>
        <View style={styles.headerRow}>
          <Icon name="road-variant" size={26} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.headerText}>
            {formattedPickup} - {barangayName}
          </Text>
        </View>
      </LinearGradient>

      <FlatList
        data={details}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderSegment}
        ListHeaderComponent={
          <>
            {renderSummary()}
            <Text style={styles.sectionHeader}>Route Segments</Text>
          </>
        }
        ListEmptyComponent={<Text style={styles.noData}>No route details found.</Text>}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 160 }}
      />

      <View style={[styles.fabWrapper, { paddingBottom: insets.bottom + 10 }]}>
        <TouchableOpacity
          style={[styles.fabButton, { backgroundColor: isScheduleAvailable ? "#2E7D32" : "#BDBDBD" }]}
          onPress={handleStartRoute}
          disabled={!isScheduleAvailable || starting}
        >
          {starting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Icon name="truck" size={24} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.fabText}>Start Route</Text>
            </>
          )}
        </TouchableOpacity>

        {!isScheduleAvailable && pickupDateTimeManila && (
          <View style={styles.warningContainer}>
            <Text style={styles.warningText}>
              ⚠️ This schedule will start on {formattedPickup}
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F1F8F6" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10, color: "#1B5E20", fontWeight: "600" },
  error: { color: "#C62828", fontWeight: "600", fontSize: 16 },

  header: { paddingVertical: 38, paddingHorizontal: 18, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, elevation: 5 },
  headerRow: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  headerText: { color: "#fff", fontSize: 20, fontWeight: "700", letterSpacing: 0.5 },

  summaryContainer: { flexDirection: "row", justifyContent: "space-evenly", marginTop: 20, marginBottom: 25 },
  summaryCard: { flex: 1, backgroundColor: "#fff", marginHorizontal: 10, borderRadius: 16, paddingVertical: 18, alignItems: "center", elevation: 3 },
  summaryLabel: { color: "#388E3C", fontSize: 14, marginTop: 8 },
  summaryValue: { fontSize: 18, fontWeight: "700", color: "#1B5E20", marginTop: 3 },

  sectionHeader: { fontSize: 18, fontWeight: "700", color: "#2E7D32", marginHorizontal: 18, marginBottom: 10 },

  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginHorizontal: 16, marginBottom: 14, elevation: 2 },
  cardBody: { marginTop: 0 },

  routeRow: { flexDirection: "row", gap: 12 },
  iconsColumn: { alignItems: "center", width: 40 },
  verticalLine: { width: 2, flex: 1, backgroundColor: "#94a3b8", marginVertical: 4 },
  detailsColumn: { flex: 1 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 2 },

  label: { fontSize: 14, color: "#2E7D32" },
  value: { fontSize: 15, fontWeight: "600", color: "#1B5E20" },

  status: { fontSize: 13, fontWeight: "600", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, textTransform: "capitalize" },

  fabWrapper: { position: "absolute", bottom: 0, left: 0, right: 0, alignItems: "center" },
  fabButton: { flexDirection: "row", paddingVertical: 14, paddingHorizontal: 32, borderRadius: 28, alignItems: "center", justifyContent: "center", elevation: 8 },
  fabText: { color: "#fff", fontSize: 18, fontWeight: "700" },

  warningContainer: { backgroundColor: "rgba(198, 40, 40, 0.1)", borderColor: "rgba(198, 40, 40, 0.5)", borderWidth: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16, marginTop: 12, marginHorizontal: 30, alignItems: "center" },
  warningText: { color: "#C62828", fontWeight: "700", fontSize: 14, textAlign: "center" },

  noData: { textAlign: "center", color: "#777", marginTop: 40, fontSize: 16 },
});
