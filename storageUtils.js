// storageUtils.js
import AsyncStorage from "@react-native-async-storage/async-storage";

// --- User ---
const storeUser = async (user) => {
  try {
    await AsyncStorage.setItem("user", JSON.stringify(user));
  } catch (error) {
    console.error("Error storing user:", error);
  }
};

const getUser = async () => {
  try {
    const userData = await AsyncStorage.getItem("user");
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error("Error getting user:", error);
    return null;
  }
};

const removeUser = async () => {
  try {
    await AsyncStorage.removeItem("user");
  } catch (error) {
    console.error("Error removing user:", error);
  }
};

// --- Token ---
const storeToken = async (token) => {
  try {
    await AsyncStorage.setItem("token", token);
  } catch (error) {
    console.error("Error storing token:", error);
  }
};

const getToken = async () => {
  try {
    return await AsyncStorage.getItem("token");
  } catch (error) {
    console.error("Error getting token:", error);
    return null;
  }
};

const removeToken = async () => {
  try {
    await AsyncStorage.removeItem("token");
  } catch (error) {
    console.error("Error removing token:", error);
  }
};

// --- Offline GPS Storage ---
const storeOfflineLocation = async (coord) => {
  try {
    let pending = JSON.parse(await AsyncStorage.getItem("offlineCoords")) || [];
    pending.push(coord);
    await AsyncStorage.setItem("offlineCoords", JSON.stringify(pending));
  } catch (error) {
    console.error("Error storing offline location:", error);
  }
};

const getOfflineLocations = async () => {
  try {
    return JSON.parse(await AsyncStorage.getItem("offlineCoords")) || [];
  } catch (error) {
    console.error("Error getting offline locations:", error);
    return [];
  }
};

const clearOfflineLocations = async () => {
  try {
    await AsyncStorage.removeItem("offlineCoords");
  } catch (error) {
    console.error("Error clearing offline locations:", error);
  }
};

export {
  storeUser,
  getUser,
  removeUser,
  storeToken,
  getToken,
  removeToken,
  storeOfflineLocation,  // <-- new
  getOfflineLocations,   // <-- new
  clearOfflineLocations, // <-- new
};
