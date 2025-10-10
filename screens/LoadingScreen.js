import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import LinearGradient from "react-native-linear-gradient";

export default function LoadingScreen() {
  return (
    <LinearGradient
      colors={["#ffffff", "#f5f5f5"]}
      style={styles.container}
    >
      <ActivityIndicator size="large" color="#009688" />
      <Text style={styles.text}>Loading, please wait...</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    marginTop: 20,
    fontSize: 16,
    color: "#555",
    fontWeight: "500",
  },
});
