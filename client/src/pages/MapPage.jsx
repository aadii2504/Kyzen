import { useState, useEffect, useCallback } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { useSocketContext } from '../contexts/SocketContext';
import { fetchZones, fetchHeatmapData } from '../services/api';
import { getZoneColor, getZoneBorderColor, getStatusLabel, getZoneIcon } from '../utils/helpers';
import { ThermometerSun, Map as MapIcon, Layers } from 'lucide-react';
import './MapPage.css';

// Google Maps Heatmap Layer Component
const HeatmapLayer = ({ points }) => {
  const map = useMap();
  const [heatmap, setHeatmap] = useState(null);

  useEffect(() => {
    if (!map || !points.length || !window.google) return;

    const heatmapLayer = new window.google.maps.visualization.HeatmapLayer({
      data: points.map(p => ({
        location: new window.google.maps.LatLng(p[0], p[1]),
        weight: p[2] || 1
      })),
      radius: 40,
      opacity: 0.8,
      gradient: [
        'rgba(0, 255, 255, 0)',
        'rgba(0, 255, 255, 1)',
        'rgba(0, 191, 255, 1)',
        'rgba(0, 127, 255, 1)',
        'rgba(0, 63, 255, 1)',
        'rgba(0, 0, 255, 1)',
        'rgba(0, 0, 223, 1)',
        'rgba(0, 0, 191, 1)',
        'rgba(0, 0, 159, 1)',
        'rgba(0, 0, 127, 1)',
        'rgba(63, 0, 91, 1)',
        'rgba(127, 0, 63, 1)',
        'rgba(191, 0, 31, 1)',
        'rgba(255, 0, 0, 1)'
      ]
    });

    heatmapLayer.setMap(map);
    setHeatmap(heatmapLayer);

    return () => {
      heatmapLayer.setMap(null);
    };
  }, [map, points]);

  return null;
};

export default function MapPage() {
  const { socket } = useSocketContext();
  const [zones, setZones] = useState([]);
  const [heatmapPoints, setHeatmapPoints] = useState([]);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [selectedZone, setSelectedZone] = useState(null);
  
  const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const STADIUM_CENTER = { lat: 18.9388, lng: 72.8258 }; // Wankhede Stadium

  useEffect(() => {
    const load = async () => {
      try {
        const [zData, hData] = await Promise.all([fetchZones(), fetchHeatmapData()]);
        setZones(zData);
        setHeatmapPoints(hData.points || []);
      } catch (err) { console.error('Map Load Error:', err); }
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

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['visualization']}>
      <div className="map-page">
        <div className="map-header animate-in">
          <div className="title-area">
            <MapIcon size={24} className="text-secondary" />
            <h1 className="page-title">Live Intelligence Map</h1>
          </div>
          <div className="map-controls">
            <button
              className={`toggle-btn ${showHeatmap ? 'toggle-active' : ''}`}
              onClick={() => setShowHeatmap(!showHeatmap)}
            >
              <ThermometerSun size={16} />
              AI Heatmap {showHeatmap ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        <div className="map-container glass-card-static animate-in">
          <Map
            defaultCenter={STADIUM_CENTER}
            defaultZoom={18}
            mapId="df8f48427f7178c7" // Kyzen Dark Mode ID
            disableDefaultUI={true}
            gestureHandling={'greedy'}
            style={{ width: '100%', height: '100%', borderRadius: '16px' }}
          >
            {showHeatmap && <HeatmapLayer points={heatmapPoints} />}

            {zones.map(zone => (
              <AdvancedMarker
                key={zone.zoneId}
                position={{ lat: zone.coordinates.lat, lng: zone.coordinates.lng }}
                onClick={() => setSelectedZone(zone)}
              >
                <div 
                  className="custom-marker" 
                  style={{ 
                    '--marker-color': getZoneColor(zone.congestionLevel),
                    '--marker-border': getZoneBorderColor(zone.congestionLevel)
                  }}
                >
                  <span className="marker-icon">{getZoneIcon(zone.type)}</span>
                  <div className="marker-ping" />
                </div>
              </AdvancedMarker>
            ))}

            {selectedZone && (
              <InfoWindow
                position={{ lat: selectedZone.coordinates.lat, lng: selectedZone.coordinates.lng }}
                onCloseClick={() => setSelectedZone(null)}
              >
                <div className="map-info-window">
                  <h4 className="info-title">{getZoneIcon(selectedZone.type)} {selectedZone.name}</h4>
                  <div className="info-stats">
                    <div className="info-stat">
                      <span className="stat-label">Congestion</span>
                      <span className="stat-val" style={{ color: getZoneBorderColor(selectedZone.congestionLevel) }}>
                        {selectedZone.congestionLevel}%
                      </span>
                    </div>
                    <div className="info-stat">
                      <span className="stat-label">Occupancy</span>
                      <span className="stat-val">{selectedZone.currentOccupancy}/{selectedZone.capacity}</span>
                    </div>
                  </div>
                  <div className="info-badge" style={{ background: getZoneColor(selectedZone.congestionLevel) }}>
                    {getStatusLabel(selectedZone.congestionLevel)}
                  </div>
                </div>
              </InfoWindow>
            )}
          </Map>
        </div>

        <div className="map-legend glass-card-static animate-in">
          <div className="legend-header">
            <Layers size={14} />
            <span>Density Legend</span>
          </div>
          <div className="legend-items">
            <div className="legend-item"><span className="legend-dot" style={{ background: '#10b981' }} /> Clear</div>
            <div className="legend-item"><span className="legend-dot" style={{ background: '#f59e0b' }} /> Moderate</div>
            <div className="legend-item"><span className="legend-dot" style={{ background: '#f97316' }} /> High</div>
            <div className="legend-item"><span className="legend-dot" style={{ background: '#f43f5e' }} /> Critical</div>
          </div>
        </div>
      </div>
    </APIProvider>
  );
}

