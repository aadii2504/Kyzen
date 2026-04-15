import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, Popup, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import { useSocketContext } from '../contexts/SocketContext';
import { fetchZones, fetchHeatmapData } from '../services/api';
import { getZoneColor, getZoneBorderColor, getStatusLabel, getZoneIcon } from '../utils/helpers';
import { Layers, ThermometerSun } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import './MapPage.css';

// Heatmap layer using canvas
function HeatmapLayer({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length || !window.L || !window.L.heatLayer) return;
    const heat = window.L.heatLayer(points, {
      radius: 30, blur: 20, maxZoom: 19, max: 1.0,
      gradient: { 0.2: '#10b981', 0.5: '#f59e0b', 0.8: '#f97316', 1: '#f43f5e' }
    }).addTo(map);
    return () => map.removeLayer(heat);
  }, [points, map]);

  return null;
}

export default function MapPage() {
  const { socket } = useSocketContext();
  const [zones, setZones] = useState([]);
  const [heatmapPoints, setHeatmapPoints] = useState([]);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [selectedZone, setSelectedZone] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [zData, hData] = await Promise.all([fetchZones(), fetchHeatmapData()]);
        setZones(zData);
        setHeatmapPoints(hData.points || []);
      } catch (err) { console.error(err); }
    };
    load();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onZone = (data) => setZones(prev => prev.map(z => z.zoneId === data.zoneId ? { ...z, ...data } : z));
    const onHeatmap = (data) => setHeatmapPoints(data.points || []);
    socket.on('zone:update', onZone);
    socket.on('heatmap:refresh', onHeatmap);
    return () => { socket.off('zone:update', onZone); socket.off('heatmap:refresh', onHeatmap); };
  }, [socket]);

  // Load leaflet.heat dynamically
  useEffect(() => {
    if (window.L && !window.L.heatLayer) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js';
      document.head.appendChild(script);
    }
  }, []);

  const center = [18.9388, 72.8258]; // Wankhede Stadium

  return (
    <div className="map-page">
      <div className="map-header animate-in">
        <h1 className="page-title">Live Crowd Map</h1>
        <div className="map-controls">
          <button
            className={`toggle-btn ${showHeatmap ? 'toggle-active' : ''}`}
            onClick={() => setShowHeatmap(!showHeatmap)}
          >
            <ThermometerSun size={16} />
            Heatmap {showHeatmap ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      <div className="map-container glass-card-static animate-in" style={{ animationDelay: '100ms' }}>
        <MapContainer center={center} zoom={17} style={{ height: '100%', width: '100%' }} zoomControl={true}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          />

          {showHeatmap && <HeatmapLayer points={heatmapPoints} />}

          {zones.map(zone => {
            const hasPolygon = zone.bounds && zone.bounds.length >= 3;
            return (
              <CircleMarker
                key={zone.zoneId}
                center={[zone.coordinates.lat, zone.coordinates.lng]}
                radius={zone.type === 'seating' ? 18 : 12}
                pathOptions={{
                  fillColor: getZoneColor(zone.congestionLevel),
                  fillOpacity: 0.8,
                  color: getZoneBorderColor(zone.congestionLevel),
                  weight: 2
                }}
                eventHandlers={{ click: () => setSelectedZone(zone) }}
              >
                <Tooltip direction="top" offset={[0, -10]} opacity={0.95} className="zone-tooltip">
                  <div className="tooltip-content">
                    <strong>{getZoneIcon(zone.type)} {zone.name}</strong>
                    <div>{zone.congestionLevel}% — {getStatusLabel(zone.congestionLevel)}</div>
                    <div>{zone.currentOccupancy}/{zone.capacity} people</div>
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="map-legend glass-card-static animate-in" style={{ animationDelay: '200ms' }}>
        <div className="legend-item"><span className="legend-dot" style={{ background: '#10b981' }} /> Clear (&lt;30%)</div>
        <div className="legend-item"><span className="legend-dot" style={{ background: '#f59e0b' }} /> Moderate (30-60%)</div>
        <div className="legend-item"><span className="legend-dot" style={{ background: '#f97316' }} /> Busy (60-80%)</div>
        <div className="legend-item"><span className="legend-dot" style={{ background: '#f43f5e' }} /> Critical (&gt;80%)</div>
      </div>

      {/* Selected Zone Detail */}
      {selectedZone && (
        <div className="zone-detail glass-card animate-in">
          <button className="zone-detail-close" onClick={() => setSelectedZone(null)}>✕</button>
          <h3>{getZoneIcon(selectedZone.type)} {selectedZone.name}</h3>
          <div className="zone-detail-stats">
            <div className="zd-stat">
              <span className="zd-val" style={{ color: getZoneBorderColor(selectedZone.congestionLevel) }}>{selectedZone.congestionLevel}%</span>
              <span className="zd-label">Congestion</span>
            </div>
            <div className="zd-stat">
              <span className="zd-val">{selectedZone.currentOccupancy}</span>
              <span className="zd-label">People</span>
            </div>
            <div className="zd-stat">
              <span className="zd-val">{selectedZone.capacity}</span>
              <span className="zd-label">Capacity</span>
            </div>
          </div>
          <div className="zd-status-badge" style={{ background: getZoneColor(selectedZone.congestionLevel), borderColor: getZoneBorderColor(selectedZone.congestionLevel) }}>
            {getStatusLabel(selectedZone.congestionLevel)}
          </div>
        </div>
      )}
    </div>
  );
}

