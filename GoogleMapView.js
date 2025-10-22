import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { StyleSheet, View, StatusBar, Text, Platform } from "react-native";
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
 * ✅ GoogleMapView (Final)
 * - No polyline
 * - Always visible labels
 * - Colored markers by status
 * - Focuses on selected segment from modal
 */
export default function GoogleMapView({
  segments = [],
  onMarkerPress = () => {},
  currentIndex = 0,
  focusedIndex = null,
}) {
  const mapRef = useRef(null);
  const [routes, setRoutes] = useState([]);
  const [overrideActiveIndex, setOverrideActiveIndex] = useState(null);

  // Determine latest active segment by start_time
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
    overrideActiveIndex ?? (focusedIndex ?? activeSegmentIndex ?? currentIndex ?? null);

  // Fetch routes to validate coordinates (no polyline drawing)
  useEffect(() => {
    if (!segments?.length) {
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
              console.warn(`[GoogleMapView] skipping invalid segment ${idx}`);
              return null;
            }

            return { from, to };
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

  // Focus map when segment changes or modal click triggers
  useFocusEffect(
    useCallback(() => {
      const idxToUse = resolvedActiveIndex ?? 0;
      const active = routes[idxToUse];
      if (!mapRef.current || !active) return;

      const coordsToFit = [active.from, active.to];

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
    if (typeof focusedIndex === "number" && focusedIndex >= 0) {
      setOverrideActiveIndex(focusedIndex);
    }
  }, [focusedIndex]);

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

            // ✅ Marker colors based on status
            let pinColor = "#007BFF"; // pending (blue)
            if (status === "completed") pinColor = "green";
            else if (status === "missed") pinColor = "red";
            else if (isActive) pinColor = "orange";

            return (
              <React.Fragment key={`seg-${idx}`}>
                {/* Start Marker */}
                <Marker
                  coordinate={r.from}
                  pinColor={pinColor}
                  onPress={() => {
                    setOverrideActiveIndex(idx);
                    onMarkerPress(seg, idx);
                    safeFitToRoute([r.from, r.to]);
                  }}
                >
                  <View style={styles.markerContainer}>
                    <View style={styles.labelWrapper}>
                      <Text style={styles.labelText}>{`Segment ${idx + 1} Start`}</Text>
                    </View>
                    <View style={[styles.markerDot, { backgroundColor: pinColor }]} />
                  </View>
                </Marker>

                {/* End Marker */}
                <Marker
                  coordinate={r.to}
                  pinColor={pinColor}
                  onPress={() => {
                    setOverrideActiveIndex(idx);
                    onMarkerPress(seg, idx);
                    safeFitToRoute([r.from, r.to]);
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
    backgroundColor: "rgba(255,255,255,0.9)",
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
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#fff",
  },
});
