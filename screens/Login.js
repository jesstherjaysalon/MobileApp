import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
  Animated,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

import { storeUser, storeToken, getUser } from "../storageUtils";
import api from "../api";

export default function Login({ navigation }) {
  // --- Hooks (must always be top level) ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secureText, setSecureText] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  // --- Animated logo ---
  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, friction: 5, tension: 50, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 1000, useNativeDriver: true }),
    ]).start();
  }, []);

  // --- Check if already logged in ---
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getUser();
        if (user && user.role) {
          if (user.role === "driver") navigation.replace("Home");
          else if (user.role === "zonal_leader") navigation.replace("Zone");
          else Alert.alert("Access Denied", "Your role is not allowed to log in.");
        }
      } catch (e) {
        console.error("Auth check error:", e);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [navigation]);

  // --- Real-time validation ---
  useEffect(() => {
    if (email && !email.includes("@gmail.com")) setEmailError("Email must contain @gmail.com");
    else setEmailError("");
  }, [email]);

  useEffect(() => {
    if (password && password.length < 6) setPasswordError("Password must be at least 6 characters");
    else setPasswordError("");
  }, [password]);

  // --- Login handler ---
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Validation", "Please enter both email and password.");
      return;
    }
    if (emailError || passwordError) {
      Alert.alert("Validation", "Please fix the errors first.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post("/login", { email, password });
      const { token, user } = response.data;

      if (!user || !user.role) {
        Alert.alert("Error", "Invalid user data received.");
        return;
      }

      await storeToken(token);
      await storeUser(user);

      if (user.role === "driver") navigation.replace("Home");
      else if (user.role === "zonal_leader") navigation.replace("Zone");
      else Alert.alert("Access Denied", "Your role is not allowed to log in.");
    } catch (error) {
      console.error(error);
      if (error.response) {
        Alert.alert("Login Failed", error.response.data.message || "Invalid credentials");
      } else {
        Alert.alert("Error", "Unable to connect to server");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <LinearGradient colors={["#A8E6CF", "#2E7D32"]} style={styles.container}>
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#2E7D32" />
            </View>
          ) : (
            <>
              {/* Animated Logo */}
              <Animated.View style={[styles.logoContainer, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
                <Image source={require("../assets/logo.png")} style={styles.logo} />
              </Animated.View>

              {/* Card */}
              <View style={styles.card}>
                <Text style={styles.title}>Welcome Back</Text>
                <Text style={styles.subtitle}>Sign in to continue</Text>

                {/* Email */}
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
                {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

                {/* Password */}
                <View style={styles.inputWrapper}>
                  <MaterialIcons name="lock" size={22} color="#2E7D32" style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#888"
                    secureTextEntry={secureText}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity onPress={() => setSecureText(!secureText)}>
                    <MaterialIcons name={secureText ? "visibility-off" : "visibility"} size={22} color="#aaa" />
                  </TouchableOpacity>
                </View>
                {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

                {/* Forgot Password */}
                <TouchableOpacity style={styles.forgotWrapper} onPress={() => navigation.navigate("ForgotPassword")}>
                  <Text style={styles.forgotText}>Forgot Password?</Text>
                </TouchableOpacity>

                {/* Login Button */}
                <TouchableOpacity
                  style={[styles.button, (emailError || passwordError || submitting) && styles.buttonDisabled]}
                  onPress={handleLogin}
                  disabled={submitting || !!emailError || !!passwordError}
                >
                  <LinearGradient colors={["#43A047", "#2E7D32"]} style={styles.buttonGradient}>
                    {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>SIGN IN</Text>}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </>
          )}
        </LinearGradient>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

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

  title: { fontSize: 28, fontWeight: "700", color: "#2E7D32", textAlign: "center", marginTop: 50 },
  subtitle: { fontSize: 16, color: "#555", textAlign: "center", marginBottom: 30 },

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

  errorText: { color: "red", fontSize: 13, marginBottom: 10, marginLeft: 10 },

  forgotWrapper: { alignSelf: "flex-end", marginBottom: 20 },
  forgotText: { color: "#2E7D32", fontWeight: "500" },

  button: { borderRadius: 40, overflow: "hidden" },
  buttonGradient: { width: "100%", paddingVertical: 18, alignItems: "center", borderRadius: 40 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "bold", letterSpacing: 1 },
});
