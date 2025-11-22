// resources/js/modals/DashboardModal.js
import React from "react";
import { View, StyleSheet, TouchableOpacity, Text, Animated } from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { useNavigation } from "@react-navigation/native";
import { removeUser, removeToken, getUser } from "../storageUtils";

export const DashboardModalContent = ({ onClose }) => {
  const navigation = useNavigation();

  const cards = [
    { key: "achievement", icon: "emoji-events", label: "Achievement", isLink: true, navigateTo: "DriverPerformanceScreen" },
    { key: "collection", icon: "collections", label: "Collection", isLink: true, navigateTo: "CollectionScreen" },
    { key: "history", icon: "history", label: "History", isLink: true, navigateTo: "HistoryScreen" },
  ];

  const handlePress = async (card) => {
    if (card.isLink) {
      if (card.key === "history") {
        // fetch driverId from storage
        const user = await getUser();
        if (!user?.id) return;
        navigation.navigate(card.navigateTo, { driverId: user.id }); // pass driverId as param
      } else {
        navigation.navigate(card.navigateTo);
      }
      onClose && onClose();
    }
  };

  const handleLogout = async () => {
    try {
      await removeUser();
      await removeToken();
      onClose && onClose();
      navigation.replace("Login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <View style={styles.modalContainer}>
      <Text style={styles.modalTitle}>Dashboard</Text>
      <Text style={styles.modalDescription}>
        Access your key features quickly from the dashboard.
      </Text>

      <View style={styles.separator} />

      <View style={styles.cardsWrapper}>
        {cards.map((card) => {
          const scale = new Animated.Value(1);
          const onPressIn = () => Animated.spring(scale, { toValue: 0.9, useNativeDriver: true }).start();
          const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

          return (
            <Animated.View
              key={card.key}
              style={{ transform: [{ scale }], marginHorizontal: 20, alignItems: "center" }}
            >
              <TouchableOpacity
                onPress={() => handlePress(card)}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                activeOpacity={0.7}
              >
                <MaterialIcons name={card.icon} size={36} color="#333" />
              </TouchableOpacity>
              <Text style={styles.cardLabel}>{card.label}</Text>
            </Animated.View>
          );
        })}
      </View>

      <View style={styles.separator} />

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <MaterialIcons name="logout" size={20} color="#fff" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    width: "90%",
    maxHeight: "80%",
    backgroundColor: "#ffffff",
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#333", marginBottom: 6 },
  modalDescription: { fontSize: 14, color: "#666", textAlign: "center", marginBottom: 20, lineHeight: 20 },
  separator: { width: "100%", height: 1, backgroundColor: "#ddd", marginVertical: 12 },
  cardsWrapper: { flexDirection: "row", justifyContent: "center", width: "100%", marginBottom: 20 },
  cardLabel: { fontSize: 13, fontWeight: "600", color: "#333", textAlign: "center", marginTop: 4 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f44336",
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 12,
    marginTop: 10,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  logoutText: { color: "#fff", fontWeight: "600", fontSize: 14, marginLeft: 6 },
});
