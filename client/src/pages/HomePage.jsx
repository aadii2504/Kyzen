import { useState, useEffect } from 'react';
import { useSocketContext } from '../contexts/SocketContext';
import { fetchPulse, fetchZones, fetchCurrentEvent } from '../services/api';
import { getPulseColor, getPulseGlow, getStatusColor, getStatusLabel, getZoneIcon, formatTime } from '../utils/helpers';
import { Link } from 'react-router-dom';
import { TrendingUp, Users, Clock, ShoppingBag, Activity, MapPin, ArrowRight, AlertTriangle, Compass } from 'lucide-react';
import './HomePage.css';

export default function HomePage() {
  const { socket } = useSocketContext();
  const [pulse, setPulse] = useState(null);
  const [zones, setZones] = useState([]);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [pulseData, zonesData, eventData] = await Promise.all([
          fetchPulse(), fetchZones(), fetchCurrentEvent()
        ]);
        setPulse(pulseData);
        setZones(zonesData);
        setEvent(eventData?.name ? eventData : null);
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Listen for real-time pulse updates
  useEffect(() => {
    if (!socket) return;
    const handler = (data) => setPulse(data);
    socket.on('pulse:update', handler);
    return () => socket.off('pulse:update', handler);
  }, [socket]);

  // Listen for zone updates
  useEffect(() => {
    if (!socket) return;
    const handler = (data) => {
      setZones(prev => prev.map(z => z.zoneId === data.zoneId ? { ...z, ...data } : z));
    };
    socket.on('zone:update', handler);
    return () => socket.off('zone:update', handler);
  }, [socket]);

  const criticalZones = zones.filter(z => z.congestionLevel >= 70).sort((a, b) => b.congestionLevel - a.congestionLevel);
  const totalAttendance = zones.reduce((sum, z) => sum + z.currentOccupancy, 0);
  const totalCapacity = zones.reduce((sum, z) => sum + z.capacity, 0);

  if (loading) {
    return (
      <div className="home-page">
        <div className="pulse-section">
          <div className="skeleton" style={{ width: 200, height: 200, borderRadius: '50%', margin: '0 auto' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="home-page">
      {/* Event Header */}
      {event && (
        <div className="event-header animate-in">
          <span className="event-live-badge">● LIVE</span>
          <h2 className="event-name">{event.name}</h2>
          <p className="event-venue">{event.venue}</p>
        </div>
      )}

      {/* Pulse Score Section */}
      <div className="pulse-section animate-in" style={{ animationDelay: '100ms' }}>
        <div
          className="pulse-orb"
          style={{
            '--glow-color': pulse ? getPulseGlow(pulse.score) : 'rgba(99,102,241,0.3)',
            '--pulse-color': pulse ? getPulseColor(pulse.score) : 'var(--accent-primary)'
          }}
        >
          <div className="pulse-ring" />
          <div className="pulse-ring pulse-ring-2" />
          <div className="pulse-number">{pulse?.score ?? '--'}</div>
          <div className="pulse-label">PULSE</div>
        </div>
        <p className="pulse-status" style={{ color: pulse ? getPulseColor(pulse.score) : 'var(--text-secondary)' }}>
          Stadium is {pulse?.label || 'Loading'}
        </p>

        {/* Sparkline */}
        {pulse?.history && pulse.history.length > 1 && (
          <div className="sparkline-container">
            <svg viewBox={`0 0 ${pulse.history.length * 12} 40`} className="sparkline-svg">
              <polyline
                fill="none"
                stroke={getPulseColor(pulse.score)}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={pulse.history.map((h, i) => `${i * 12},${40 - (h.score / 100) * 36}`).join(' ')}
              />
            </svg>
          </div>
        )}
      </div>

      {/* Breakdown Cards */}
      {pulse?.breakdown && (
        <div className="breakdown-grid stagger-children" style={{ animationDelay: '200ms' }}>
          <div className="breakdown-card glass-card">
            <TrendingUp size={20} style={{ color: getStatusColor(100 - (pulse.breakdown.crowdFlow || 0)) }} />
            <div className="breakdown-value">{pulse.breakdown.crowdFlow}</div>
            <div className="breakdown-label">Crowd Flow</div>
          </div>
          <div className="breakdown-card glass-card">
            <Clock size={20} style={{ color: getStatusColor(100 - (pulse.breakdown.queueEfficiency || 0)) }} />
            <div className="breakdown-value">{pulse.breakdown.queueEfficiency}</div>
            <div className="breakdown-label">Queue Speed</div>
          </div>
          <div className="breakdown-card glass-card">
            <Activity size={20} style={{ color: getStatusColor(100 - (pulse.breakdown.mood || 0)) }} />
            <div className="breakdown-value">{pulse.breakdown.mood}</div>
            <div className="breakdown-label">Mood</div>
          </div>
          <div className="breakdown-card glass-card">
            <Users size={20} style={{ color: getStatusColor(100 - (pulse.breakdown.capacity || 0)) }} />
            <div className="breakdown-value">{pulse.breakdown.capacity}</div>
            <div className="breakdown-label">Capacity</div>
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="stats-row animate-in" style={{ animationDelay: '300ms' }}>
        <div className="stat-item glass-card-static">
          <Users size={18} className="stat-icon" />
          <div>
            <div className="stat-value">{totalAttendance.toLocaleString()}</div>
            <div className="stat-label">Attendance</div>
          </div>
        </div>
        <div className="stat-item glass-card-static">
          <MapPin size={18} className="stat-icon" />
          <div>
            <div className="stat-value">{zones.length}</div>
            <div className="stat-label">Active Zones</div>
          </div>
        </div>
        <div className="stat-item glass-card-static">
          <AlertTriangle size={18} className="stat-icon" style={{ color: criticalZones.length ? 'var(--accent-rose)' : 'var(--accent-emerald)' }} />
          <div>
            <div className="stat-value">{criticalZones.length}</div>
            <div className="stat-label">Hot Zones</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions animate-in" style={{ animationDelay: '400ms' }}>
        <Link to="/journey" className="quick-action-card glass-card">
          <Compass size={28} className="qa-icon" />
          <div className="qa-text">
            <h3>Journey Mode</h3>
            <p>Plan your stadium route with AI</p>
          </div>
          <ArrowRight size={20} className="qa-arrow" />
        </Link>
        <Link to="/map" className="quick-action-card glass-card">
          <MapPin size={28} className="qa-icon" />
          <div className="qa-text">
            <h3>Live Heatmap</h3>
            <p>See real-time crowd density</p>
          </div>
          <ArrowRight size={20} className="qa-arrow" />
        </Link>
      </div>

      {/* Critical Zones */}
      {criticalZones.length > 0 && (
        <div className="critical-section animate-in" style={{ animationDelay: '500ms' }}>
          <h3 className="section-title">
            <AlertTriangle size={18} style={{ color: 'var(--accent-rose)' }} />
            Hot Zones Right Now
          </h3>
          <div className="critical-list stagger-children">
            {criticalZones.slice(0, 5).map(zone => (
              <Link to={`/zones/${zone.zoneId}`} key={zone.zoneId} className="critical-item glass-card">
                <span className="zone-emoji">{getZoneIcon(zone.type)}</span>
                <div className="critical-info">
                  <div className="critical-name">{zone.name}</div>
                  <div className="critical-meta">{zone.currentOccupancy}/{zone.capacity} people</div>
                </div>
                <div className="congestion-bar-wrapper">
                  <div className="congestion-bar" style={{ width: `${zone.congestionLevel}%`, background: getStatusColor(zone.congestionLevel) }} />
                </div>
                <span className="congestion-pct" style={{ color: getStatusColor(zone.congestionLevel) }}>{zone.congestionLevel}%</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

