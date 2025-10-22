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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secureText, setSecureText] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const logoScale = useRef(new Animated.Value(0.4)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  // 🌟 Animated logo entrance
  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, friction: 5, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 1000, useNativeDriver: true }),
    ]).start();
  }, []);

  // 🔐 Auto login check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getUser();
        if (user?.role === "driver") navigation.replace("Home");
        else if (user?.role === "zonal_leader") navigation.replace("Zone");
      } catch (e) {
        console.error("Auth check error:", e);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [navigation]);

  // 🧠 Validation
  useEffect(() => {
    if (email && !email.includes("@gmail.com")) setEmailError("Email must contain @gmail.com");
    else setEmailError("");
  }, [email]);

  useEffect(() => {
    if (password && password.length < 6) setPasswordError("Minimum 6 characters");
    else setPasswordError("");
  }, [password]);

  // 🚪 Login
  const handleLogin = async () => {
    if (!email || !password) return Alert.alert("Validation", "Please enter both email and password.");
    if (emailError || passwordError) return Alert.alert("Validation", "Please fix the errors first.");

    setSubmitting(true);
    Animated.spring(buttonScale, { toValue: 0.97, friction: 5, useNativeDriver: true }).start();

    try {
      const response = await api.post("/login", { email, password });
      const { token, user } = response.data;
      if (!user || !user.role) return Alert.alert("Error", "Invalid user data received.");

      await storeToken(token);
      await storeUser(user);

      if (user.role === "driver") navigation.replace("Home");
      else if (user.role === "zonal_leader") navigation.replace("Zone");
      else Alert.alert("Access Denied", "Your role is not allowed to log in.");
    } catch (error) {
      console.error(error);
      if (error.response)
        Alert.alert("Login Failed", error.response.data.message || "Invalid credentials");
      else Alert.alert("Error", "Unable to connect to server");
    } finally {
      setSubmitting(false);
      Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true }).start();
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <LinearGradient colors={["#E8F5E9", "#D0F0C0", "#A5D6A7"]} style={styles.container}>
          {/* 🌿 Animated Logo */}
          <Animated.View
            style={[
              styles.logoContainer,
              { opacity: logoOpacity, transform: [{ scale: logoScale }] },
            ]}
          >
            <Image source={require("../assets/logo.png")} style={styles.logo} />
          </Animated.View>

          {/* Login Card */}
          <View style={styles.card}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue your journey</Text>

            {/* Email */}
            <View style={styles.inputWrapper}>
              <MaterialIcons name="email" size={22} color="#388E3C" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

            {/* Password */}
            <View style={styles.inputWrapper}>
              <MaterialIcons name="lock" size={22} color="#388E3C" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#999"
                secureTextEntry={secureText}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setSecureText(!secureText)}>
                <MaterialIcons
                  name={secureText ? "visibility-off" : "visibility"}
                  size={22}
                  color="#757575"
                />
              </TouchableOpacity>
            </View>
            {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

            {/* Forgot Password */}
            <TouchableOpacity
              style={styles.forgotWrapper}
              onPress={() => navigation.navigate("ForgotPassword")}
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Sign In Button */}
            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <TouchableOpacity
                style={[styles.button, (emailError || passwordError || submitting) && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={submitting || !!emailError || !!passwordError}
              >
                <LinearGradient
                  colors={["#43A047", "#2E7D32"]}
                  style={styles.buttonGradient}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>SIGN IN</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </LinearGradient>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },

  logoContainer: { alignItems: "center", marginTop: 70, marginBottom: 10 },
  logo: { width: 130, height: 130, resizeMode: "contain" },

  card: {
    marginHorizontal: 25,
    borderRadius: 28,
    padding: 28,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } },
      android: { elevation: 10 },
    }),
  },

  title: { fontSize: 30, fontWeight: "800", color: "#2E7D32", textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 15, color: "#666", textAlign: "center", marginBottom: 28 },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    backgroundColor: "#FDFDFD",
    height: 54,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },

  icon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: "#000", paddingVertical: 8 },

  errorText: { color: "#E53935", fontSize: 13, marginLeft: 8, marginBottom: 8 },
  forgotWrapper: { alignSelf: "flex-end", marginBottom: 25 },
  forgotText: { color: "#388E3C", fontWeight: "600", fontSize: 14 },

  button: { borderRadius: 16, overflow: "hidden" },
  buttonGradient: {
    width: "100%",
    paddingVertical: 15,
    alignItems: "center",
    borderRadius: 16,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "#fff", fontSize: 17, fontWeight: "700", letterSpacing: 0.5 },
});
