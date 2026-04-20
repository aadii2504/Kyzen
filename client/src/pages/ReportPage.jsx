import { useState, useEffect } from 'react';
import { fetchZones, submitCrowdReport } from '../services/api';
import { getZoneIcon } from '../utils/helpers';
import { Radio, Send, CheckCircle, Info, Users } from 'lucide-react';
import './ReportPage.css';

// Dynamic Visual for Crowd Density
const CrowdDensityPreview = ({ level }) => {
  // Create a 8x6 grid of dots
  const dots = Array.from({ length: 48 }, (_, i) => i);
  
  return (
    <div className="density-preview-container">
      <div className="density-grid">
        {dots.map(i => {
          const isActive = (i / 48) * 100 <= level;
          return (
            <div 
              key={i} 
              className={`density-dot ${isActive ? 'active' : ''}`}
              style={{ 
                '--delay': `${i * 10}ms`,
                background: isActive 
                  ? (level > 75 ? 'var(--accent-rose)' : level > 40 ? 'var(--accent-amber)' : 'var(--accent-emerald)')
                  : 'var(--bg-tertiary)'
              }}
            />
          );
        })}
      </div>
      <div className="density-stats">
        <Users size={14} />
        <span>{level}% Density</span>
      </div>
    </div>
  );
};

export default function ReportPage() {
  const [zones, setZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState('');
  const [congestion, setCongestion] = useState(50);
  const [description, setDescription] = useState('');
  const [sentiment, setSentiment] = useState('neutral');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { 
    fetchZones().then(setZones).catch(console.error); 
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedZone) return setError('Please select a zone to report');
    
    setError('');
    setLoading(true);
    
    try {
      await submitCrowdReport({ 
        zoneId: selectedZone, 
        congestionLevel: congestion, 
        description, 
        sentiment 
      });
      setSubmitted(true);
      setTimeout(() => { 
        setSubmitted(false); 
        setDescription(''); 
        setCongestion(50); 
        setSelectedZone(''); 
      }, 4000);
    } catch (err) { 
      setError(err.message || 'Failed to submit report. Please try again.'); 
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="report-page-container">
        <div className="report-success-card glass-card animate-in">
          <div className="success-icon-wrapper">
            <CheckCircle size={64} className="success-icon" />
            <div className="success-pulse" />
          </div>
          <h2>Report Submitted!</h2>
          <p>Your contribution helps 10,000+ fans navigate the stadium safely. Thanks for being eyes on the ground!</p>
          <button className="done-btn outline" onClick={() => setSubmitted(false)}>Submit Another</button>
        </div>
      </div>
    );
  }

  return (
    <div className="report-page-container">
      <div className="report-card glass-card animate-in">
        <div className="report-header">
          <div className="header-icon">
            <Radio size={24} />
          </div>
          <div className="header-text">
            <h1>Crowd Intelligence</h1>
            <p>Report live conditions to help other fans</p>
          </div>
        </div>

        {error && (
          <div className="form-error-banner animate-in">
            <Info size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="report-form-layout">
          <div className="form-section">
            <label className="input-label">Select Your Location</label>
            <div className="custom-select-wrapper">
              <select 
                value={selectedZone} 
                onChange={e => setSelectedZone(e.target.value)}
                className="modern-select"
              >
                <option value="">Where are you right now?</option>
                {zones.map(z => (
                  <option key={z.zoneId} value={z.zoneId}>
                    {z.name} ({z.type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-section">
            <label className="input-label">
              Density Level 
              <span className="label-badge" style={{ 
                background: congestion > 75 ? 'var(--accent-rose-glow)' : 'var(--bg-tertiary)',
                color: congestion > 75 ? 'var(--accent-rose)' : 'var(--text-secondary)'
              }}>
                {congestion}%
              </span>
            </label>
            
            <CrowdDensityPreview level={congestion} aria-hidden="true" />
            
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={congestion} 
              onChange={e => setCongestion(Number(e.target.value))} 
              className="premium-range" 
              aria-label="Crowd density level percentage"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow={congestion}
            />
            <div className="range-hints">
              <span>Ghost Town</span>
              <span>Packed</span>
            </div>
          </div>

          <div className="form-section">
            <label className="input-label">Atmosphere Vibe</label>
            <div className="sentiment-grid">
              {[
                { val: 'positive', emoji: '😊', label: 'Energetic' }, 
                { val: 'neutral', emoji: '😐', label: 'Calm' }, 
                { val: 'negative', emoji: '😤', label: 'Frustrated' }
              ].map(s => (
                <button 
                  type="button" 
                  key={s.val} 
                  className={`sentiment-card ${sentiment === s.val ? 'active' : ''}`} 
                  onClick={() => setSentiment(s.val)}
                  aria-label={`Select ${s.label} atmosphere`}
                  aria-pressed={sentiment === s.val}
                >
                  <span className="card-emoji">{s.emoji}</span>
                  <span className="card-label">{s.label}</span>
                  {sentiment === s.val && <div className="active-dot" />}
                </button>
              ))}
            </div>
          </div>

          <div className="form-section">
            <label className="input-label">Additional Context (Optional)</label>
            <textarea 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              placeholder="e.g., Security gate 4 is moving slow..." 
              rows={3}
              className="modern-textarea"
            />
          </div>

          <button type="submit" className="premium-submit-btn" disabled={loading}>
            {loading ? (
              <span className="loading-spinner" />
            ) : (
              <>
                <Send size={18} />
                <span>Transmit Report</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

