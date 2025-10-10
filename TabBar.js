// TabBar.js
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import HomePage from "./screens/HomePage";
import Schedule from "./screens/Schedule";
import ReSched from "./screens/ReSched";
import DriverProfile from "./screens/DriverProfile";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

const Tab = createBottomTabNavigator();

const TabBar = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName;

          if (route.name === "Home") {
            iconName = "home";
          } else if (route.name === "Schedule") {
            iconName = "event";
          } else if (route.name === "ReSched") {
            iconName = "schedule";
          } else if (route.name === "Profile") {
            iconName = "person";
          }

          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#007AFF",
        tabBarInactiveTintColor: "gray",
      })}
    >
      <Tab.Screen name="Home" component={HomePage} />
      <Tab.Screen name="Schedule" component={Schedule} />
      <Tab.Screen name="ReSched" component={ReSched} />
      <Tab.Screen name="Profile" component={DriverProfile} />
    </Tab.Navigator>
  );
};

export default TabBar;
