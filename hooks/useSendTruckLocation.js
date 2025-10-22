import { useEffect } from "react";
import Geolocation from "@react-native-community/geolocation";
import { ref, set } from "firebase/database";
import { db } from "../firebase"; // ✅ import initialized Firebase database

export default function useSendTruckLocation(truckId) {
  useEffect(() => {
    if (!truckId) return;

    const sendLocation = () => {
      Geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          try {
            // ✅ Save the location under `/trucks/{truckId}`
            await set(ref(db, `trucks/${truckId}`), {
              latitude,
              longitude,
              updatedAt: new Date().toISOString(),
            });

            console.log(`📍 Realtime location sent: ${latitude}, ${longitude}`);
          } catch (err) {
            console.warn("❌ Failed to send to Firebase:", err.message);
          }
        },
        (error) => console.warn("❌ Location error:", error.message),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    };

    // Send immediately + every 1 minute
    sendLocation();
    const interval = setInterval(sendLocation, 3000);

    return () => clearInterval(interval);
  }, [truckId]);
}
