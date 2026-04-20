import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSocketContext } from '../contexts/SocketContext';
import { fetchZones } from '../services/api';
import { getStatusColor, getStatusLabel, getZoneIcon } from '../utils/helpers';
import { BarChart3, Filter } from 'lucide-react';
import './ZonesPage.css';

const ZONE_TYPES = ['all', 'food', 'restroom', 'seating', 'entry', 'merch', 'vip', 'medical', 'parking'];

export default function ZonesPage() {
  const { socket } = useSocketContext();
  const [zones, setZones] = useState([]);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('congestion'); // congestion | name | occupancy

  useEffect(() => {
    fetchZones().then(setZones).catch(console.error);
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handler = (data) => setZones(prev => prev.map(z => z.zoneId === data.zoneId ? { ...z, ...data } : z));
    socket.on('zone:update', handler);
    return () => socket.off('zone:update', handler);
  }, [socket]);

  let filtered = filter === 'all' ? zones : zones.filter(z => z.type === filter);
  if (sort === 'congestion') filtered = [...filtered].sort((a, b) => b.congestionLevel - a.congestionLevel);
  else if (sort === 'name') filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === 'occupancy') filtered = [...filtered].sort((a, b) => b.currentOccupancy - a.currentOccupancy);

  return (
    <div className="zones-page">
      <div className="zones-header animate-in">
        <h1 className="page-title"><BarChart3 size={28} /> All Zones</h1>
        <div className="zones-controls">
          <div className="filter-chips">
            {ZONE_TYPES.map(t => (
              <button
                key={t}
                className={`filter-chip ${filter === t ? 'filter-active' : ''}`}
                onClick={() => setFilter(t)}
              >
                {t === 'all' ? 'All' : `${getZoneIcon(t)} ${t.charAt(0).toUpperCase() + t.slice(1)}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="zones-grid stagger-children">
        {filtered.map(zone => (
          <div key={zone.zoneId} className="zone-card glass-card">
            <div className="zone-card-top">
              <span className="zone-type-emoji">{getZoneIcon(zone.type)}</span>
              <span className="zone-status-dot" style={{ background: getStatusColor(zone.congestionLevel) }} />
            </div>
            <h3 className="zone-card-name">{zone.name}</h3>
            <div className="zone-card-stats">
              <div className="zc-stat">
                <span className="zc-val" style={{ color: getStatusColor(zone.congestionLevel) }}>{zone.congestionLevel}%</span>
                <span className="zc-label">{getStatusLabel(zone.congestionLevel)}</span>
              </div>
              <div className="zc-stat">
                <span className="zc-val">{zone.currentOccupancy}</span>
                <span className="zc-label">/ {zone.capacity}</span>
              </div>
            </div>
            <div 
              className="zone-progress-bar" 
              role="progressbar" 
              aria-valuenow={zone.congestionLevel} 
              aria-valuemin="0" 
              aria-valuemax="100"
            >
              <div className="zone-progress-fill" style={{ width: `${zone.congestionLevel}%`, background: getStatusColor(zone.congestionLevel) }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

