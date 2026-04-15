import { useState, useEffect } from 'react';
import { fetchZones, submitCrowdReport } from '../services/api';
import { getZoneIcon } from '../utils/helpers';
import { Radio, Send, CheckCircle } from 'lucide-react';
import './ReportPage.css';

export default function ReportPage() {
  const [zones, setZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState('');
  const [congestion, setCongestion] = useState(50);
  const [description, setDescription] = useState('');
  const [sentiment, setSentiment] = useState('neutral');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchZones().then(setZones).catch(console.error); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedZone) return setError('Please select a zone');
    setError('');
    try {
      await submitCrowdReport({ zoneId: selectedZone, congestionLevel: congestion, description, sentiment });
      setSubmitted(true);
      setTimeout(() => { setSubmitted(false); setDescription(''); setCongestion(50); setSelectedZone(''); }, 3000);
    } catch (err) { setError(err.message); }
  };

  if (submitted) {
    return (
      <div className="report-page">
        <div className="report-success animate-in">
          <CheckCircle size={64} style={{ color: 'var(--accent-emerald)' }} />
          <h2>Report Submitted!</h2>
          <p>Thanks for helping others navigate the stadium</p>
        </div>
      </div>
    );
  }

  return (
    <div className="report-page">
      <div className="report-form animate-in">
        <div className="form-header">
          <Radio size={28} style={{ color: 'var(--accent-primary)' }} />
          <h1>Report Crowd Level</h1>
          <p>Help others by sharing what you see</p>
        </div>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Zone</label>
            <select value={selectedZone} onChange={e => setSelectedZone(e.target.value)}>
              <option value="">Select zone...</option>
              {zones.map(z => (
                <option key={z.zoneId} value={z.zoneId}>{getZoneIcon(z.type)} {z.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>How crowded is it? <span className="congestion-val">{congestion}%</span></label>
            <input type="range" min="0" max="100" value={congestion} onChange={e => setCongestion(Number(e.target.value))} className="range-slider" />
            <div className="range-labels"><span>Empty</span><span>Packed</span></div>
          </div>

          <div className="form-group">
            <label>How's the vibe?</label>
            <div className="sentiment-btns">
              {[{ val: 'positive', emoji: '😊', label: 'Good' }, { val: 'neutral', emoji: '😐', label: 'Okay' }, { val: 'negative', emoji: '😤', label: 'Bad' }].map(s => (
                <button type="button" key={s.val} className={`sentiment-btn ${sentiment === s.val ? 'sentiment-active' : ''}`} onClick={() => setSentiment(s.val)}>
                  <span className="sent-emoji">{s.emoji}</span>{s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Details (optional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g., Long queue at the biryani stall..." rows={3} />
          </div>

          <button type="submit" className="submit-btn">
            <Send size={16} /> Submit Report
          </button>
        </form>
      </div>
    </div>
  );
}

