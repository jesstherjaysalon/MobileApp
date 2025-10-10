import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';
import api from '../api';

MapLibreGL.setAccessToken(null);
const DEMO_STYLE = 'https://demotiles.maplibre.org/style.json';

function decodePolyline(encoded, precision = 5) {
  if (!encoded || typeof encoded !== 'string') return [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;
  const coordinates = [];
  const factor = Math.pow(10, precision);

  while (index < len) {
    let result = 0;
    let shift = 0;
    let byte = null;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += deltaLat;

    result = 0;
    shift = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += deltaLng;

    coordinates.push([lat / factor, lng / factor]); // [lat, lng]
  }

  return coordinates;
}

export default function Maplibre({ segments = [], currentIndex = 0, liveTruckLocation = null }) {
  const mapRef = useRef(null);
  const cameraRef = useRef(null);
  const [routeFeatures, setRouteFeatures] = useState([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      if (!segments || segments.length === 0) {
        setRouteFeatures([]);
        return;
      }

      setLoadingRoutes(true);
      const out = [];

      for (const seg of segments) {
        try {
          const coordsPayload = [
            [Number(seg.from_lng), Number(seg.from_lat)],
            [Number(seg.to_lng), Number(seg.to_lat)],
          ];
          const res = await api.post('/ors/route', { coordinates: coordsPayload });

          let coords = null;

          if (Array.isArray(res?.data?.coordinates)) {
            coords = res.data.coordinates;
          } else if (res?.data?.geometry?.coordinates) {
            coords = res.data.geometry.coordinates;
          } else if (Array.isArray(res?.data?.routes) && res.data.routes[0]) {
            const g = res.data.routes[0].geometry;
            if (typeof g === 'string') {
              const latlngs = decodePolyline(g, 6);
              coords = latlngs.map((p) => [p[1], p[0]]);
            } else if (g?.coordinates) {
              coords = g.coordinates;
            }
          }

          if (Array.isArray(coords) && coords.length) {
            out.push({
              type: 'Feature',
              properties: { segmentId: seg.id },
              geometry: { type: 'LineString', coordinates: coords },
            });
          } else {
            console.warn('No coordinates returned for segment', seg.id);
            out.push(null);
          }
        } catch (err) {
          console.error('Error fetching ORS for segment', seg.id, err.response?.data || err.message);
          out.push(null);
        }
      }

      setRouteFeatures(out);
      setLoadingRoutes(false);
    };

    fetchAll();
  }, [segments]);

  const currentBounds = useMemo(() => {
    const seg = segments[currentIndex];
    if (!seg) return null;
    const lats = [Number(seg.from_lat), Number(seg.to_lat)];
    const lngs = [Number(seg.from_lng), Number(seg.to_lng)];
    return {
      ne: [Math.max(...lngs), Math.max(...lats)],
      sw: [Math.min(...lngs), Math.min(...lats)],
    };
  }, [segments, currentIndex]);

  useEffect(() => {
    if (!cameraRef.current || !currentBounds) return;
    try {
      cameraRef.current.fitBounds(currentBounds.ne, currentBounds.sw, 50, 1000);
    } catch {
      const seg = segments[currentIndex];
      if (seg) {
        cameraRef.current.setCamera({
          centerCoordinate: [Number(seg.from_lng), Number(seg.from_lat)],
          zoom: 13,
          animated: true,
        });
      }
    }
  }, [currentBounds, currentIndex]);

  useEffect(() => {
    if (!cameraRef.current || !liveTruckLocation) return;
    if (!liveTruckLocation.latitude || !liveTruckLocation.longitude) return;
    cameraRef.current.setCamera({
      centerCoordinate: [Number(liveTruckLocation.longitude), Number(liveTruckLocation.latitude)],
      zoom: 15,
      animated: true,
    });
  }, [liveTruckLocation]);

  if (loadingRoutes) {
    return (
      <View style={styles.mapLoadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.mapContainer}>
      <MapLibreGL.MapView
        style={styles.map}
        ref={mapRef}
        styleURL={DEMO_STYLE}
        logoEnabled={false}
        compassEnabled
      >
        <MapLibreGL.Camera
          ref={cameraRef}
          zoomLevel={13}
          centerCoordinate={
            segments?.[0]
              ? [Number(segments[0].from_lng), Number(segments[0].from_lat)]
              : [0, 0]
          }
        />

        {routeFeatures.map((feat, idx) => {
          if (!feat) return null;
          const srcId = `route-src-${idx}`;
          const layerId = `route-line-${idx}`;
          const color =
            idx < currentIndex ? '#10b981' : idx === currentIndex ? '#f59e0b' : '#9ca3af';

          return (
            <MapLibreGL.ShapeSource id={srcId} key={srcId} shape={feat}>
              <MapLibreGL.LineLayer
                id={layerId}
                style={{ lineJoin: 'round', lineCap: 'round', lineWidth: 4, lineColor: color }}
              />
            </MapLibreGL.ShapeSource>
          );
        })}

        {segments.map((seg, idx) => (
          <React.Fragment key={`markers-${seg.id}`}>
            <MapLibreGL.PointAnnotation
              id={`start-${seg.id}`}
              coordinate={[Number(seg.from_lng), Number(seg.from_lat)]}
            >
              <View
                style={[
                  styles.markerCircle,
                  {
                    backgroundColor:
                      idx === currentIndex ? '#f59e0b' : idx < currentIndex ? '#10b981' : '#6b7280',
                  },
                ]}
              />
            </MapLibreGL.PointAnnotation>

            <MapLibreGL.PointAnnotation
              id={`end-${seg.id}`}
              coordinate={[Number(seg.to_lng), Number(seg.to_lat)]}
            >
              <View
                style={[
                  styles.markerCircleSmall,
                  {
                    backgroundColor:
                      idx === currentIndex ? '#ef4444' : idx < currentIndex ? '#10b981' : '#6b7280',
                  },
                ]}
              />
            </MapLibreGL.PointAnnotation>
          </React.Fragment>
        ))}

        {liveTruckLocation?.latitude && liveTruckLocation?.longitude && (
          <MapLibreGL.PointAnnotation
            id="live-truck"
            coordinate={[Number(liveTruckLocation.longitude), Number(liveTruckLocation.latitude)]}
          >
            <View style={styles.truckMarker}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>🚚</Text>
            </View>
          </MapLibreGL.PointAnnotation>
        )}
      </MapLibreGL.MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: { flex: 1, minHeight: 300 },
  map: { flex: 1 },
  mapLoadingContainer: { height: 300, justifyContent: 'center', alignItems: 'center' },
  markerCircle: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#fff' },
  markerCircleSmall: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#fff' },
  truckMarker: {
    backgroundColor: '#2563eb',
    padding: 6,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
  },
});
