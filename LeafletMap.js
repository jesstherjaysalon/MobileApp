import React, { useEffect, useState } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import api from "./api"; // ✅ centralized axios instance

export default function LeafletMap({ segments, currentIndex = 0 }) {
  const [segmentRoutes, setSegmentRoutes] = useState([]); // ORS polyline per segment
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchORSForSegments = async () => {
      try {
        const results = [];

        for (let seg of segments) {
          const coordsPayload = [
            [seg.from_lng, seg.from_lat],
            [seg.to_lng, seg.to_lat],
          ];

          const res = await api.post("/ors/route", {
            coordinates: coordsPayload,
          });

          results.push(res.data.coordinates || []);
        }

        setSegmentRoutes(results);
      } catch (err) {
        console.error("❌ ORS fetch error:", err.response?.data || err.message);
      } finally {
        setLoading(false);
      }
    };

    if (segments.length) fetchORSForSegments();
  }, [segments]);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  // Convert coords for leaflet
  const toLeafletCoords = (coords) =>
    coords.map((c) => `[${c[1]}, ${c[0]}]`).join(",");

  // Current segment bounds
  const currentSeg = segments[currentIndex];
  const pointsForFit = currentSeg
    ? `[${currentSeg.from_lat}, ${currentSeg.from_lng}], [${currentSeg.to_lat}, ${currentSeg.to_lng}]`
    : "";

  const mapHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.3/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.3/dist/leaflet.js"></script>
        <script src="https://unpkg.com/leaflet-polylinedecorator"></script>
        <style>
          body, html, #map { height: 100%; margin: 0; padding: 0; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map').setView([0,0], 2);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
          }).addTo(map);

          // Draw each segment route
          var segmentRoutes = ${JSON.stringify(segmentRoutes.map(toLeafletCoords))};

          segmentRoutes.forEach((coords, idx) => {
            if (!coords || coords.length === 0) return;

            var color =
              idx < ${currentIndex} ? "green" :
              idx === ${currentIndex} ? "orange" :
              "gray";

            var poly = L.polyline([${segmentRoutes
              .map((coords, i) => (coords.length ? `[${coords.map((c) => `[${c[1]},${c[0]}]`).join(",")}]` : "[]"))
              .join(",")}][idx], {
              color: color,
              weight: 4
            }).addTo(map);

            // 🔹 Arrow for current segment only
            if(idx === ${currentIndex}){
              var arrowOffset = 0;
              setInterval(() => {
                arrowOffset = (arrowOffset + 5) % 100;
                if(window.segArrow){
                  map.removeLayer(window.segArrow);
                }
                window.segArrow = L.polylineDecorator(poly, {
                  patterns: [
                    {
                      offset: arrowOffset + '%',
                      repeat: 0,
                      symbol: L.Symbol.arrowHead({
                        pixelSize: 14,
                        polygon: true,
                        pathOptions: { color: 'red', fillOpacity: 1 }
                      })
                    }
                  ]
                }).addTo(map);
              }, 200);
            }
          });

          // Markers for all segments
          ${segments
            .map(
              (seg, idx) => `
            var from = [${seg.from_lat}, ${seg.from_lng}];
            var to = [${seg.to_lat}, ${seg.to_lng}];
            var markerColor = '${
              idx < currentIndex
                ? "green"
                : idx === currentIndex
                ? "yellow"
                : "gray"
            }';

            L.circleMarker(from, { radius: 6, color: markerColor, fillColor: markerColor, fillOpacity: 1 })
              .addTo(map)
              .bindPopup("Start ${idx + 1}: ${seg.from_name}");

            L.circleMarker(to, { radius: 6, color: markerColor, fillColor: markerColor, fillOpacity: 1 })
              .addTo(map)
              .bindPopup("End ${idx + 1}: ${seg.to_name}");
          `
            )
            .join("")}

          // Focus map on current segment
          ${
            pointsForFit
              ? `map.flyToBounds([${pointsForFit}], { padding: [50, 50], maxZoom: 17, duration: 1.2 });`
              : ""
          }
        </script>
      </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <WebView originWhitelist={["*"]} source={{ html: mapHtml }} style={{ flex: 1 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 450,
    borderRadius: 16,
    overflow: "hidden",
    marginVertical: 50,
    backgroundColor: "#fff",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
});
