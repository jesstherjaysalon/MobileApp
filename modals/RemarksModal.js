// RemarksModal.js
import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  Animated,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";

export default function RemarksModal({ visible, onClose, routeDetailId, onSaved }) {
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);

  // reset when opened/closed
  useEffect(() => {
    if (!visible) {
      setRemarks("");
      setSaving(false);
    }
  }, [visible]);

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

  const handleSave = async () => {
    if (!remarks.trim()) {
      // simple local validation
      return;
    }
    setSaving(true);
    try {
      // call parent callback; parent will call API (keeps API usage single place)
      await onSaved({ routeDetailId, remarks: remarks.trim() });
    } catch (err) {
      console.error("Failed to save remarks:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={styles.overlay}>
        <Animated.View style={[styles.card, { transform: [{ scale }], opacity }]}>
          <Text style={styles.title}>Reason for missed segment</Text>
          <Text style={styles.subtitle}>Please enter a short remark or reason (required)</Text>

          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <TextInput
              value={remarks}
              onChangeText={setRemarks}
              placeholder="Type reason (e.g. access blocked, resident absent, road closed...)"
              multiline
              numberOfLines={4}
              style={styles.textInput}
              editable={!saving}
            />
          </KeyboardAvoidingView>

          <View style={styles.buttonsRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={saving}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving || !remarks.trim()}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(2,6,23,0.55)", justifyContent: "center", alignItems: "center" },
  card: {
    width: "92%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    elevation: 12,
  },
  title: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  subtitle: { color: "#6b7280", marginTop: 6, marginBottom: 12 },
  textInput: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: "#e6e7eb",
    borderRadius: 8,
    padding: 10,
    textAlignVertical: "top",
    fontSize: 14,
    backgroundColor: "#fff",
  },
  buttonsRow: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 12 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, backgroundColor: "#f3f4f6" },
  cancelText: { color: "#374151", fontWeight: "700" },
  saveBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, backgroundColor: "#ef4444" },
  saveText: { color: "#fff", fontWeight: "700" },
});
