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
      {/* Announcement Toast */}
      {announcement && (
        <div className={`announcement-toast announcement-${announcement.type || 'info'}`}>
          <span>{announcement.message}</span>
        </div>
      )}

      {/* Accessibility: Skip to main content */}
      <a href="#main-content" className="sr-only focus-visible-skip">
        Skip to main content
      </a>

      {/* Sticky Header Group */}
      <header className="sticky-header">
        {/* Emergency Banner */}
        {emergency && (
          <div className="emergency-banner">
            <ShieldAlert size={20} />
            <span>{emergency.message || 'Emergency evacuation in progress'}</span>
          </div>
        )}

        {/* Top Navbar */}
        <nav className="navbar glass-card-static" aria-label="Main Navigation">
          <Link to="/" className="nav-brand" aria-label="Kyzen Home">
            <div className="brand-icon" aria-hidden="true">K</div>
            <span className="brand-text">KYZEN</span>
          </Link>

          <div 
            className={`nav-links ${mobileMenuOpen ? 'nav-links-open' : ''}`}
            role="menu"
          >
            {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`nav-link ${location.pathname === path ? 'nav-link-active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
                role="menuitem"
                aria-current={location.pathname === path ? 'page' : undefined}
              >
                <Icon size={18} />
                <span>{label}</span>
              </Link>
            ))}
          </div>

          <div className="nav-right">
            <div 
              className={`connection-dot ${isConnected ? 'connected' : 'disconnected'}`} 
              title={isConnected ? 'Live connected' : 'Disconnected'} 
              aria-label={isConnected ? 'System online' : 'System offline'}
              role="status"
            />
            <button 
              className="mobile-menu-btn" 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
            </button>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main id="main-content" className="main-content" tabIndex="-1">
        {children}
      </main>
    </div>
  );
}
