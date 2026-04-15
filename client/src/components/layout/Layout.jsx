import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSocketContext } from '../../contexts/SocketContext';
import { Activity, Map, Compass, BarChart3, Store, ShieldAlert, Menu, X, Radio } from 'lucide-react';
import './Layout.css';

const NAV_ITEMS = [
  { path: '/', label: 'Pulse', icon: Activity },
  { path: '/map', label: 'Map', icon: Map },
  { path: '/journey', label: 'Journey', icon: Compass },
  { path: '/zones', label: 'Zones', icon: BarChart3 },
  { path: '/report', label: 'Report', icon: Radio },
  { path: '/admin', label: 'Admin', icon: ShieldAlert },
];

export default function Layout({ children }) {
  const { isConnected, emergency, announcement } = useSocketContext();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="layout">
      {/* Emergency Banner */}
      {emergency && (
        <div className="emergency-banner">
          <ShieldAlert size={20} />
          <span>{emergency.message || 'Emergency evacuation in progress'}</span>
        </div>
      )}

      {/* Announcement Toast */}
      {announcement && (
        <div className={`announcement-toast announcement-${announcement.type || 'info'}`}>
          <span>{announcement.message}</span>
        </div>
      )}

      {/* Top Navbar */}
      <nav className="navbar glass-card-static">
        <Link to="/" className="nav-brand">
          <div className="brand-icon">K</div>
          <span className="brand-text">KYZEN</span>
        </Link>

        <div className={`nav-links ${mobileMenuOpen ? 'nav-links-open' : ''}`}>
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={`nav-link ${location.pathname === path ? 'nav-link-active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          ))}
        </div>

        <div className="nav-right">
          <div className={`connection-dot ${isConnected ? 'connected' : 'disconnected'}`} title={isConnected ? 'Live connected' : 'Disconnected'} />
          <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
