import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import api from '../api';
import { getUser } from '../storageUtils';
import { LineChart } from 'react-native-chart-kit';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const screenWidth = Dimensions.get("window").width;
const TITLE_COLOR = "#27AE60";
const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 20 : StatusBar.currentHeight || 24;

const DriverPerformanceScreen = () => {
  const [performance, setPerformance] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [driverId, setDriverId] = useState(null);

  useEffect(() => {
    const initialize = async () => {
      const user = await getUser();
      if (user?.id) {
        setDriverId(user.id);
        await fetchPerformance(user.id);
        await fetchLeaderboard();
      } else {
        setLoading(false);
      }
    };
    initialize();
  }, []);

  const fetchPerformance = async (id) => {
    try {
      const res = await api.get(`/driver/stats`, { params: { driver_id: id } });
      setPerformance(res.data);
    } catch (err) {
      console.log(err);
      setPerformance(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await api.get('/leaderboard');
      const sorted = (res.data?.data ?? []).sort(
        (a, b) => (b.ontime_routes ?? 0) - (a.ontime_routes ?? 0)
      );
      setLeaderboard(sorted);
    } catch (err) {
      console.log(err);
      setLeaderboard([]);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar translucent backgroundColor={TITLE_COLOR} barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={{ marginTop: 10, color: "#fff" }}>Loading performance data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!performance) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar translucent backgroundColor={TITLE_COLOR} barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <Text style={{ fontSize: 16, color: "#555", textAlign: 'center' }}>No performance data available.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const chartData = {
    labels: ["On-Time", "Delayed"],
    datasets: [{ data: [performance.ontime ?? 0, performance.delayed ?? 0] }],
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar translucent backgroundColor={TITLE_COLOR} barStyle="light-content" />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Container */}
        <View style={[styles.titleContainer, { paddingTop: STATUS_BAR_HEIGHT + 12, backgroundColor: TITLE_COLOR }]}>
          <Text style={styles.header}>Driver Performance</Text>
        </View>

        {/* Spacing below title */}
        <View style={{ height: 24 }} />

        {/* Performance Cards */}
        <View style={styles.cardsRow}>
          <View style={[styles.card, { backgroundColor: "#E0F7FA" }]}>
            <MaterialIcons name="route" size={36} color="#00796B" />
            <Text style={styles.cardLabel}>Total Routes</Text>
            <Text style={styles.cardValue}>{performance.total_routes ?? 0}</Text>
            <Text style={styles.cardDescription}>Total routes assigned for the period.</Text>
          </View>

          <View style={[styles.card, { backgroundColor: "#E8F5E9" }]}>
            <MaterialIcons name="check-circle" size={36} color="#388E3C" />
            <Text style={styles.cardLabel}>On-Time</Text>
            <Text style={styles.cardValue}>{performance.ontime ?? 0}</Text>
            <Text style={styles.cardDescription}>Routes completed on time.</Text>
          </View>

          <View style={[styles.card, { backgroundColor: "#FFEBEE" }]}>
            <MaterialIcons name="warning" size={36} color="#D32F2F" />
            <Text style={styles.cardLabel}>Delayed</Text>
            <Text style={styles.cardValue}>{performance.delayed ?? 0}</Text>
            <Text style={styles.cardDescription}>Routes completed late.</Text>
          </View>
        </View>

        {/* Analytics Chart */}
        <View style={styles.sectionContainer}>
          <Text style={styles.subHeader}>Route Analytics</Text>
          <LineChart
            data={{
              labels: chartData.labels,
              datasets: chartData.datasets,
            }}
            width={screenWidth - 32}
            height={220}
            chartConfig={{
              backgroundColor: "#fff",
              backgroundGradientFrom: "#fff",
              backgroundGradientTo: "#fff",
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(39, 174, 96, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0,0,0,${opacity})`,
              style: { borderRadius: 16 },
              propsForDots: { r: "6", strokeWidth: "2", stroke: "#27AE60" },
            }}
            style={{ marginVertical: 8, borderRadius: 16, alignSelf: "center" }}
            fromZero
          />
          <Text style={styles.sectionDescription}>
            Comparison of routes completed on-time versus delayed.
          </Text>
        </View>

        {/* Leaderboard */}
        <View style={styles.sectionContainer}>
          <Text style={styles.subHeader}>Leaderboard</Text>
          <Text style={styles.sectionDescription}>
            Top drivers based on routes completed on-time.
          </Text>
          {leaderboard.length > 0 ? (
            leaderboard.map((driver, index) => (
              <View key={driver.driver_id ?? index} style={styles.leaderItem}>
                {index === 0 && (
                  <MaterialIcons name="emoji-events" size={20} color="#FFD700" style={{ marginRight: 6 }} />
                )}
                <Text style={styles.leaderText}>
                  {driver.name ?? 'Unknown'} — {driver.ontime_routes ?? 0} On-Time
                </Text>
              </View>
            ))
          ) : (
            <Text style={{ marginTop: 10 }}>No leaderboard data available.</Text>
          )}
        </View>
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
  header: { fontSize: 22, fontWeight: "bold", color: "#fff" },

  sectionContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  sectionDescription: { fontSize: 14, color: "#555", marginTop: 6 },

  cardsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  card: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    marginHorizontal: 4,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  cardLabel: { fontSize: 16, color: "#333", marginTop: 8 },
  cardValue: { fontSize: 20, fontWeight: "700", marginTop: 4, color: "#000" },
  cardDescription: { fontSize: 12, color: "#555", marginTop: 4, textAlign: "center" },

  subHeader: { fontSize: 18, fontWeight: "600", color: "#333" },

  leaderItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    marginVertical: 6,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  leaderText: { fontSize: 16, color: "#333", fontWeight: "500" },
});

export default DriverPerformanceScreen;
