import React, { useEffect, useState } from "react";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ScrollView,
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Platform,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import moment from "moment";
import GoogleMapView from "../GoogleMapView";
import useSendTruckLocation from "../hooks/useSendTruckLocation";
import api from "../api";
import { useNavigation } from "@react-navigation/native";
import WasteInputModal from "../rescheModal/WasteInputModal";

export default function ReschedProgress({ route }) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { rescheduleId, truckId } = route?.params || {};

  const [loading, setLoading] = useState(true);
  const [reschedDetails, setReschedDetails] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(null);

  const truckLocation = useSendTruckLocation(truckId);

  const [wasteModalVisible, setWasteModalVisible] = useState(false);
  const [activeReschedDetailId, setActiveReschedDetailId] = useState(null);

  useEffect(() => {
    const fetchResched = async () => {
      try {
        const res = await api.get(`/reschedules/${rescheduleId}/details`);
        const segments = res.data?.rescheduleDetails || [];
        setReschedDetails(segments);
        setCurrentIndex(0);
        setSelectedIndex(null);
      } catch (err) {
        console.error("❌ Failed to fetch reschedule:", err.response?.data || err.message);
        Alert.alert("Error", "Failed to fetch reschedule details");
      } finally {
        setLoading(false);
      }
    };

    if (rescheduleId) fetchResched();
    else setLoading(false);
  }, [rescheduleId]);

  const completeReschedule = async () => {
    try {
      await api.patch(`/reschedules/${rescheduleId}/complete`);
      navigation.navigate("Home");
    } catch (err) {
      console.error("❌ Failed to complete reschedule:", err.response?.data || err.message);
      Alert.alert("Error", "Failed to complete reschedule");
    }
  };

  const handleWasteSaved = async () => {
    await handleSubmitWaste(); // reuse existing function
  };

  const handleSubmitWaste = async () => {
    const segment = reschedDetails[currentIndex];
    if (!segment) return;

    try {
      const payload = {
        status: "completed",
        completed_at: moment().toISOString(),
      };

      await api.patch(`/resched-details/${segment.id}/status`, payload);

      const updated = [...reschedDetails];
      updated[currentIndex] = { ...segment, ...payload };
      setReschedDetails(updated);

      setWasteModalVisible(false);

      if (currentIndex + 1 < updated.length) {
        const nextSegment = updated[currentIndex + 1];
        const nextPayload = { start_time: moment().toISOString() };
        await api.patch(`/resched-details/${nextSegment.id}/status`, nextPayload);
        updated[currentIndex + 1] = { ...nextSegment, ...nextPayload };
        setReschedDetails(updated);
        setCurrentIndex((i) => i + 1);
        setSelectedIndex(null);
      } else {
        const missedCount = updated.filter((seg) => seg.status === "missed").length;
        Alert.alert(
          "Reschedule Completed",
          missedCount > 0
            ? `You missed ${missedCount} segment${missedCount > 1 ? "s" : ""}.`
            : "All reschedule segments completed successfully!",
          [{ text: "OK", onPress: () => completeReschedule() }]
        );
        setFinished(true);
      }
    } catch (err) {
      console.error("❌ Error submitting waste data:", err.response?.data || err.message);
      Alert.alert("Error", "Failed to save waste collection data");
    }
  };

  const markSegmentMissed = async () => {
    const segment = reschedDetails[currentIndex];
    if (!segment) return;
    try {
      const payload = { status: "missed", completed_at: moment().toISOString() };
      await api.patch(`/resched-details/${segment.id}/status`, payload);

      const updated = [...reschedDetails];
      updated[currentIndex] = { ...segment, ...payload };
      setReschedDetails(updated);

      if (currentIndex + 1 < updated.length) {
        const nextSegment = updated[currentIndex + 1];
        const nextPayload = { start_time: moment().toISOString() };
        await api.patch(`/resched-details/${nextSegment.id}/status`, nextPayload);
        updated[currentIndex + 1] = { ...nextSegment, ...nextPayload };
        setReschedDetails(updated);
        setCurrentIndex((i) => i + 1);
        setSelectedIndex(null);
      } else {
        Alert.alert("Reschedule Completed", "Reschedule process finished.", [
          { text: "OK", onPress: () => completeReschedule() },
        ]);
        setFinished(true);
      }
    } catch (err) {
      console.error("❌ Error marking missed:", err.response?.data || err.message);
      Alert.alert("Error", "Failed to mark segment as missed");
    }
  };

  const startSegment = async () => {
    const segment = reschedDetails[currentIndex];
    if (!segment) return;
    try {
      const payload = { start_time: moment().toISOString() };
      await api.patch(`/resched-details/${segment.id}/status`, payload);
      const updated = [...reschedDetails];
      updated[currentIndex] = { ...segment, ...payload };
      setReschedDetails(updated);
    } catch (err) {
      console.error("❌ Error starting segment:", err.response?.data || err.message);
      Alert.alert("Error", "Failed to start segment");
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading reschedule...</Text>
      </SafeAreaView>
    );
  }

  if (!reschedDetails.length) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.emptyText}>No reschedule details available.</Text>
      </SafeAreaView>
    );
  }

  const currentSegment = selectedIndex !== null ? reschedDetails[selectedIndex] : null;
  const isDisabled =
    currentSegment?.status === "completed" || currentSegment?.status === "missed";

  return (
    <SafeAreaView style={styles.safeArea}>
      <GoogleMapView
        segments={reschedDetails}
        currentIndex={currentIndex}
        liveTruckLocation={truckLocation}
        onMarkerPress={(segment, idx) => setSelectedIndex(idx)}
      />

      {/* ✅ Connected Waste Input Modal */}
      <WasteInputModal
        visible={wasteModalVisible}
        onClose={() => setWasteModalVisible(false)}
        reschedDetailId={activeReschedDetailId}
        onSaved={handleWasteSaved}
      />

      {currentSegment && (
        <View
          style={[
            styles.card,
            { paddingBottom: Math.max(insets.bottom, Platform.OS === "android" ? 16 : 10) + 8 },
          ]}
        >
          <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedIndex(null)}>
            <Icon name="close" size={20} color="#374151" />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>
              Segment {selectedIndex + 1} of {reschedDetails.length}
            </Text>

            <View style={styles.timelineContainer}>
              <View style={styles.timelineRow}>
                <Icon name="location-on" size={20} color="#10b981" style={styles.icon} />
                <View>
                  <Text style={styles.timelineTitle}>From</Text>
                  <Text style={styles.timelineLabel}>{currentSegment.from_label}</Text>
                </View>
              </View>

              <View style={styles.timelineLine} />

              <View style={styles.timelineRow}>
                <Icon name="flag" size={20} color="#ef4444" style={styles.icon} />
                <View>
                  <Text style={styles.timelineTitle}>To</Text>
                  <Text style={styles.timelineLabel}>{currentSegment.to_label}</Text>
                </View>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Distance:</Text>
              <Text style={styles.infoValue}>
                {Number(currentSegment.distance_km || 0).toFixed(2)} km
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Duration:</Text>
              <Text style={styles.infoValue}>{currentSegment.duration_min || 0} min</Text>
            </View>

            {!finished && (
              <View style={styles.buttonRow}>
                {!currentSegment?.start_time ? (
                  <TouchableOpacity
                    onPress={startSegment}
                    style={[styles.actionButton, styles.startButton]}
                  >
                    <Icon name="play-arrow" size={20} color="#fff" />
                    <Text style={styles.buttonText}>Start Segment</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity
                      disabled={isDisabled}
                      onPress={() => {
                        setActiveReschedDetailId(currentSegment.id);
                        setWasteModalVisible(true);
                      }}
                      style={[
                        styles.actionButton,
                        styles.completeButton,
                        isDisabled && { backgroundColor: "#9ca3af" },
                      ]}
                    >
                      <Icon name="check-circle" size={20} color="#fff" />
                      <Text style={styles.buttonText}>Complete</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      disabled={isDisabled}
                      onPress={markSegmentMissed}
                      style={[
                        styles.actionButton,
                        styles.missedButton,
                        isDisabled && { backgroundColor: "#9ca3af" },
                      ]}
                    >
                      <Icon name="cancel" size={20} color="#fff" />
                      <Text style={styles.buttonText}>Missed</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f9fafb" },
  loadingText: { marginTop: 10, color: "#6b7280", fontSize: 16 },
  emptyText: { color: "#9ca3af", fontSize: 16 },
  card: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
    maxHeight: "55%",
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 12,
    zIndex: 20,
    backgroundColor: "#f3f4f6",
    borderRadius: 20,
    padding: 6,
  },
  title: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 16, marginTop: 8 },
  timelineContainer: { marginVertical: 16 },
  timelineRow: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
  icon: { marginRight: 12 },
  timelineLine: {
    position: "absolute",
    left: 10,
    top: 22,
    bottom: 22,
    width: 2,
    backgroundColor: "#d1d5db",
  },
  timelineTitle: { fontSize: 13, fontWeight: "600", color: "#374151" },
  timelineLabel: { fontSize: 14, color: "#111827" },
  infoRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 6 },
  infoLabel: { fontSize: 13, color: "#6b7280" },
  infoValue: { fontSize: 14, fontWeight: "600", color: "#111827" },
  buttonRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  actionButton: {
    flex: 0.48,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 14,
    gap: 6,
  },
  startButton: { backgroundColor: "#2563eb" },
  completeButton: { backgroundColor: "#22c55e" },
  missedButton: { backgroundColor: "#ef4444" },
  buttonText: { color: "#fff", fontWeight: "700", marginLeft: 4 },
});
