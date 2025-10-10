// GoogleMapView.js
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import {
  StyleSheet,
  View,
  StatusBar,
  Text,
  Animated,
  Easing,
  Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";

// ✅ Directions Service
export async function getRouteCoordinates(from, to) {
  const GOOGLE_API_KEY = "AIzaSyDw9GAfx2CIMFcdKCNCztSQ2y-kKErDtAg";
  try {
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${from.latitude},${from.longitude}&destination=${to.latitude},${to.longitude}&mode=driving&key=${GOOGLE_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.routes?.length) {
      console.warn("[Directions] No route found:", data);
      return [from, to];
    }

    const points = decodePolyline(data.routes[0].overview_polyline.points);
    return points.map(([lat, lng]) => ({ latitude: lat, longitude: lng }));
  } catch (error) {
    console.error("[Directions] Error fetching directions:", error);
    return [from, to];
  }
}

function decodePolyline(encoded) {
  let points = [];
  let index = 0,
    len = encoded.length;
  let lat = 0,
    lng = 0;

  while (index < len) {
    let b,
      shift = 0,
      result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

const isValidNumber = (n) => typeof n === "number" && !Number.isNaN(n);
const isValidCoord = (c) =>
  c &&
  isValidNumber(c.latitude) &&
  isValidNumber(c.longitude) &&
  Math.abs(c.latitude) <= 90 &&
  Math.abs(c.longitude) <= 180;

/**
 * GoogleMapView — Final Merged Version
 *
 * Features:
 * ✅ Always-visible labels for each segment marker
 * ✅ Automatic map focus when navigating from toggle modal
 * ✅ Pulse animation for active segment
 * ✅ Safe fit/animate fallbacks for all platforms
 */
export default function GoogleMapView({
  segments = [],
  onMarkerPress = () => {},
  currentIndex = 0,
  focusedIndex = null,
}) {
  const mapRef = useRef(null);
  const [routes, setRoutes] = useState([]);
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const [overrideActiveIndex, setOverrideActiveIndex] = useState(null);

  const activeSegmentIndex = useMemo(() => {
    if (!segments || !segments.length) return null;
    let latestIndex = null;
    let latestTime = null;

    segments.forEach((seg, i) => {
      if (seg && seg.start_time) {
        const t = Date.parse(seg.start_time);
        if (!Number.isNaN(t) && (!latestTime || t > latestTime)) {
          latestTime = t;
          latestIndex = i;
        }
      }
    });
    return latestIndex;
  }, [segments]);

  const resolvedActiveIndex =
    overrideActiveIndex ??
    (focusedIndex ?? activeSegmentIndex ?? currentIndex ?? null);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 900,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  useEffect(() => {
    if (typeof focusedIndex === "number" && focusedIndex >= 0) {
      setOverrideActiveIndex(focusedIndex);
    }
  }, [focusedIndex]);

  useEffect(() => {
    if (!segments || !segments.length) {
      setRoutes([]);
      return;
    }

    let mounted = true;
    const fetchRoutes = async () => {
      try {
        const results = await Promise.all(
          segments.map(async (seg, idx) => {
            const from = {
              latitude: Number(seg.from_lat),
              longitude: Number(seg.from_lng),
            };
            const to = {
              latitude: Number(seg.to_lat),
              longitude: Number(seg.to_lng),
            };

            if (!isValidCoord(from) || !isValidCoord(to)) {
              console.warn(`[GoogleMapView] skipping segment ${idx} — invalid coords`, seg);
              return null;
            }

            const coords = await getRouteCoordinates(from, to);
            return { from, to, coords };
          })
        );

        if (mounted) setRoutes(results.filter(Boolean));
      } catch (err) {
        console.error("[GoogleMapView] fetchRoutes error:", err);
        if (mounted) setRoutes([]);
      }
    };

    fetchRoutes();
    return () => {
      mounted = false;
    };
  }, [segments]);

  useFocusEffect(
    useCallback(() => {
      const idxToUse = resolvedActiveIndex ?? 0;
      const active = routes[idxToUse];
      if (!mapRef.current || !active) return;

      const coordsToFit =
        active.coords && active.coords.length > 1 ? active.coords : [active.from, active.to];

      try {
        mapRef.current.fitToCoordinates(coordsToFit, {
          edgePadding: { top: 100, right: 100, bottom: 100, left: 100 },
          animated: true,
        });
      } catch (err) {
        console.warn("[GoogleMapView] fitToCoordinates failed:", err);
      }
    }, [resolvedActiveIndex, routes])
  );

  useEffect(() => {
    if (typeof focusedIndex !== "number" || !routes.length || !mapRef.current) return;
    const r = routes[focusedIndex];
    if (!r) return;

    const coordsToFit = r.coords && r.coords.length > 1 ? r.coords : [r.from, r.to];
    try {
      mapRef.current.fitToCoordinates(coordsToFit, {
        edgePadding: { top: 100, right: 100, bottom: 100, left: 100 },
        animated: true,
      });
    } catch (err) {
      try {
        const region = {
          latitude: coordsToFit[0].latitude,
          longitude: coordsToFit[0].longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        };
        if (Platform.OS === "android" && mapRef.current.animateToRegion) {
          mapRef.current.animateToRegion(region, 500);
        } else if (mapRef.current.animateCamera) {
          mapRef.current.animateCamera({ center: region, zoom: 15 }, { duration: 500 });
        }
      } catch (e) {}
      console.warn("[GoogleMapView] safeFitToRoute fallback:", err);
    }
  }, [focusedIndex, routes]);

  const safeFitToRoute = (coords) => {
    if (!mapRef.current || !Array.isArray(coords) || !coords.length) return;
    try {
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 100, right: 100, bottom: 100, left: 100 },
        animated: true,
      });
    } catch (err) {
      try {
        const region = {
          latitude: coords[0].latitude,
          longitude: coords[0].longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        };
        if (Platform.OS === "android" && mapRef.current.animateToRegion) {
          mapRef.current.animateToRegion(region, 500);
        } else if (mapRef.current.animateCamera) {
          mapRef.current.animateCamera({ center: region, zoom: 15 }, { duration: 500 });
        }
      } catch (e) {}
      console.warn("[GoogleMapView] safeFitToRoute failed:", err);
    }
  };

  const PulsingMarker = ({ coordinate, onPress }) => {
    const scale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] });
    const opacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0.12] });

    return (
      <Marker coordinate={coordinate} tracksViewChanges={false} onPress={onPress}>
        <View style={styles.markerWrapper}>
          <Animated.View
            style={[
              styles.pulseCircle,
              { transform: [{ scale }], opacity },
            ]}
          />
          <View style={styles.pulseDot} />
        </View>
      </Marker>
    );
  };

  return (
    <>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <View style={styles.container}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          showsUserLocation
          showsMyLocationButton
          initialRegion={
            routes[0]
              ? {
                  latitude: routes[0].from.latitude,
                  longitude: routes[0].from.longitude,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                }
              : { latitude: 0, longitude: 0, latitudeDelta: 180, longitudeDelta: 180 }
          }
        >
          {routes.map((r, idx) => {
            const seg = segments[idx] || {};
            if (!isValidCoord(r.from) || !isValidCoord(r.to)) return null;

            const status = (seg.status || "pending").toLowerCase();
            const isActive = idx === resolvedActiveIndex;

            let pinColor = "#007BFF";
            if (isActive) pinColor = "#f97316";
            else if (status === "completed") pinColor = "green";
            else if (status === "missed") pinColor = "red";

            return (
              <React.Fragment key={`seg-${idx}`}>
                {/* ✅ Always visible start marker label */}
                <Marker
                  coordinate={r.from}
                  onPress={() => {
                    setOverrideActiveIndex(idx);
                    onMarkerPress(seg, idx);
                    safeFitToRoute(r.coords || [r.from, r.to]);
                  }}
                >
                  <View style={styles.markerContainer}>
                    <View style={styles.labelWrapper}>
                      <Text style={styles.labelText}>{`Segment ${idx + 1} Start`}</Text>
                    </View>
                    <View style={[styles.markerDot, { backgroundColor: pinColor }]} />
                  </View>
                </Marker>

                {/* ✅ Always visible end marker label */}
                <Marker
                  coordinate={r.to}
                  onPress={() => {
                    setOverrideActiveIndex(idx);
                    onMarkerPress(seg, idx);
                    safeFitToRoute(r.coords || [r.from, r.to]);
                  }}
                >
                  <View style={styles.markerContainer}>
                    <View style={styles.labelWrapper}>
                      <Text style={styles.labelText}>{`Segment ${idx + 1} End`}</Text>
                    </View>
                    <View style={[styles.markerDot, { backgroundColor: pinColor }]} />
                  </View>
                </Marker>
              </React.Fragment>
            );
          })}
        </MapView>

        {!segments.length && (
          <View style={styles.empty}>
            <Text>No routes available</Text>
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  empty: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -80 }, { translateY: -20 }],
  },
  markerContainer: {
    alignItems: "center",
  },
  labelWrapper: {
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 4,
  },
  labelText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
  },
  markerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#fff",
  },
  markerWrapper: {
    alignItems: "center",
    justifyContent: "center",
    width: 48,
    height: 48,
  },
  pulseCircle: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 28,
    backgroundColor: "#35250aff",
  },
  pulseDot: {
    width: 12,
    height: 12,
    borderRadius: 12,
    backgroundColor: "#f97316",
    borderWidth: 2,
    borderColor: "#fff",
  },
});
