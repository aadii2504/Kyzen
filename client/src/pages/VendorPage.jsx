import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchVendor, updateVendorQueue } from '../services/api';
import { Store, Minus, Plus, CheckCircle, Lock } from 'lucide-react';
import './VendorPage.css';

export default function VendorPage() {
  const [searchParams] = useSearchParams();
  const vendorId = searchParams.get('id');
  const [vendor, setVendor] = useState(null);
  const [pin, setPin] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [queue, setQueue] = useState(0);
  const [isOpen, setIsOpen] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (vendorId) {
      fetchVendor(vendorId).then(v => { setVendor(v); setQueue(v.queueLength); setIsOpen(v.isOpen); }).catch(console.error);
    }
  }, [vendorId]);

  const handleAuth = () => {
    if (pin.length !== 4) return setError('PIN must be 4 digits');
    setAuthenticated(true);
    setError('');
  };

  const handleUpdate = async () => {
    setUpdating(true);
    setError('');
    try {
      await updateVendorQueue(vendorId, { pin, queueLength: queue, isOpen });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError(err.message);
      if (err.message.includes('PIN') || err.message.includes('Invalid')) setAuthenticated(false);
    } finally { setUpdating(false); }
  };

  if (!vendorId) {
    return <div className="vendor-page"><div className="vendor-error animate-in"><h2>No vendor ID provided</h2><p>Scan a vendor QR code to access this page</p></div></div>;
  }

  if (!vendor) {
    return <div className="vendor-page"><div className="skeleton" style={{ height: 300, borderRadius: 16 }} /></div>;
  }

  if (!authenticated) {
    return (
      <div className="vendor-page">
        <div className="pin-form animate-in">
          <Lock size={40} style={{ color: 'var(--accent-primary)' }} />
          <h2>{vendor.name}</h2>
          <p>Enter your 4-digit PIN to update</p>
          {error && <div className="form-error">{error}</div>}
          <input type="password" maxLength={4} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
            placeholder="● ● ● ●" className="pin-input" autoFocus />
          <button onClick={handleAuth} className="pin-submit-btn" disabled={pin.length !== 4}>Verify PIN</button>
        </div>
      </div>
    );
  }

  return (
    <div className="vendor-page">
      <div className="vendor-panel animate-in">
        <div className="vendor-header">
          <Store size={28} style={{ color: 'var(--accent-primary)' }} />
          <div>
            <h2>{vendor.name}</h2>
            <p className="vendor-zone">{vendor.zoneId}</p>
          </div>
        </div>

        {error && <div className="form-error">{error}</div>}
        {success && <div className="update-success"><CheckCircle size={16} /> Updated!</div>}

        {/* Queue Length */}
        <div className="queue-control">
          <span className="queue-label">Queue Length</span>
          <div className="queue-buttons">
            <button className="queue-btn minus" onClick={() => setQueue(Math.max(0, queue - 1))} disabled={queue <= 0}><Minus size={28} /></button>
            <span className="queue-number">{queue}</span>
            <button className="queue-btn plus" onClick={() => setQueue(queue + 1)}><Plus size={28} /></button>
          </div>
          <span className="wait-estimate">Est. wait: ~{queue * 2} min</span>
        </div>

        {/* Open/Closed Toggle */}
        <label className="open-toggle">
          <input type="checkbox" checked={isOpen} onChange={e => setIsOpen(e.target.checked)} />
          <span className="open-slider" />
          <span>{isOpen ? '✅ Open' : '❌ Temporarily Closed'}</span>
        </label>

        <button className="update-btn" onClick={handleUpdate} disabled={updating}>
          {updating ? 'Updating...' : '✓ Update Status'}
        </button>

        <p className="last-update">Last updated: {new Date(vendor.updatedAt).toLocaleTimeString()}</p>
      </div>
    </div>
  );
}

