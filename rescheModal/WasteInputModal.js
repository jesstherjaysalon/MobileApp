import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Animated,
  TextInput,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import api from "../api";

export default function WasteInputModal({
  visible,
  onClose,
  reschedDetailId,
  terminalId,
  onSaved,
}) {
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const [terminalInfo, setTerminalInfo] = useState(null);
  const [loadingTerminal, setLoadingTerminal] = useState(false);

  const [biodegradable, setBiodegradable] = useState("");
  const [nonBiodegradable, setNonBiodegradable] = useState("");
  const [recyclable, setRecyclable] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: visible ? 1 : 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: visible ? 1 : 0.9,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      setBiodegradable("");
      setNonBiodegradable("");
      setRecyclable("");
      setSubmitting(false);
      setTerminalInfo(null);
    }
  }, [visible]);

  // Load terminal info (estimates)
  useEffect(() => {
    if (visible && terminalId) {
      console.log("📌 [Resched] Fetching terminal info for ID:", terminalId);
      loadTerminalInfo();
    } else {
      console.log("❗ [Resched] No terminalId received:", terminalId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, terminalId]);

  const loadTerminalInfo = async () => {
    try {
      setLoadingTerminal(true);
      const res = await api.get(`/garbage-terminals/${terminalId}`);

      console.log("📌 [Resched] Terminal API Response:", res.data);

      const t = res.data.data;
      setTerminalInfo(t);

      if (t) {
        setBiodegradable(
          t.estimated_biodegradable != null ? String(t.estimated_biodegradable) : ""
        );
        setNonBiodegradable(
          t.estimated_non_biodegradable != null ? String(t.estimated_non_biodegradable) : ""
        );
        setRecyclable(
          t.estimated_recyclable != null ? String(t.estimated_recyclable) : ""
        );
      }
    } catch (err) {
      console.error(
        "[Resched] ❌ Failed to load terminal:",
        err?.response?.data || err?.message || err
      );
      Alert.alert("Error", "Unable to load terminal information.");
    } finally {
      setLoadingTerminal(false);
    }
  };

  const total = useMemo(() => {
    const a = Number(biodegradable || 0);
    const b = Number(nonBiodegradable || 0);
    const c = Number(recyclable || 0);
    return a + b + c;
  }, [biodegradable, nonBiodegradable, recyclable]);

  const validateInputs = () => {
    const parsedBio = parseInt(biodegradable || "0", 10);
    const parsedNon = parseInt(nonBiodegradable || "0", 10);
    const parsedRec = parseInt(recyclable || "0", 10);

    if (isNaN(parsedBio) || parsedBio < 0) {
      Alert.alert("Validation", "Biodegradable must be 0 or a positive integer.");
      return false;
    }
    if (isNaN(parsedNon) || parsedNon < 0) {
      Alert.alert("Validation", "Non-biodegradable must be 0 or a positive integer.");
      return false;
    }
    if (isNaN(parsedRec) || parsedRec < 0) {
      Alert.alert("Validation", "Recyclable must be 0 or a positive integer.");
      return false;
    }

    if (parsedBio + parsedNon + parsedRec <= 0) {
      Alert.alert("Validation", "Please enter at least one sack collected.");
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateInputs()) return;
    if (!reschedDetailId) {
      Alert.alert("Error", "Missing reschedDetailId.");
      return;
    }

    setSubmitting(true);

    const payload = {
      reschedule_detail_id: reschedDetailId,
      biodegradable_sacks: parseInt(biodegradable || "0", 10),
      non_biodegradable_sacks: parseInt(nonBiodegradable || "0", 10),
      recyclable_sacks: parseInt(recyclable || "0", 10),
    };

    try {
      const res = await api.post("/waste-collected", payload);
      const saved = res.data?.data ?? res.data;

      if (typeof onSaved === "function") {
        onSaved(saved);
      }

      onClose();
    } catch (err) {
      console.error(
        "WasteInputModal.save error:",
        err?.response?.data || err?.message || err
      );
      const msg =
        err?.response?.data?.message ||
        "Failed to save collection. Please try again.";
      Alert.alert("Error", msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={styles.overlay}>
        <Animated.View style={[styles.card, { transform: [{ scale }], opacity }]}>
          <View style={styles.header}>
            <Text style={styles.title}>Record Collected Waste</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={20} color="#374151" />
            </TouchableOpacity>
          </View>

          {/* Estimated values for this rescheduled segment's terminal */}
          {loadingTerminal ? (
            <ActivityIndicator size="small" />
          ) : terminalInfo ? (
            <View style={styles.estimateBox}>
              <Text style={styles.estimateTitle}>Estimated Waste for Terminal</Text>

              <Text style={styles.estimateItem}>
                Biodegradable:{" "}
                <Text style={styles.estimateValue}>
                  {terminalInfo.estimated_biodegradable}
                </Text>
              </Text>

              <Text style={styles.estimateItem}>
                Non-biodegradable:{" "}
                <Text style={styles.estimateValue}>
                  {terminalInfo.estimated_non_biodegradable}
                </Text>
              </Text>

              <Text style={styles.estimateItem}>
                Recyclable:{" "}
                <Text style={styles.estimateValue}>
                  {terminalInfo.estimated_recyclable}
                </Text>
              </Text>
            </View>
          ) : (
            <Text style={{ color: "red", marginBottom: 8 }}>
              No terminal estimate loaded.
            </Text>
          )}

          <Text style={styles.subtitle}>Enter number of sacks collected (integers).</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Biodegradable</Text>
            <TextInput
              value={biodegradable}
              onChangeText={(t) => setBiodegradable(t.replace(/[^0-9]/g, ""))}
              keyboardType="number-pad"
              placeholder="0"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Non-biodegradable</Text>
            <TextInput
              value={nonBiodegradable}
              onChangeText={(t) => setNonBiodegradable(t.replace(/[^0-9]/g, ""))}
              keyboardType="number-pad"
              placeholder="0"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Recyclable</Text>
            <TextInput
              value={recyclable}
              onChangeText={(t) => setRecyclable(t.replace(/[^0-9]/g, ""))}
              keyboardType="number-pad"
              placeholder="0"
              style={styles.input}
            />
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total sacks</Text>
            <Text style={styles.totalValue}>{total}</Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.cancelBtn]}
              onPress={onClose}
              disabled={submitting}
            >
              <Text style={styles.btnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.saveBtn]}
              onPress={handleSave}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 18,
    elevation: 14,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  subtitle: { color: "#6b7280", marginBottom: 12, fontSize: 13 },

  estimateBox: {
    backgroundColor: "#f1f5f9",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  estimateTitle: { fontSize: 14, fontWeight: "700", marginBottom: 8, color: "#0f172a" },
  estimateItem: { fontSize: 13, marginBottom: 4, color: "#475569" },
  estimateValue: { fontWeight: "bold", color: "#0f172a" },

  field: { marginBottom: 10 },
  label: { fontSize: 13, color: "#374151", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#e6e7eb",
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: "#fff",
  },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    marginBottom: 12,
  },
  totalLabel: { fontSize: 14, color: "#374151", fontWeight: "600" },
  totalValue: { fontSize: 16, fontWeight: "800", color: "#0f172a" },

  actions: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelBtn: { backgroundColor: "#9ca3af", marginRight: 6 },
  saveBtn: { backgroundColor: "#16a34a", marginLeft: 6 },
  btnText: { color: "#fff", fontWeight: "700" },
});
