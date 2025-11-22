import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import LinearGradient from "react-native-linear-gradient";
import * as Animatable from "react-native-animatable";
import api from "../api";
import { getUser, removeUser, removeToken } from "../storageUtils";

export default function DriverProfile({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [localUser, setLocalUser] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const storedUser = await getUser();
        setLocalUser(storedUser);

        const res = await api.get("/driver/profile");
        setProfile(res.data.profile);
      } catch (error) {
        console.error(
          "Error fetching driver profile:",
          error.response?.data || error.message
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleLogout = async () => {
    try {
      await removeUser();
      await removeToken();
      Alert.alert("Logged out", "You have been logged out successfully.");
      navigation.replace("Login");
    } catch (error) {
      console.error("Logout error:", error);
      Alert.alert("Error", "Something went wrong while logging out.");
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={{ marginTop: 10, fontSize: 16, color: "#2E7D32" }}>
          Loading profile...
        </Text>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={{ fontSize: 16, color: "#777" }}>No profile found</Text>
      </SafeAreaView>
    );
  }

  const initials = profile.user?.name
    ? profile.user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "DP";

  return (
    <SafeAreaView style={styles.container}>
      {/* Gradient Header */}
      <LinearGradient colors={["#2E7D32", "#1B5E20"]} style={styles.header}>
        <Animatable.View
          animation="bounceIn"
          duration={1200}
          style={styles.avatar}
        >
          <Text style={styles.avatarText}>{initials}</Text>
        </Animatable.View>
        <Text style={styles.headerName}>{profile.user?.name}</Text>
        <Text style={styles.headerEmail}>{profile.user?.email}</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Info */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Driver Information</Text>

          <InfoRow
            icon="phone"
            label="Contact Number"
            value={profile.contact_number}
          />
          <InfoRow
            icon="credit-card"
            label="License Number"
            value={profile.license_number}
          />
          <InfoRow
            icon="local-shipping"
            label="Assigned Truck"
            value={profile.truck?.plate_number ?? "No truck assigned"}
          />
        </View>

        {localUser && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Local Data</Text>
            <InfoRow
              icon="cached"
              label="Cached User"
              value={localUser.name}
              color="#388E3C"
            />
          </View>
        )}

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Icon name="logout" size={22} color="#fff" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() =>
          Alert.alert("Edit Profile", "Edit profile coming soon...")
        }
      >
        <Icon name="edit" size={26} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

/* --- Reusable Row Component --- */
const InfoRow = ({ icon, label, value, color = "#2E7D32" }) => (
  <View style={styles.infoRow}>
    <View style={[styles.iconCircle, { backgroundColor: color }]}>
      <Icon name={icon} size={22} color="#fff" />
    </View>
    <View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E8F5E9" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    paddingTop: 50,
    paddingBottom: 30,
    alignItems: "center",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  avatarText: { fontSize: 34, fontWeight: "700", color: "#2E7D32" },
  headerName: { fontSize: 24, fontWeight: "800", color: "#fff", marginTop: 4 },
  headerEmail: { fontSize: 14, color: "#c8e6c9", marginTop: 4 },

  scrollContent: { padding: 16, paddingBottom: 120 },

  card: {
    backgroundColor: "#F1F8E9",
    borderWidth: 1.5,
    borderColor: "#1B5E20",
    padding: 20,
    borderRadius: 18,
    marginTop: 18,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1B5E20",
    marginBottom: 12,
  },

  infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  label: { fontSize: 13, fontWeight: "600", color: "#555" },
  value: { fontSize: 16, fontWeight: "600", color: "#1B5E20" },

  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D32F2F",
    padding: 16,
    borderRadius: 14,
    marginTop: 28,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  logoutText: { fontSize: 16, fontWeight: "700", color: "#fff", marginLeft: 8 },

  fab: {
    position: "absolute",
    bottom: 30,
    right: 30,
    backgroundColor: "#2E7D32",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
});
