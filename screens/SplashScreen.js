// SplashScreen.js
import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Image,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";

export default function SplashScreen({ navigation }) {
  const bounceValue = useRef(new Animated.Value(0)).current;
  const driveValue = useRef(new Animated.Value(0)).current;
  const fadeValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 🚛 Truck gentle bounce animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceValue, {
          toValue: -10,
          duration: 800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bounceValue, {
          toValue: 0,
          duration: 800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // ✨ Fade in text and logo
    Animated.timing(fadeValue, {
      toValue: 1,
      duration: 1000,
      delay: 300,
      useNativeDriver: true,
    }).start();

    // 🚚 Drive truck away after 3 seconds
    const timer = setTimeout(() => {
      Animated.timing(driveValue, {
        toValue: 400,
        duration: 1500,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        navigation.replace("Login");
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <LinearGradient
      colors={["#2E7D32", "#1B5E20"]}
      style={styles.container}
    >
      <Animated.View
        style={[styles.content, { opacity: fadeValue }]}
      >
        {/* 🌿 Logo */}
        <Image
          source={require("../assets/logo.png")}
          style={styles.logo}
        />

        {/* Title */}
        <Text style={styles.title}>MENRO</Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>Garbage Truck Monitoring System</Text>
      </Animated.View>

      {/* 🚛 Truck Animation */}
      <Animated.Image
        source={require("../assets/truck.png")}
        style={[
          styles.truck,
          {
            transform: [
              { translateY: bounceValue },
              { translateX: driveValue },
            ],
          },
        ]}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    marginBottom: 100,
  },
  logo: {
    width: 120,
    height: 120,
    resizeMode: "contain",
    marginBottom: 10,
  },
  title: {
    fontSize: 42,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 2,
    textTransform: "uppercase",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#C8E6C9",
    letterSpacing: 1,
    marginTop: 5,
  },
  truck: {
    width: 160,
    height: 110,
    resizeMode: "contain",
    position: "absolute",
    bottom: 80,
  },
});
