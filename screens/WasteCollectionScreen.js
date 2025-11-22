// WasteCollectionScreen.js
import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Platform,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import api from "../api";
import { getUser } from "../storageUtils";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { BarChart } from "react-native-chart-kit";

const screenWidth = Dimensions.get("window").width;
const TITLE_COLOR = "#27AE60";
const STATUS_BAR_HEIGHT = Platform.OS === "ios" ? 20 : StatusBar.currentHeight || 24;

// Helper to dynamically adjust font size based on number length
const getResponsiveFontSize = (num) => {
  if (!num) return 22;
  const len = num.toString().length;
  if (len <= 4) return 22;
  if (len === 5) return 20;
  if (len === 6) return 18;
  return 16;
};

const WasteCollectionScreen = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [driverId, setDriverId] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        const user = await getUser();
        if (!user?.id) {
          setLoading(false);
          return;
        }
        setDriverId(user.id);
        await fetchWasteCollections(user.id);
      } catch (e) {
        console.log("Error initializing WasteCollectionScreen:", e);
        setLoading(false);
      }
    };
    init();
  }, []);

  const fetchWasteCollections = async (id) => {
    setLoading(true);
    try {
      const response = await api.get("/driver/waste-collections", { params: { driver_id: id } });
      if (response.data?.success) {
        setData(response.data);
      } else {
        setData(null);
      }
    } catch (err) {
      console.log("Error fetching waste data:", err);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar translucent backgroundColor={TITLE_COLOR} barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={{ marginTop: 10, color: "#fff" }}>Loading Waste Collections...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar translucent backgroundColor={TITLE_COLOR} barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <Text style={{ fontSize: 16, color: "#555", textAlign: "center" }}>No collection data available.</Text>
          {driverId && (
            <TouchableOpacity onPress={() => fetchWasteCollections(driverId)} style={styles.refreshBtn}>
              <Text style={styles.refreshText}>↻ Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Bar Chart data
  const chartData = {
    labels: ["Bio", "Non-Bio", "Recy"],
    datasets: [
      {
        data: [
          data.biodegradable ?? 0,
          data.non_biodegradable ?? 0,
          data.recyclable ?? 0,
        ],
        colors: [
          () => "#4CAF50",
          () => "#FF9800",
          () => "#9C27B0",
        ],
      },
    ],
  };

  const chartConfig = {
    backgroundGradientFrom: "#FAFAFA",
    backgroundGradientTo: "#FAFAFA",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: { borderRadius: 16 },
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar translucent backgroundColor={TITLE_COLOR} barStyle="light-content" />
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}>
        {/* Title */}
        <View style={[styles.titleContainer, { paddingTop: STATUS_BAR_HEIGHT + 12, backgroundColor: TITLE_COLOR }]}>
          <Text style={styles.header}>Driver Waste Collection</Text>
        </View>

        <View style={{ height: 24 }} />

        {/* Waste Collection Cards */}
        <View style={styles.cardsRow}>
          <View style={[styles.card, { backgroundColor: "#E8F5E9" }]}>
            <MaterialIcons name="eco" size={36} color="#388E3C" />
            <Text style={styles.cardLabel}>Biodegradable</Text>
            <Text style={[styles.cardValue, { fontSize: getResponsiveFontSize(data.biodegradable) }]}>
              {data.biodegradable ?? 0}
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: "#FFF3E0" }]}>
            <MaterialIcons name="delete" size={36} color="#F57C00" />
            <Text style={styles.cardLabel}>Non-Biodegradable</Text>
            <Text style={[styles.cardValue, { fontSize: getResponsiveFontSize(data.non_biodegradable) }]}>
              {data.non_biodegradable ?? 0}
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: "#EDE7F6" }]}>
            <MaterialIcons name="recycling" size={36} color="#5E35B1" />
            <Text style={styles.cardLabel}>Recyclable</Text>
            <Text style={[styles.cardValue, { fontSize: getResponsiveFontSize(data.recyclable) }]}>
              {data.recyclable ?? 0}
            </Text>
          </View>
        </View>

        {/* Bar Chart */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Waste Collection Overview</Text>
          <BarChart
            data={chartData}
            width={screenWidth - 32}
            height={250}
            chartConfig={chartConfig}
            style={{ borderRadius: 16 }}
            fromZero
            showValuesOnTopOfBars
            verticalLabelRotation={20}
          />
          <Text style={styles.chartDescription}>
            The bar chart displays the quantity of biodegradable, non-biodegradable, and recyclable sacks collected by the driver.
          </Text>
        </View>

        {/* Total Collections */}
        <View style={styles.sectionContainer}>
          <Text style={styles.totalLabel}>Total Collections</Text>
          <Text style={[styles.totalValue, { fontSize: getResponsiveFontSize(data.total_collections) }]}>
            {data.total_collections ?? 0}
          </Text>
        </View>

        {/* Refresh Button */}
        <TouchableOpacity onPress={() => fetchWasteCollections(driverId)} style={styles.refreshBtn}>
          <Text style={styles.refreshText}>↻ Refresh</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FAFAFA" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },

  titleContainer: {
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingHorizontal: 16,
    paddingBottom: 12,
    alignItems: "center",
  },
  header: { fontSize: 24, fontWeight: "bold", color: "#fff" },

  cardsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  card: {
    width: "32%",
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
    marginBottom: 12,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  cardLabel: { fontSize: 16, color: "#333", marginTop: 8, textAlign: "center" },
  cardValue: { fontWeight: "700", marginTop: 4, color: "#000" },

  chartContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 24,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    alignItems: "center",
  },
  chartTitle: { fontSize: 18, fontWeight: "700", color: "#333", marginBottom: 12 },
  chartDescription: { fontSize: 14, color: "#555", textAlign: "center", marginTop: 8 },

sectionContainer: {
  backgroundColor: "rgba(255,165,0,0.2)", // semi-transparent orange
  borderRadius: 20,
  padding: 20,
  marginHorizontal: 16,
  marginBottom: 24,
  alignItems: "center",
},

  totalLabel: { fontSize: 18, fontWeight: "700", color: "#1b5e20" },
  totalValue: { fontWeight: "800", color: "#43a047", marginTop: 5 },

  refreshBtn: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: "#2e7d32",
    paddingVertical: 14,
    borderRadius: 12,
    elevation: 3,
  },
  refreshText: { color: "#fff", fontWeight: "600", textAlign: "center", fontSize: 16 },
});

export default WasteCollectionScreen;
