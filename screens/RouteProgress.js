// RouteProgressScreen.js — Full fixed implementation with sequential control (bottom-card only)
import React, { useEffect, useMemo, useState, useRef } from "react";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ScrollView,
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Modal,
  Animated,
  FlatList,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import moment from "moment";
import GoogleMapView from "../GoogleMapView";
import useSendTruckLocation from "../hooks/useSendTruckLocation";
import api from "../api";
import { useNavigation } from "@react-navigation/native";

/* ---------------------- helpers ---------------------- */
const formatDistance = (km) => {
  if (!km || km <= 0) return "0 m";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${Number(km).toFixed(2)} km`;
};

const formatDuration = (minutes) => {
  if (!minutes || minutes <= 0) return "0 min";
  if (minutes < 1) return `${Math.round(minutes * 100)} sec`;
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hrs}h ${mins}m`;
};

/* ---------------------- UI modals ---------------------- */
function ConfirmModal({ visible, title, message, onCancel, onConfirm, loading }) {
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 8, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 120, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.9, duration: 120, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={styles.modalOverlay}>
        <Animated.View style={[styles.confirmCard, { transform: [{ scale }], opacity }]}>
          <Text style={styles.confirmTitle}>{title}</Text>
          <Text style={styles.confirmMessage}>{message}</Text>

          <View style={styles.confirmButtonsRow}>
            <TouchableOpacity style={styles.confirmCancel} onPress={onCancel} accessibilityRole="button">
              <Text style={styles.confirmCancelText}>Go Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmProceed, loading && { opacity: 0.7 }]}
              onPress={onConfirm}
              disabled={loading}
              accessibilityRole="button"
            >
              {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.confirmProceedText}>Proceed</Text>}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function PendingWarningModal({ visible, message, onClose }) {
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 8, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 120, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.9, duration: 120, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={styles.modalOverlay}>
        <Animated.View style={[styles.confirmCard, { transform: [{ scale }], opacity }]}>
          <Text style={styles.confirmTitle}>Pending Segments</Text>
          <Text style={styles.confirmMessage}>{message}</Text>

          <View style={[styles.confirmButtonsRow, { justifyContent: "center" }]}>
            <TouchableOpacity style={[styles.confirmProceed]} onPress={onClose} accessibilityRole="button">
              <Text style={styles.confirmProceedText}>Okay</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

/* Segments list modal (you allowed jumping; we keep it viewable) */
function SegmentsModal({ visible, onClose, segments, onJumpTo, focusedIndex }) {
  const translateY = useRef(new Animated.Value(40)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, friction: 8, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 40, duration: 160, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const renderItem = ({ item, index }) => {
    const statusColor = item.status === "completed" ? "#10b981" : item.status === "missed" ? "#ef4444" : "#f59e0b";
    const selectedBg = index === focusedIndex ? { backgroundColor: "#fff7ed" } : {};
    return (
      <TouchableOpacity
        style={[styles.segmentItem, selectedBg]}
        onPress={() => {
          onJumpTo(index);
          onClose();
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.segmentTitle}>{`#${index + 1} — ${item.from_name ?? "Unknown"}`}</Text>
          <Text style={styles.segmentSub}>{item.to_name ?? "—"}</Text>
        </View>
        <View style={[styles.segmentBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.segmentBadgeText}>{item.status ?? "pending"}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={styles.modalOverlay}>
        <Animated.View style={[styles.segmentsCard, { transform: [{ translateY }], opacity }]}>
          <View style={styles.segmentsHeader}>
            <Text style={styles.segmentsHeaderTitle}>Route Segments</Text>
            <TouchableOpacity onPress={onClose} style={styles.segmentsCloseBtn} accessibilityLabel="Close segments list">
              <Icon name="close" size={20} color="#374151" />
            </TouchableOpacity>
          </View>

          <FlatList data={segments} keyExtractor={(it) => String(it.id ?? Math.random())} renderItem={renderItem} contentContainerStyle={{ paddingBottom: 20 }} />
        </Animated.View>
      </View>
    </Modal>
  );
}

/* ---------------------- main component ---------------------- */
export default function RouteProgressScreen({ route }) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const { routePlanId, truckId } = route?.params || {};
  useSendTruckLocation(truckId); // keep side-effect hook active (we don't use the returned value here directly)

  const [loading, setLoading] = useState(true);
  const [routeDetails, setRouteDetails] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0); // index used for map "current" focus
  const [finished, setFinished] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(null);

  // UI state
  const [segmentsModalVisible, setSegmentsModalVisible] = useState(false);
  const [confirmState, setConfirmState] = useState({ visible: false, status: null, isStartOnly: false, message: "" });
  const [finalConfirm, setFinalConfirm] = useState({ visible: false, message: "", status: null });
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [pendingWarningVisible, setPendingWarningVisible] = useState(false);

  // Focus override: index clicked from modal or marker press
  const [focusedIndex, setFocusedIndex] = useState(null);

  /* ---------------------- fetch route details ---------------------- */
  useEffect(() => {
    let mounted = true;
    const fetchRoute = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/route-details/${routePlanId}`);
        const segments = res.data?.routeDetails || [];
        if (!mounted) return;
        setRouteDetails(segments);
        // compute currentIndex as first active index if available
        const firstActive = segments.findIndex((s) => !s.status || s.status === "pending");
        setCurrentIndex(firstActive >= 0 ? firstActive : 0);
        setSelectedIndex(null);
        setFocusedIndex(null);
      } catch (err) {
        console.error("❌ Failed to fetch route details:", err?.response?.data || err?.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    if (routePlanId) fetchRoute();
    else setLoading(false);
    return () => {
      mounted = false;
    };
  }, [routePlanId]);

  /* ---------------------- derived helpers ---------------------- */

  // activeIndex = first pending segment (the only one editable in bottom card)
  const activeIndex = useMemo(() => {
    return routeDetails.findIndex((s) => !s.status || s.status === "pending");
  }, [routeDetails]);

  // quick front-end checks
  const anyPendingSegments = useMemo(() => routeDetails.some((s) => !s.status || s.status === "pending"), [routeDetails]);
  const anyMissedSegments = useMemo(() => routeDetails.some((s) => s.status === "missed"), [routeDetails]);

  // helper: patch a segment and return updated segment (re-using API shape)
  const patchSegment = async (id, payload) => {
    const res = await api.patch(`/route-details/${id}/status`, payload);
    return res.data; // expecting the updated segment object (depends on your backend)
  };

  const completeSchedule = async () => {
    try {
      await api.patch(`/garbage_schedules/${routePlanId}/complete`);
    } catch (err) {
      console.error("❌ Failed to mark garbage schedule:", err?.response?.data || err?.message);
    }
  };

  /* ---------------------- advanceSegment (core) ---------------------- */
  const advanceSegment = async (status, isStartOnly = false) => {
    // IMPORTANT: this function assumes the user already confirmed in the ConfirmModal
    try {
      setConfirmLoading(true);

      // Re-read local state snapshot
      const updated = [...routeDetails];
      const index = selectedIndex !== null ? selectedIndex : currentIndex;
      const segment = updated[index];
      if (!segment) return;

      // Only allow advancing the active segment from the bottom card
      if (index !== activeIndex) {
        // Defensive: block any attempt to update non-active via front-end
        setPendingWarningVisible(true);
        return;
      }

      // Prepare payloads
      const now = moment().toISOString();
      const segPayload = {};
      if (isStartOnly) {
        segPayload.start_time = now;
      } else {
        segPayload.status = status;
        segPayload.completed_at = now;
      }

      // PATCH current segment
      try {
        await patchSegment(segment.id, segPayload);
      } catch (err) {
        // if backend returns validation error (e.g., out-of-order) show console but don't crash
        console.error("❌ patch current segment failed:", err?.response?.data || err?.message);
        throw err;
      }

      // Optimistically update local state
      updated[index] = { ...segment, ...segPayload };

      // If we completed or missed it and there's a next segment, chain its start_time to this completion
      if (!isStartOnly && (status === "completed" || status === "missed") && index + 1 < updated.length) {
        const nextSegment = updated[index + 1];
        const nextPayload = { start_time: segPayload.completed_at || now };

        try {
          await patchSegment(nextSegment.id, nextPayload);
          updated[index + 1] = { ...nextSegment, ...nextPayload };
        } catch (err) {
          console.error("❌ patch next segment failed:", err?.response?.data || err?.message);
          // fallback: still set local state so UI shows something sensible
          updated[index + 1] = { ...nextSegment, ...nextPayload };
        }
      }

      // Write back local state
      setRouteDetails(updated);

      // Move index forward if we completed/missed current and there is a next one
      if (!isStartOnly && index + 1 < updated.length) {
        setCurrentIndex(index + 1);
        setSelectedIndex(null);
        setFocusedIndex(null);
      }

      // If last segment completed, finish schedule
      if (!isStartOnly && index + 1 >= updated.length) {
        const completedCount = updated.filter((seg) => seg.status === "completed").length;
        const missedZones = updated.filter((seg) => seg.status === "missed");
        setFinished(true);
        await completeSchedule();

        navigation.replace("RouteSummary", {
          routePlanId,
          completedCount,
          missedZones,
        });
      }
    } catch (err) {
      // intentionally not showing UI toast here (you may add): backend should also reject out-of-order updates
      console.error("❌ Error advancing segment:", err?.response?.data || err?.message);
    } finally {
      setConfirmLoading(false);
      setConfirmState({ visible: false, status: null, isStartOnly: false, message: "" });
      setFinalConfirm({ visible: false, message: "", status: null });
    }
  };

  /* ---------------------- confirmAdvance (decides which modal to show) ---------------------- */
  const confirmAdvance = (status, isStartOnly = false) => {
    const index = selectedIndex !== null ? selectedIndex : currentIndex;

    // if user tries to act on non-active segment via bottom card, block it (safeguard)
    if (index !== activeIndex && !isStartOnly) {
      setPendingWarningVisible(true);
      return;
    }

    const isLastSegment = index + 1 >= routeDetails.length;

    if (!isStartOnly && status === "completed" && isLastSegment) {
      // If final completion and there are pending/missed segments elsewhere
      const hasMissed = anyMissedSegments && routeDetails.some((s, idx) => idx !== index && s.status === "missed");
      const hasPending = anyPendingSegments && routeDetails.some((s, idx) => idx !== index && (!s.status || s.status === "pending"));

      if (hasPending) {
        // block finishing route if pending segments still exist
        setPendingWarningVisible(true);
        return;
      }

      if (hasMissed) {
        // allow finish route but confirm because some were missed
        const message = "There are missed segments. Would you like to proceed or go back?";
        setFinalConfirm({ visible: true, message, status });
        return;
      }
    }

    // default per-segment confirmation
    let message = "";
    if (isStartOnly) message = "Do you want to start this segment now?";
    else if (status === "completed") message = "Confirm this segment as completed.";
    else if (status === "missed") message = "Mark this segment as missed?";

    setConfirmState({ visible: true, status, isStartOnly, message });
  };

  /* ---------------------- UI render guards ---------------------- */
  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading route...</Text>
      </SafeAreaView>
    );
  }

  if (!routeDetails.length) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.emptyText}>No route details available.</Text>
      </SafeAreaView>
    );
  }

  // visibleIndex = index for bottom card (either selected or current)
  const visibleIndex = selectedIndex !== null ? selectedIndex : currentIndex;
  const currentSegment = routeDetails[visibleIndex] || {};

  // Bottom-card button enabling rules (SEQUENTIAL CONTROL APPLIED HERE ONLY)
  // Buttons are enabled only when visibleIndex === activeIndex (the first pending segment)
  const isActiveSegment = visibleIndex === activeIndex;
  const alreadyFinalized = currentSegment?.status === "completed" || currentSegment?.status === "missed";

  const disableStartButton = !!currentSegment?.start_time || !isActiveSegment || alreadyFinalized;
  const disableCompleteButton = alreadyFinalized || !isActiveSegment;
  const disableMissedButton = alreadyFinalized || !isActiveSegment;

  return (
    <SafeAreaView style={styles.safeArea}>
      <GoogleMapView
        segments={routeDetails}
        currentIndex={currentIndex}
        focusedIndex={focusedIndex}
        onMarkerPress={(segment, idx) => {
          if (typeof idx === "number") {
            setSelectedIndex(idx);
            setCurrentIndex(idx);
            setFocusedIndex(idx); // focus map on marker and mark orange
          }
        }}
      />

      {/* Top-right toggle button to open segments modal */}
      <View style={styles.topControls} pointerEvents="box-none">
        <TouchableOpacity style={styles.segmentsToggle} onPress={() => setSegmentsModalVisible(true)} accessibilityRole="button">
          <Icon name="menu" size={20} color="#fff" />
          <Text style={styles.segmentsToggleText}>Segments</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Card (only shown when user selects a segment from modal OR auto-focus current) */}
      {selectedIndex !== null && (
        <View style={[styles.card, { paddingBottom: Math.max(insets.bottom, Platform.OS === "android" ? 16 : 10) + 8 }]}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              setSelectedIndex(null);
              setFocusedIndex(null);
            }}
            accessibilityLabel="Close segment card"
          >
            <Icon name="close" size={20} color="#374151" />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>
              Segment {visibleIndex + 1} of {routeDetails.length}
            </Text>

            {/* From/To */}
            <View style={styles.timelineContainer}>
              <View style={styles.timelineRow}>
                <Icon name="location-on" size={20} color="#10b981" style={styles.icon} />
                <View>
                  <Text style={styles.timelineTitle}>From</Text>
                  <Text style={styles.timelineLabel}>{currentSegment.from_name ?? "-"}</Text>
                </View>
              </View>

              <View style={styles.timelineLine} />

              <View style={styles.timelineRow}>
                <Icon name="flag" size={20} color="#ef4444" style={styles.icon} />
                <View>
                  <Text style={styles.timelineTitle}>To</Text>
                  <Text style={styles.timelineLabel}>{currentSegment.to_name ?? "-"}</Text>
                </View>
              </View>
            </View>

            {/* Info */}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Distance:</Text>
              <Text style={styles.infoValue}>{formatDistance(Number(currentSegment.distance_km || 0))}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Duration:</Text>
              <Text style={styles.infoValue}>{formatDuration(Number(currentSegment.duration_min || 0))}</Text>
            </View>

            <Text style={styles.footerNote}>Start and arrival times may vary. Updates will be sent automatically.</Text>

            {/* Actions (SEQUENTIAL CONTROL APPLIED: only activeIndex is editable) */}
            {!finished && (
              <View style={styles.buttonRow}>
                {/* Start button shown for the active segment when no start_time exists */}
                {visibleIndex === activeIndex && !currentSegment?.start_time ? (
                  <TouchableOpacity
                    disabled={disableStartButton}
                    onPress={() => confirmAdvance(null, true)}
                    style={[styles.actionButton, styles.startButton, disableStartButton && { opacity: 0.6 }]}
                  >
                    <Icon name="play-arrow" size={20} color="#fff" />
                    <Text style={styles.buttonText}>Start Segment</Text>
                  </TouchableOpacity>
                ) : (
                  // For non-active or already-started segments show Complete+Missed buttons, but they are enabled only for active segment
                  <>
                    <TouchableOpacity
                      disabled={disableCompleteButton}
                      onPress={() => confirmAdvance("completed")}
                      style={[styles.actionButton, styles.completeButton, disableCompleteButton && { opacity: 0.6 }]}
                    >
                      <Icon name="check-circle" size={20} color="#fff" />
                      <Text style={styles.buttonText}>Complete</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      disabled={disableMissedButton}
                      onPress={() => confirmAdvance("missed")}
                      style={[styles.actionButton, styles.missedButton, disableMissedButton && { opacity: 0.6 }]}
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

      {/* Segments list modal (still allows jumping to any segment for view) */}
      <SegmentsModal
        visible={segmentsModalVisible}
        onClose={() => setSegmentsModalVisible(false)}
        segments={routeDetails}
        focusedIndex={focusedIndex}
        onJumpTo={(idx) => {
          setSelectedIndex(idx);
          setCurrentIndex(idx);
          setFocusedIndex(idx); // instruct the map to focus and mark the marker
        }}
      />

      {/* Per-action confirmation modal */}
      <ConfirmModal
        visible={!!confirmState.visible}
        title={confirmState.isStartOnly ? "Start Segment" : confirmState.status === "completed" ? "Complete Segment" : "Mark as Missed"}
        message={confirmState.message}
        loading={confirmLoading}
        onCancel={() => setConfirmState({ visible: false, status: null, isStartOnly: false, message: "" })}
        onConfirm={() => advanceSegment(confirmState.status, confirmState.isStartOnly)}
      />

      {/* Final-check confirmation when finishing route but missed segments exist */}
      <ConfirmModal
        visible={!!finalConfirm.visible}
        title={"Finish Route"}
        message={finalConfirm.message}
        loading={confirmLoading}
        onCancel={() => setFinalConfirm({ visible: false, message: "", status: null })}
        onConfirm={() => {
          advanceSegment(finalConfirm.status, false);
        }}
      />

      {/* Pending-block warning modal */}
      <PendingWarningModal
        visible={pendingWarningVisible}
        message={"There are still pending segments. You must finish all before completing the route."}
        onClose={() => setPendingWarningVisible(false)}
      />
    </SafeAreaView>
  );
}

/* ---------------------- styles ---------------------- */
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f9fafb" },
  loadingText: { marginTop: 10, color: "#6b7280", fontSize: 16 },
  emptyText: { color: "#9ca3af", fontSize: 16 },

  topControls: {
    position: "absolute",
    top: 60,
    left: 12,
    zIndex: 60,
    flexDirection: "row",
    alignItems: "center",
  },
  segmentsToggle: {
    backgroundColor: "#d88304ff",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  segmentsToggleText: { color: "#fff", marginLeft: 8, fontWeight: "700" },

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
  title: { fontSize: 18, fontWeight: "700", color: "#0f172a", marginBottom: 16, marginTop: 8 },
  timelineContainer: { marginVertical: 16 },
  timelineRow: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
  icon: { marginRight: 12 },
  timelineLine: {
    position: "absolute",
    left: 10,
    top: 22,
    bottom: 22,
    width: 2,
    backgroundColor: "#e6e7eb",
  },
  timelineTitle: { fontSize: 13, fontWeight: "600", color: "#374151" },
  timelineLabel: { fontSize: 14, color: "#0f172a" },
  infoRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 6 },
  infoLabel: { fontSize: 13, color: "#6b7280" },
  infoValue: { fontSize: 14, fontWeight: "600", color: "#0f172a" },
  footerNote: { fontSize: 12, color: "#6b7280", lineHeight: 16, marginTop: 8, marginBottom: 16 },
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
  completeButton: { backgroundColor: "#16a34a" },
  missedButton: { backgroundColor: "#ef4444" },
  buttonText: { color: "#fff", fontWeight: "700", marginLeft: 6 },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.55)",
    justifyContent: "flex-end",
  },
  segmentsCard: {
    maxHeight: "70%",
    backgroundColor: "rgba(255,255,255,0.98)",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 14,
    paddingBottom: 8,
    elevation: 12,
  },
  segmentsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  segmentsHeaderTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  segmentsCloseBtn: { padding: 6, borderRadius: 12, backgroundColor: "#f3f4f6" },
  segmentItem: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 10, borderRadius: 12, marginVertical: 6, backgroundColor: "#fff" },
  segmentTitle: { fontWeight: "700", color: "#0f172a" },
  segmentSub: { color: "#6b7280", marginTop: 4 },
  segmentBadge: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999 },
  segmentBadgeText: { color: "#fff", fontWeight: "700" },

  // Confirm card
  confirmCard: {
    marginHorizontal: 24,
    marginBottom: 80,
    backgroundColor: "rgba(255,255,255,0.98)",
    padding: 18,
    borderRadius: 14,
    elevation: 14,
    alignItems: "stretch",
  },
  confirmTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a", marginBottom: 6 },
  confirmMessage: { color: "#374151", marginBottom: 12, lineHeight: 18 },
  confirmButtonsRow: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
  confirmCancel: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, marginRight: 8 },
  confirmCancelText: { color: "#374151", fontWeight: "700" },
  confirmProceed: { backgroundColor: "#111827", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  confirmProceedText: { color: "#fff", fontWeight: "800" },
});
