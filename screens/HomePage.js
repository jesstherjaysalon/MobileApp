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
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import Geolocation from "@react-native-community/geolocation";
import NetInfo from "@react-native-community/netinfo";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { getUser, removeUser, removeToken } from "../storageUtils";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { SafeAreaView } from "react-native-safe-area-context";

const HomePage = () => {
  const [user, setUser] = useState(null);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [watchId, setWatchId] = useState(null);
  const [gpsStatus, setGpsStatus] = useState(false);
  const [networkStatus, setNetworkStatus] = useState(false);
  const navigation = useNavigation();
  const mapRef = useRef(null);

  // ✅ Load user data when screen is focused
  useFocusEffect(
    useCallback(() => {
      const loadUser = async () => {
        const userData = await getUser();
        if (userData) setUser(userData);
      };
      loadUser();
    }, [])
  );

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

  // ✅ Request Location Permission
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

  // ✅ Get Current Location and Start Watching
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

  // ✅ Continuous Location Updates
  const startWatchingLocation = () => {
    const id = Geolocation.watchPosition(
      (pos) => {
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setGpsStatus(true);
      },
      (err) => {
        setGpsStatus(false);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 1,
        interval: 5000,
        fastestInterval: 2000,
      }
    );
    setWatchId(id);
  };

  // ✅ Logout Function
  const handleLogout = async () => {
    await removeUser();
    await removeToken();
    navigation.replace("Login");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.headerBar}>
            <MaterialIcons name="dashboard" size={30} color="#fff" />
            <Text style={styles.headerTitle}>Driver Dashboard</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            Stay connected, monitor your live location, and manage your route
            assignments efficiently.
          </Text>
        </View>

        {/* Live Map Section */}
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
              {/* ✅ Marker */}
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
          <Text style={styles.heading}>You’re Online, Driver! 🚛</Text>
          <Text style={styles.subText}>
            Keep your GPS active to ensure smooth and accurate schedule tracking.
          </Text>

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

        {/* ✅ System Status (Now Functional) */}
        <View style={styles.statusContainer}>
          <Text style={styles.statusHeader}>System Status</Text>
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <MaterialIcons
                name="gps-fixed"
                size={28}
                color={gpsStatus ? "#27AE60" : "#e74c3c"}
              />
              <Text
                style={[
                  styles.statusLabel,
                  { color: gpsStatus ? "#27AE60" : "#e74c3c" },
                ]}
              >
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
                style={[
                  styles.statusLabel,
                  { color: networkStatus ? "#27AE60" : "#e74c3c" },
                ]}
              >
                Network {networkStatus ? "Stable" : "Disconnected"}
              </Text>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialIcons name="logout" size={22} color="#fff" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomePage;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f0f9f4",
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  headerContainer: {
    backgroundColor: "#2e7d32",
    borderRadius: 20,
    padding: 22,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
  },
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
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    alignItems: "center",
  },
  pinMarker: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#e74c3c",
    marginBottom: 4,
  },
  truckImage: {
    width: 45,
    height: 45,
  },
  mainCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    marginBottom: 25,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  heading: {
    fontSize: 22,
    fontWeight: "800",
    color: "#14532d",
  },
  subText: {
    fontSize: 15,
    color: "#388e3c",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 16,
    lineHeight: 22,
  },
  welcome: {
    fontSize: 16,
    color: "#2C3E50",
    textAlign: "center",
    marginBottom: 8,
  },
  username: {
    fontWeight: "700",
    color: "#1b5e20",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#27AE60",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 25,
    marginBottom: 12,
  },
  statusText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 6,
    fontSize: 14,
  },
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(39,174,96,0.08)",
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  locationText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1b5e20",
    marginLeft: 8,
  },
  fetching: {
    fontSize: 14,
    color: "#7f8c8d",
    marginTop: 10,
    textAlign: "center",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    height: 250,
  },

  // ✅ Functional System Status
  statusContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 25,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    elevation: 2,
  },
  statusHeader: {
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 10,
    color: "#1b5e20",
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statusItem: {
    alignItems: "center",
  },
  statusLabel: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "600",
  },

  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e53935",
    paddingVertical: 14,
    borderRadius: 30,
    shadowColor: "#e53935",
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
    marginBottom: 40,
  },
  logoutText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    marginLeft: 8,
  },
});
