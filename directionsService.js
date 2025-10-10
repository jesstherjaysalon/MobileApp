import Polyline from "@mapbox/polyline";

const GOOGLE_MAPS_API_KEY = "AIzaSyDw9GAfx2CIMFcdKCNCztSQ2y-kKErDtAg"; // use the same one in AndroidManifest

export async function getRouteCoordinates(from, to) {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?origin=${from.latitude},${from.longitude}&destination=${to.latitude},${to.longitude}&key=${GOOGLE_MAPS_API_KEY}`
    );

    const data = await response.json();

    if (data.routes.length) {
      // Decode overview_polyline into coordinates
      const points = Polyline.decode(data.routes[0].overview_polyline.points);
      const coords = points.map(([lat, lng]) => ({
        latitude: lat,
        longitude: lng,
      }));
      return coords;
    } else {
      return [];
    }
  } catch (error) {
    console.error("❌ Error fetching directions:", error);
    return [];
  }
}
