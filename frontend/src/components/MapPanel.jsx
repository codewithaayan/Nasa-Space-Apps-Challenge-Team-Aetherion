import { CircleMarker, MapContainer, TileLayer, Tooltip } from "react-leaflet";
import { Crosshair, Layers3, MapPin } from "lucide-react";
import { useRef } from "react";
import { useMap } from "react-leaflet";
import { locations } from "../data";

function MapController({ mapRef }) {
  const map = useMap();
  mapRef.current = map;
  return null;
}

export function MapPanel({ activeLocation = "karachi", height = "100%", compact = false }) {
  const selected = locations.find((location) => location.id === activeLocation) || locations[0];
  const mapRef = useRef(null);
  return (
    <div className={`map-frame ${compact ? "map-compact" : ""}`} style={{ height }}>
      <MapContainer center={[selected.lat, selected.lng]} zoom={compact ? 8 : 7} scrollWheelZoom={false} key={selected.id}>
        <MapController mapRef={mapRef} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {locations.map((location) => (
          <CircleMarker key={location.id} center={[location.lat, location.lng]} radius={location.id === selected.id ? 8 : 6}
            pathOptions={{ color: location.id === selected.id ? "#D9C7A7" : "#6A9A6B", fillColor: location.id === selected.id ? "#D9C7A7" : "#6A9A6B", fillOpacity: 0.95 }}>
            <Tooltip>{location.name} · {location.province}, Pakistan</Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
      <div className="map-overlay map-top"><span><Layers3 size={14} /> LOCATION REFERENCE</span><button aria-label="Center selected location" onClick={() => mapRef.current?.setView([selected.lat, selected.lng], compact ? 8 : 7)}><Crosshair size={15} /></button></div>
      <div className="map-overlay map-location"><MapPin size={14} /> {selected.name.toUpperCase()} AREA</div>
      <div className="map-caption">Reference map only. No scientific trend layer is loaded.</div>
    </div>
  );
}
