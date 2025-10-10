// ForgotPassword.js
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  Animated,
  Platform,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import api from "../api";

export default function ForgotPassword({ navigation }) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Logo animations
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 5,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert("Validation", "Please enter your email.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post("/forgot-password", { email });

      // Laravel returns status message
      Alert.alert(
        "Success",
        response.data.status || "Check your email for the reset link."
      );
      navigation.goBack();
    } catch (error) {
      console.error(error);
      if (error.response) {
        Alert.alert(
          "Error",
          error.response.data.message || "Unable to send reset link."
        );
      } else {
        Alert.alert("Error", "Network error. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LinearGradient colors={["#A8E6CF", "#2E7D32"]} style={styles.container}>
      {/* Animated Logo */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Image source={require("../assets/logo.png")} style={styles.logo} />
      </Animated.View>

      {/* Card */}
      <View style={styles.card}>
        <Text style={styles.title}>Forgot Password</Text>
        <Text style={styles.subtitle}>
          Enter your email and we’ll send you a link to reset your password.
        </Text>

        {/* Email Input */}
        <View style={styles.inputWrapper}>
          <MaterialIcons name="email" size={22} color="#2E7D32" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#888"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.button, (!email || submitting) && styles.buttonDisabled]}
          onPress={handleForgotPassword}
          disabled={submitting || !email}
        >
          <LinearGradient colors={["#43A047", "#2E7D32"]} style={styles.buttonGradient}>
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>SEND RESET LINK</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Back to Login */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backWrapper}>
          <Text style={styles.backText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center" },

  logoContainer: { alignItems: "center", marginBottom: -40, zIndex: 10 },
  logo: {
    width: 120,
    height: 120,
    resizeMode: "contain",
    borderRadius: 25,
    backgroundColor: "#fff",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } },
      android: { elevation: 14 },
    }),
  },

  card: {
    marginHorizontal: 20,
    borderRadius: 30,
    padding: 28,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 15, shadowOffset: { width: 0, height: 8 } },
      android: { elevation: 10 },
    }),
  },

  title: { fontSize: 26, fontWeight: "700", color: "#2E7D32", textAlign: "center", marginTop: 50 },
  subtitle: { fontSize: 15, color: "#555", textAlign: "center", marginBottom: 30 },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 40,
    paddingHorizontal: 18,
    marginBottom: 18,
    backgroundColor: "#fff",
    height: 55,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 3 },
    }),
  },
  icon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: "#000", paddingVertical: 12 },

  button: { borderRadius: 40, overflow: "hidden" },
  buttonGradient: { width: "100%", paddingVertical: 18, alignItems: "center", borderRadius: 40 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 17, fontWeight: "bold", letterSpacing: 1 },

  backWrapper: { marginTop: 15, alignSelf: "center" },
  backText: { color: "#2E7D32", fontWeight: "500", fontSize: 15 },
});
