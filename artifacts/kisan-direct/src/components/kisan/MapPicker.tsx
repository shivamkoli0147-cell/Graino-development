import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";

interface MapPickerProps {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
  height?: number;
}

export function MapPicker({ lat, lng, onChange, height = 220 }: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Dynamic import to avoid SSR issues
    import("leaflet").then(L => {
      // Fix default icon paths
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(containerRef.current!, {
        center: [lat, lng],
        zoom: 15,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        onChange(pos.lat, pos.lng);
      });

      map.on("click", (e) => {
        marker.setLatLng(e.latlng);
        onChange(e.latlng.lat, e.latlng.lng);
      });

      mapRef.current = map;
      markerRef.current = marker;
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update marker when lat/lng changes externally
  useEffect(() => {
    if (markerRef.current && mapRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      mapRef.current.setView([lat, lng], 15, { animate: true });
    }
  }, [lat, lng]);

  return (
    <div style={{ borderRadius: 14, overflow: "hidden", border: "1.5px solid #E5DDD0" }}>
      <div ref={containerRef} style={{ height, width: "100%" }} />
      <div style={{
        background: "#F0FDF4", padding: "6px 12px", fontSize: 11,
        color: "#2D6A2D", fontWeight: 600,
      }}>
        📍 Map पर tap करो या marker को drag करो अपना सटीक location set करने के लिए
      </div>
    </div>
  );
}
