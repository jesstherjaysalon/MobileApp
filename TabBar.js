// TabBar.js
import React, { useEffect, useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useIsFocused } from "@react-navigation/native";
import HomePage from "./screens/HomePage";
import Schedule from "./screens/Schedule";
import ReSched from "./screens/ReSched";
import DriverProfile from "./screens/DriverProfile";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import api from "./api";

const Tab = createBottomTabNavigator();

const TabBar = () => {
  const [pendingScheduleCount, setPendingScheduleCount] = useState(0);
  const [pendingReschedCount, setPendingReschedCount] = useState(0);
  const isFocused = useIsFocused();

  const fetchPendingCounts = async () => {
    try {
      // Fetch pending schedules
      const scheduleRes = await api.get("/route-plans");
      if (scheduleRes.data.pendingCount !== undefined) {
        setPendingScheduleCount(scheduleRes.data.pendingCount);
      }

      // Fetch pending reschedules
      const reschedRes = await api.get("/reschedules");
      if (reschedRes.data.pendingCount !== undefined) {
        setPendingReschedCount(reschedRes.data.pendingCount);
      }
    } catch (error) {
      console.log("Error fetching pending counts:", error);
    }
  };

  useEffect(() => {
    fetchPendingCounts();

    const interval = setInterval(fetchPendingCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isFocused) {
      fetchPendingCounts();
    }
  }, [isFocused]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === "Home") iconName = "home";
          else if (route.name === "Schedule") iconName = "event";
          else if (route.name === "ReSched") iconName = "schedule";
          else if (route.name === "Profile") iconName = "person";

          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#007AFF",
        tabBarInactiveTintColor: "gray",
      })}
    >
      <Tab.Screen name="Home" component={HomePage} />

      {/* Schedule Tab with badge */}
      <Tab.Screen
        name="Schedule"
        component={Schedule}
        options={{
          tabBarBadge: pendingScheduleCount > 0 ? pendingScheduleCount : null,
        }}
      />

      {/* ReSched Tab with badge */}
      <Tab.Screen
        name="ReSched"
        component={ReSched}
        options={{
          tabBarBadge: pendingReschedCount > 0 ? pendingReschedCount : null,
        }}
      />

      <Tab.Screen name="Profile" component={DriverProfile} />
    </Tab.Navigator>
  );
};

export default TabBar;
