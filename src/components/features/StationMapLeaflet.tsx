'use client'

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect } from 'react'

// Fix for default marker icon in Leaflet with Next.js/React
const iconUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png';
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: iconUrl,
    iconRetinaUrl: iconRetinaUrl,
    shadowUrl: shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom Purple Circle Marker for "2", "3", "5" counts seen in screenshot
const createClusterIcon = (count: number, color: string) => {
    return L.divIcon({
        html: `<div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold bg-${color}-600 border-2 border-white shadow-lg">${count}</div>`,
        className: '',
        iconSize: [40, 40],
        iconAnchor: [20, 20]
    })
}

export default function StationMapLeaflet() {
    return (
        <MapContainer center={[7.3775, 3.9470]} zoom={13} scrollWheelZoom={true} className="w-full h-full">
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Mock Markers based on screenshot */}
            <Marker position={[7.3775, 3.9470]} icon={createClusterIcon(5, 'purple')}>
                <Popup>
                    5 Stations in this area
                </Popup>
            </Marker>
            <Marker position={[7.385, 3.95]} icon={createClusterIcon(3, 'purple')}>
                <Popup>
                    3 Stations in this area
                </Popup>
            </Marker>
            <Marker position={[7.37, 3.93]} icon={createClusterIcon(2, 'purple')}>
                <Popup>
                    2 Stations in this area
                </Popup>
            </Marker>

            <Marker position={[7.39, 3.96]} icon={createClusterIcon(4, 'purple')}>
                <Popup>
                    4 Stations in this area
                </Popup>
            </Marker>
        </MapContainer>
    )
}
