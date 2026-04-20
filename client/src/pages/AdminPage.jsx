import { useState, useEffect } from 'react';
import { adminLogin, fetchAnalytics, toggleEmergency, sendAnnouncement, stopAnnouncement, fetchVendors, fetchVendorQR } from '../services/api';
import { useSocketContext } from '../contexts/SocketContext';
import { getPulseColor, getStatusColor, getStatusLabel, getZoneIcon } from '../utils/helpers';
import { ShieldAlert, Lock, BarChart3, AlertTriangle, Megaphone, Store, Users, Activity, Zap, QrCode } from 'lucide-react';
import './AdminPage.css';

export default function AdminPage() {
  const { emergency, announcement } = useSocketContext();
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [tab, setTab] = useState('overview');
  const [announcementText, setAnnouncementText] = useState('');
  const [annType, setAnnType] = useState('info');
  const [emergencyMsg, setEmergencyMsg] = useState('Emergency evacuation in progress');
  const [qrModal, setQrModal] = useState(null);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    try {
      await adminLogin(password);
      setAuthenticated(true);
      setError('');
      loadData();
    } catch (err) { setError('Invalid password'); }
  };

  const loadData = async () => {
    try {
      const [a, v] = await Promise.all([fetchAnalytics(password), fetchVendors()]);
      setAnalytics(a);
      setVendors(v);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { if (authenticated) { const iv = setInterval(loadData, 15000); return () => clearInterval(iv); } }, [authenticated]);

  const handleEmergencyToggle = async (activate) => {
    const isConfirmed = window.confirm(
      activate 
        ? "🚨 Are you sure you want to ACTIVATE emergency mode? This will alert all users in the stadium."
        : "✅ Are you sure you want to DEACTIVATE the active emergency?"
    );
    if (!isConfirmed) return;
    
    try {
      await toggleEmergency(activate, emergencyMsg, password);
    } catch (err) { 
      setError(err.message); 
      alert("Error toggling emergency: " + err.message);
    }
  };

  const handleAnnounce = async () => {
    if (!announcementText.trim()) return;
    try {
      await sendAnnouncement(announcementText, annType, password);
      setAnnouncementText('');
    } catch (err) { 
      setError(err.message); 
      alert("Error sending announcement: " + err.message);
    }
  };

  const handleStopAnnouncement = async () => {
    const isConfirmed = window.confirm("⏹️ Are you sure you want to stop the active announcement?");
    if (!isConfirmed) return;
    try {
      await stopAnnouncement(password);
    } catch (err) { 
      setError(err.message); 
      alert("Error stopping announcement: " + err.message);
    }
  };

  const showQR = async (vendorId) => {
    try {
      const data = await fetchVendorQR(vendorId);
      setQrModal(data);
    } catch (err) { console.error(err); }
  };

  // Login Screen
  if (!authenticated) {
    return (
      <div className="admin-page">
        <div className="admin-login animate-in">
          <ShieldAlert size={48} style={{ color: 'var(--accent-primary)' }} />
          <h1>Admin Access</h1>
          <p>Enter admin password to continue</p>
          {error && <div className="form-error">{error}</div>}
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Admin password" onKeyDown={e => e.key === 'Enter' && handleLogin()} autoFocus />
          <button onClick={handleLogin} className="login-btn"><Lock size={16} /> Login</button>
        </div>
      </div>
    );
  }

  const pulse = analytics?.pulse;

  return (
    <div className="admin-page">
      {/* QR Modal */}
      {qrModal && (
        <div className="modal-overlay" onClick={() => setQrModal(null)}>
          <div className="qr-modal glass-card animate-in" onClick={e => e.stopPropagation()}>
            <h3>{qrModal.name}</h3>
            <img src={qrModal.qrCode} alt="Vendor QR" className="qr-image" />
            <p className="qr-url">{qrModal.url}</p>
            <button onClick={() => setQrModal(null)} className="close-modal-btn">Close</button>
          </div>
        </div>
      )}

      <div className="admin-header animate-in">
        <h1><ShieldAlert size={28} /> Admin Dashboard</h1>
        {error && <div className="form-error" style={{marginBottom: '1rem'}}>{error}</div>}
        <div className={`emergency-toggle ${emergency ? 'emergency-active' : ''}`}>
          {emergency ? (
            <button className="emg-btn emg-deactivate" onClick={() => handleEmergencyToggle(false)}>
              ✕ Deactivate Emergency
            </button>
          ) : (
            <button className="emg-btn emg-activate" onClick={() => handleEmergencyToggle(true)}>
              <AlertTriangle size={16} /> Activate Emergency
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        {['overview', 'vendors', 'announce'].map(t => (
          <button key={t} className={`admin-tab ${tab === t ? 'tab-active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && analytics && (
        <div className="admin-content stagger-children">
          <div className="admin-stats-grid">
            <div className="admin-stat glass-card">
              <Activity size={20} style={{ color: getPulseColor(pulse?.score || 50) }} />
              <span className="adm-stat-val" style={{ color: getPulseColor(pulse?.score || 50) }}>{pulse?.score}</span>
              <span className="adm-stat-label">Pulse Score</span>
            </div>
            <div className="admin-stat glass-card">
              <Users size={20} style={{ color: 'var(--accent-cyan)' }} />
              <span className="adm-stat-val">{analytics.pulse?.stats?.totalAttendance?.toLocaleString()}</span>
              <span className="adm-stat-label">Attendance</span>
            </div>
            <div className="admin-stat glass-card">
              <AlertTriangle size={20} style={{ color: 'var(--accent-rose)' }} />
              <span className="adm-stat-val">{analytics.zones?.critical}</span>
              <span className="adm-stat-label">Critical Zones</span>
            </div>
            <div className="admin-stat glass-card">
              <Store size={20} style={{ color: 'var(--accent-emerald)' }} />
              <span className="adm-stat-val">{analytics.vendors?.open}/{analytics.vendors?.total}</span>
              <span className="adm-stat-label">Vendors Open</span>
            </div>
          </div>

          {/* Critical Zones List */}
          {analytics.zones?.criticalList?.length > 0 && (
            <div className="admin-section">
              <h3>⚠️ Critical Zones</h3>
              <div className="critical-table">
                {analytics.zones.criticalList.map(z => (
                  <div key={z.zoneId} className="ct-row glass-card-static">
                    <span className="ct-name">{z.name}</span>
                    <span className="ct-congestion" style={{ color: getStatusColor(z.congestion) }}>{z.congestion}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Reports */}
          {analytics.reports?.recent?.length > 0 && (
            <div className="admin-section">
              <h3>📊 Recent Reports ({analytics.reports.lastHour} last hour)</h3>
              {analytics.reports.recent.slice(0, 5).map((r, i) => (
                <div key={i} className="report-row glass-card-static">
                  <span>{r.zoneId}</span>
                  <span style={{ color: getStatusColor(r.congestionLevel) }}>{r.congestionLevel}%</span>
                  <span className="report-sentiment">{r.sentiment === 'negative' ? '😤' : r.sentiment === 'positive' ? '😊' : '😐'}</span>
                  <span className="report-desc">{r.description || '—'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Vendors Tab */}
      {tab === 'vendors' && (
        <div className="admin-content stagger-children">
          <div className="vendors-list">
            {vendors.map(v => (
              <div key={v.vendorId} className="vendor-row glass-card">
                <div className="vr-info">
                  <h4>{v.name}</h4>
                  <span className="vr-zone">{v.zoneId} · {v.category}</span>
                </div>
                <div className="vr-stats">
                  <span className={`vr-status ${v.isOpen ? 'vr-open' : 'vr-closed'}`}>{v.isOpen ? 'Open' : 'Closed'}</span>
                  <span className="vr-queue">Queue: {v.queueLength}</span>
                </div>
                <button className="qr-btn" onClick={() => showQR(v.vendorId)}><QrCode size={18} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Announce Tab */}
      {tab === 'announce' && (
        <div className="admin-content animate-in">
          {announcement && (
            <div className={`active-announcement aa-type-${announcement.type || 'info'} glass-card-static`}>
              <div className="aa-header">
                <h3>
                  <span className="aa-icon">📢</span> 
                  Active Broadcast
                  <span className="aa-badge">{announcement.type}</span>
                </h3>
                <button className="aa-stop-btn" onClick={handleStopAnnouncement}>
                  <span>✕</span> Stop Announcement
                </button>
              </div>
              <div className="aa-body">
                <p>{announcement.message}</p>
              </div>
            </div>
          )}
          <div className="announce-form glass-card-static">
            <h3><Megaphone size={20} /> Broadcast Announcement</h3>
            <textarea value={announcementText} onChange={e => setAnnouncementText(e.target.value)} placeholder="Type your announcement..." rows={3} />
            <div className="ann-controls">
              <select value={annType} onChange={e => setAnnType(e.target.value)}>
                <option value="info">ℹ️ Info</option>
                <option value="warning">⚠️ Warning</option>
                <option value="critical">🚨 Critical</option>
              </select>
              <button onClick={handleAnnounce} className="announce-btn"><Megaphone size={16} /> Send</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

