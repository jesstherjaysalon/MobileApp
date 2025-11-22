// RouteProgressScreen.js
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
import WasteInputModal from "../modals/WasteInputModal";
import RemarksModal from "../modals/RemarksModal";

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
            <TouchableOpacity style={styles.confirmCancel} onPress={onCancel}>
              <Text style={styles.confirmCancelText}>Go Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.confirmProceed, loading && { opacity: 0.7 }]} onPress={onConfirm} disabled={loading}>
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
            <TouchableOpacity style={[styles.confirmProceed]} onPress={onClose}>
              <Text style={styles.confirmProceedText}>Okay</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

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
      <TouchableOpacity style={[styles.segmentItem, selectedBg]} onPress={() => { onJumpTo(index); onClose(); }}>
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
            <TouchableOpacity onPress={onClose} style={styles.segmentsCloseBtn}>
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
  useSendTruckLocation(truckId);

  const [loading, setLoading] = useState(true);
  const [routeDetails, setRouteDetails] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(null);

  const [segmentsModalVisible, setSegmentsModalVisible] = useState(false);
  const [confirmState, setConfirmState] = useState({ visible: false, status: null, isStartOnly: false, message: "" });
  const [finalConfirm, setFinalConfirm] = useState({ visible: false, message: "", status: null });
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [pendingWarningVisible, setPendingWarningVisible] = useState(false);

  const [wasteModalVisible, setWasteModalVisible] = useState(false);
  const [wasteModalRouteDetailId, setWasteModalRouteDetailId] = useState(null);

  const [remarksModalVisible, setRemarksModalVisible] = useState(false);
  const [remarksRouteDetailId, setRemarksRouteDetailId] = useState(null);

  // NEW: track if we are waiting for waste input on the final completed segment
  const [pendingFinalCompleted, setPendingFinalCompleted] = useState(false);
  const [pendingFinalRouteDetailId, setPendingFinalRouteDetailId] = useState(null);

  const [focusedIndex, setFocusedIndex] = useState(null);

  useEffect(() => {
    let mounted = true;
    const fetchRoute = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/route-details/${routePlanId}`);
        const segments = res.data?.routeDetails || [];
        if (!mounted) return;
        setRouteDetails(segments);
        const firstActive = segments.findIndex((s) => !s.status || s.status === "pending");
        setCurrentIndex(firstActive >= 0 ? firstActive : 0);
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    if (routePlanId) fetchRoute();
    else setLoading(false);
    return () => { mounted = false; };
  }, [routePlanId]);

  const activeIndex = useMemo(() => routeDetails.findIndex((s) => !s.status || s.status === "pending"), [routeDetails]);
  const anyPendingSegments = useMemo(() => routeDetails.some((s) => !s.status || s.status === "pending"), [routeDetails]);
  const anyMissedSegments = useMemo(() => routeDetails.some((s) => s.status === "missed"), [routeDetails]);

  const patchSegment = async (id, payload) => await api.patch(`/route-details/${id}/status`, payload);

  const completeSchedule = async () => {
    try { await api.patch(`/garbage_schedules/${routePlanId}/complete`); } catch (err) { console.error(err); }
  };

  const advanceSegment = async (status, isStartOnly = false, remarks = null) => {
    try {
      setConfirmLoading(true);
      const updated = [...routeDetails];
      const index = selectedIndex !== null ? selectedIndex : currentIndex;
      const segment = updated[index];
      if (!segment) return;

      if (index !== activeIndex && !isStartOnly) { setPendingWarningVisible(true); return; }

      const now = moment().toISOString();
      const segPayload = {};
      if (isStartOnly) segPayload.start_time = now;
      else { segPayload.status = status; segPayload.completed_at = now; if (status === "missed" && remarks) segPayload.remarks = remarks; }

      // persist the segment change first
      await patchSegment(segment.id, segPayload);
      updated[index] = { ...segment, ...segPayload };

      // patch next start_time only for non-final segments
      if (!isStartOnly && (status === "completed" || status === "missed") && index + 1 < updated.length) {
        const nextSegment = updated[index + 1];
        const nextPayload = { start_time: segPayload.completed_at || now };
        try { await patchSegment(nextSegment.id, nextPayload); updated[index + 1] = { ...nextSegment, ...nextPayload }; } catch (err) { updated[index + 1] = { ...nextSegment, ...nextPayload }; }
      }
      setRouteDetails(updated);

      // If this is not start-only and status is completed -> open waste modal for that segment (non-final too)
      if (!isStartOnly && status === "completed") {
        // If this is the final segment in the route, we MUST collect waste before finishing the schedule.
        if (index + 1 >= updated.length) {
          // mark finished visually, but DO NOT complete schedule / navigate yet.
          setFinished(true);
          setPendingFinalCompleted(true);
          setPendingFinalRouteDetailId(segment.id);
          setWasteModalRouteDetailId(segment.id);
          setWasteModalVisible(true);
          // do not call completeSchedule() or navigate here — wait until waste input saved
          return;
        } else {
          // Non-final completed: open waste modal for optional collection input, but proceed with normal index advance.
          setWasteModalRouteDetailId(segment.id);
          setWasteModalVisible(true);
        }
      }

      // If this is not start-only and status is missed
      if (!isStartOnly && status === "missed") {
        // If final segment missed => advanceSegment will say index + 1 >= updated.length below and handle completion
      }

      // Advance to next segment if there is one
      if (!isStartOnly && index + 1 < updated.length) {
        setCurrentIndex(index + 1);
        setSelectedIndex(null);
        setFocusedIndex(null);
      }

      // If this was the final segment and is not 'completed' awaiting waste input:
      if (!isStartOnly && index + 1 >= updated.length) {
        // If status is missed -> finalize immediately
        if (status === "missed") {
          const completedCount = updated.filter((seg) => seg.status === "completed").length;
          const missedZones = updated.filter((seg) => seg.status === "missed");
          setFinished(true);
          await completeSchedule();
          navigation.replace("Home", { routePlanId, completedCount, missedZones });
          return;
        }

        // If status was 'completed', we already returned earlier after opening waste modal for final segment
      }
    } catch (err) { console.error(err); }
    finally { setConfirmLoading(false); setConfirmState({ visible: false, status: null, isStartOnly: false, message: "" }); setFinalConfirm({ visible: false, message: "", status: null }); }
  };

  const confirmAdvance = (status, isStartOnly = false) => {
    const index = selectedIndex !== null ? selectedIndex : currentIndex;
    if (index !== activeIndex && !isStartOnly) { setPendingWarningVisible(true); return; }
    if (!isStartOnly && status === "missed") { setRemarksRouteDetailId(routeDetails[index]?.id ?? null); setRemarksModalVisible(true); return; }

    let message = "";
    if (isStartOnly) message = "Do you want to start this segment now?";
    else if (status === "completed") message = "Confirm this segment as completed.";
    else if (status === "missed") message = "Mark this segment as missed?";
    setConfirmState({ visible: true, status, isStartOnly, message });
  };

  // When remarks modal saved (missed case) -> call advanceSegment to finalize (this will navigate if final)
  const handleRemarksSaved = async ({ routeDetailId, remarks }) => {
    try {
      setRemarksModalVisible(false);
      setRemarksRouteDetailId(null);
      // Ensure we operate on the correct segment index (find it by id in case selection changed)
      const segIndex = routeDetails.findIndex((s) => s.id === routeDetailId);
      if (segIndex !== -1) {
        // If user was looking at another index, temporarily set selected/current to this one so the advanceSegment uses it.
        setSelectedIndex(segIndex);
        setCurrentIndex(segIndex);
      }
      await advanceSegment("missed", false, remarks);
    } catch (err) {
      console.error(err);
    } finally {
      // clear selection after
      setSelectedIndex(null);
    }
  };

  // When waste modal saved -> update the route details, and if this was the pending final completion, finish schedule and navigate
  const handleWasteSaved = async (saved) => {
    try {
      const segIndex = routeDetails.findIndex((s) => s.id === wasteModalRouteDetailId);
      if (segIndex !== -1) {
        const updated = [...routeDetails];
        updated[segIndex] = { ...updated[segIndex], collection: saved };
        setRouteDetails(updated);

        // If this waste save was for a final completed segment that was pending -> finish schedule & navigate now
        if (pendingFinalCompleted && pendingFinalRouteDetailId && pendingFinalRouteDetailId === wasteModalRouteDetailId) {
          // compute counts
          const completedCount = updated.filter((seg) => seg.status === "completed").length;
          const missedZones = updated.filter((seg) => seg.status === "missed");
          setPendingFinalCompleted(false);
          setPendingFinalRouteDetailId(null);
          setWasteModalVisible(false);
          setWasteModalRouteDetailId(null);
          setFinished(true);
          try {
            await completeSchedule();
          } catch (err) {
            console.error("Error completing schedule after waste save:", err);
          }
          navigation.replace("RouteSummary", { routePlanId, completedCount, missedZones });
          return;
        }

        // Non-final: simple close and continue
      }
    } catch (err) {
      console.error(err);
    } finally {
      // Close waste modal if not already closed above
      if (!pendingFinalCompleted) {
        setWasteModalVisible(false);
        setWasteModalRouteDetailId(null);
      }
    }
  };

  if (loading) return (<SafeAreaView style={styles.center}><ActivityIndicator size="large" color="#2563eb" /><Text style={styles.loadingText}>Loading route...</Text></SafeAreaView>);
  if (!routeDetails.length) return (<SafeAreaView style={styles.center}><Text style={styles.emptyText}>No route details available.</Text></SafeAreaView>);

  const visibleIndex = selectedIndex !== null ? selectedIndex : currentIndex;
  const currentSegment = routeDetails[visibleIndex] || {};
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
        onMarkerPress={(segment, idx) => { if (typeof idx === "number") { setSelectedIndex(idx); setCurrentIndex(idx); setFocusedIndex(idx); } }}
      />

      <View style={styles.topControls} pointerEvents="box-none">
        <TouchableOpacity style={styles.segmentsToggle} onPress={() => setSegmentsModalVisible(true)}>
          <Icon name="menu" size={20} color="#fff" />
          <Text style={styles.segmentsToggleText}>Segments</Text>
        </TouchableOpacity>
      </View>

      {selectedIndex !== null && (
        <View style={[styles.card, { paddingBottom: Math.max(insets.bottom, Platform.OS === "android" ? 16 : 10) + 8 }]}>
          <TouchableOpacity style={styles.closeButton} onPress={() => { setSelectedIndex(null); setFocusedIndex(null); }}>
            <Icon name="close" size={20} color="#374151" />
          </TouchableOpacity>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Segment {visibleIndex + 1} of {routeDetails.length}</Text>
            <View style={styles.timelineContainer}>
              <View style={styles.timelineRow}><Icon name="location-on" size={20} color="#10b981" style={styles.icon} /><View><Text style={styles.timelineTitle}>From</Text><Text style={styles.timelineLabel}>{currentSegment.from_name ?? "-"}</Text></View></View>
              <View style={styles.timelineLine} />
              <View style={styles.timelineRow}><Icon name="flag" size={20} color="#ef4444" style={styles.icon} /><View><Text style={styles.timelineTitle}>To</Text><Text style={styles.timelineLabel}>{currentSegment.to_name ?? "-"}</Text></View></View>
            </View>
            <View style={styles.infoRow}><Text style={styles.infoLabel}>Distance:</Text><Text style={styles.infoValue}>{formatDistance(Number(currentSegment.distance_km || 0))}</Text></View>
            <View style={styles.infoRow}><Text style={styles.infoLabel}>Duration:</Text><Text style={styles.infoValue}>{formatDuration(Number(currentSegment.duration_min || 0))}</Text></View>
            <Text style={styles.footerNote}>Start and arrival times may vary. Updates will be sent automatically.</Text>
            {!finished && (
              <View style={styles.buttonRow}>
                {visibleIndex === activeIndex && !currentSegment?.start_time ? (
                  <TouchableOpacity disabled={disableStartButton} onPress={() => confirmAdvance(null, true)} style={[styles.actionButton, styles.startButton, disableStartButton && { opacity: 0.6 }]}>
                    <Icon name="play-arrow" size={20} color="#fff" /><Text style={styles.buttonText}>Start Segment</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity disabled={disableCompleteButton} onPress={() => confirmAdvance("completed")} style={[styles.actionButton, styles.completeButton, disableCompleteButton && { opacity: 0.6 }]}>
                      <Icon name="check-circle" size={20} color="#fff" /><Text style={styles.buttonText}>Complete</Text>
                    </TouchableOpacity>
                    <TouchableOpacity disabled={disableMissedButton} onPress={() => confirmAdvance("missed")} style={[styles.actionButton, styles.missedButton, disableMissedButton && { opacity: 0.6 }]}>
                      <Icon name="cancel" size={20} color="#fff" /><Text style={styles.buttonText}>Missed</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      )}

      <SegmentsModal visible={segmentsModalVisible} onClose={() => setSegmentsModalVisible(false)} segments={routeDetails} focusedIndex={focusedIndex} onJumpTo={(idx) => { setSelectedIndex(idx); setCurrentIndex(idx); setFocusedIndex(idx); }} />

      <ConfirmModal visible={!!confirmState.visible} title={confirmState.isStartOnly ? "Start Segment" : confirmState.status === "completed" ? "Complete Segment" : "Mark as Missed"} message={confirmState.message} loading={confirmLoading} onCancel={() => setConfirmState({ visible: false, status: null, isStartOnly: false, message: "" })} onConfirm={() => advanceSegment(confirmState.status, confirmState.isStartOnly)} />
      <ConfirmModal visible={!!finalConfirm.visible} title={"Finish Route"} message={finalConfirm.message} loading={confirmLoading} onCancel={() => setFinalConfirm({ visible: false, message: "", status: null })} onConfirm={() => advanceSegment(finalConfirm.status, false)} />
      <PendingWarningModal visible={pendingWarningVisible} message={"There are still pending segments. You must finish all before completing the route."} onClose={() => setPendingWarningVisible(false)} />

      <WasteInputModal
        visible={wasteModalVisible}
        onClose={() => {
          // If we closed waste modal and it was pending final, we should clear pending final and allow user to continue
          if (pendingFinalCompleted && pendingFinalRouteDetailId === wasteModalRouteDetailId) {
            setPendingFinalCompleted(false);
            setPendingFinalRouteDetailId(null);
            setWasteModalRouteDetailId(null);
            setWasteModalVisible(false);
            // optionally show a message that final completion is required to finish — keeping UX simple, we just close.
            return;
          }
          setWasteModalVisible(false);
          setWasteModalRouteDetailId(null);
        }}
        routeDetailId={wasteModalRouteDetailId}
        onSaved={(saved) => handleWasteSaved(saved)}
      />
      <RemarksModal visible={remarksModalVisible} onClose={() => { setRemarksModalVisible(false); setRemarksRouteDetailId(null); }} routeDetailId={remarksRouteDetailId} onSaved={(payload) => handleRemarksSaved(payload)} />
    </SafeAreaView>
  );
}


/* ---------------------- styles ---------------------- */
/* (same styles as your original file) */
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

  // Modal styles (Confirm and Segments)
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

  // Confirm card styles
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
