import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { useState } from "react";
import "leaflet/dist/leaflet.css";
import L, { LatLng } from "leaflet";

// Иконка маркера
const markerIcon = L.icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [32, 32],
});

type LocationMarkerProps = {
  onSelect: (coords: LatLng) => void;
};

function LocationMarker({ onSelect }: LocationMarkerProps) {
  const [position, setPosition] = useState<LatLng | null>(null);

  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      onSelect(e.latlng);
    },
  });

  return position ? <Marker position={position} icon={markerIcon} /> : null;
}

type MapPickerProps = {
  onSelect: (coords: LatLng) => void;
};

export default function MapPicker({ onSelect }: MapPickerProps) {
  return (
    <MapContainer
      center={[43.238949, 76.889709]}
      zoom={12}
      style={{ height: "400px", width: "100%" }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <LocationMarker onSelect={onSelect} />
    </MapContainer>
  );
}
