// components/WasteInputModal.js
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
  routeDetailId,
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

  // LOAD TERMINAL INFO
  useEffect(() => {
    if (visible && terminalId) {
      console.log("📌 Fetching terminal info for ID:", terminalId);
      loadTerminalInfo();
    } else {
      console.log("❗ No terminalId received:", terminalId);
    }
  }, [visible, terminalId]);

  const loadTerminalInfo = async () => {
    try {
      setLoadingTerminal(true);
      const res = await api.get(`/garbage-terminals/${terminalId}`);

      console.log("📌 Terminal API Response:", res.data);

      const t = res.data.data;
      setTerminalInfo(t);

      // Prefill inputs with estimated values if available
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
      console.log("❌ Failed to load terminal:", err.response?.data || err);
      Alert.alert("Error", "Unable to load terminal information.");
    } finally {
      setLoadingTerminal(false);
    }
  };

  const total = useMemo(
    () =>
      Number(biodegradable || 0) +
      Number(nonBiodegradable || 0) +
      Number(recyclable || 0),
    [biodegradable, nonBiodegradable, recyclable]
  );

  const validateInputs = () => {
    const parsed = (x) => Number(x || 0);

    if (parsed(biodegradable) < 0) {
      Alert.alert("Validation", "Biodegradable must be 0 or above.");
      return false;
    }
    if (parsed(nonBiodegradable) < 0) {
      Alert.alert("Validation", "Non-biodegradable must be 0 or above.");
      return false;
    }
    if (parsed(recyclable) < 0) {
      Alert.alert("Validation", "Recyclable must be 0 or above.");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateInputs()) return;

    setSubmitting(true);

    const payload = {
      route_detail_id: routeDetailId,
      biodegradable_sacks: Number(biodegradable || 0),
      non_biodegradable_sacks: Number(nonBiodegradable || 0),
      recyclable_sacks: Number(recyclable || 0),
    };

    try {
      const res = await api.post("/waste-collections", payload);
      onSaved?.(res.data.data);
      onClose();
    } catch (err) {
      console.log("❌ Save failed:", err.response?.data || err);
      Alert.alert("Error", "Failed to save waste collection.");
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

          {/* Terminal Estimation */}
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
            <Text style={{ color: "red" }}>No terminal data loaded.</Text>
          )}

          {/* INPUTS */}
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
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  title: { fontSize: 16, fontWeight: "800", color: "#0f172a" },

  estimateBox: {
    backgroundColor: "#f1f5f9",
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
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

  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  totalLabel: { color: "#374151", fontWeight: "600" },
  totalValue: { color: "#0f172a", fontWeight: "800" },

  actions: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  cancelBtn: { backgroundColor: "#9ca3af" },
  saveBtn: { backgroundColor: "#16a34a" },
  btnText: { color: "#fff", fontWeight: "700" },
});