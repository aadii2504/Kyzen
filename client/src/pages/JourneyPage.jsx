import { useState, useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker, Polyline, Pin, useMap } from '@vis.gl/react-google-maps';
import { fetchZones, fetchVendors, planJourney } from '../services/api';
import { getZoneIcon, getStatusColor, formatTimeShort } from '../utils/helpers';
import { Compass, Clock, MapPin, Sparkles, ArrowRight, RotateCcw, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import './JourneyPage.css';

const GOAL_OPTIONS = [
  { id: 'food', label: 'Food', emoji: '🍽️' },
  { id: 'biryani', label: 'Biryani', emoji: '🍗' },
  { id: 'drink', label: 'Drinks', emoji: '🥤' },
  { id: 'chai', label: 'Chai/Coffee', emoji: '☕' },
  { id: 'restroom', label: 'Restroom', emoji: '🚻' },
  { id: 'merch', label: 'Merchandise', emoji: '🛍️' },
  { id: 'seat', label: 'Back to Seat', emoji: '💺' },
  { id: 'medical', label: 'Medical', emoji: '🏥' },
  { id: 'pizza', label: 'Pizza', emoji: '🍕' },
  { id: 'ice cream', label: 'Ice Cream', emoji: '🍦' },
];

export default function JourneyPage() {
  const [step, setStep] = useState('wizard'); // wizard | loading | result
  const [selectedGoals, setSelectedGoals] = useState([]);
  const [deadline, setDeadline] = useState('');
  const [currentZone, setCurrentZone] = useState('');
  const [avoidCrowds, setAvoidCrowds] = useState(false);
  const [accessibility, setAccessibility] = useState(false);
  const [zones, setZones] = useState([]);
  const [journey, setJourney] = useState(null);
  const [error, setError] = useState('');

  const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const STADIUM_CENTER = { lat: 18.9388, lng: 72.8258 };

  useEffect(() => {
    fetchZones().then(setZones).catch(console.error);
  }, []);

  const toggleGoal = (id) => {
    setSelectedGoals(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  };

  const handlePlan = async () => {
    if (!selectedGoals.length) return setError('Select at least one goal');
    if (!currentZone) return setError('Select your current location');
    if (!deadline) return setError('Set a return time');

    setError('');
    setStep('loading');

    try {
      const result = await planJourney({
        goals: selectedGoals,
        currentZone,
        deadline,
        preferences: { avoidCrowds, accessibility }
      });
      setJourney(result);
      setStep('result');
    } catch (err) {
      setError(err.message || 'Failed to plan journey');
      setStep('wizard');
    }
  };

  const resetJourney = () => {
    setJourney(null);
    setSelectedGoals([]);
    setStep('wizard');
  };

  // Loading State
  if (step === 'loading') {
    return (
      <div className="journey-page">
        <div className="journey-loading animate-in">
          <div className="loading-orb">
            <Sparkles size={40} className="loading-sparkle" />
          </div>
          <h2>AI Intelligence</h2>
          <p>Calculating the most efficient route using live stadium data...</p>
          <div className="loading-dots">
            <span /><span /><span />
          </div>
        </div>
      </div>
    );
  }

  // Result State
  if (step === 'result' && journey) {
    const steps = journey.steps || [];
    const routeCoords = [];
    
    steps.forEach(step => {
      if (step.zoneId) {
        const zone = zones.find(z => z.zoneId === step.zoneId);
        if (zone && zone.coordinates) {
          routeCoords.push({ lat: zone.coordinates.lat, lng: zone.coordinates.lng });
        }
      }
    });

    const startZone = zones.find(z => z.zoneId === currentZone);
    if (startZone && startZone.coordinates && routeCoords.length > 0) {
      if (routeCoords[0].lat !== startZone.coordinates.lat || routeCoords[0].lng !== startZone.coordinates.lng) {
        routeCoords.unshift({ lat: startZone.coordinates.lat, lng: startZone.coordinates.lng });
      }
    }

    return (
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
        <div className="journey-page">
          <div className="journey-result animate-in">
            <div className="result-header">
              <div className="header-icon-round">
                <Compass size={24} />
              </div>
              <div>
                <h1>Optimized Path</h1>
                <p>{steps.length} checkpoints · {journey.totalTimeMinutes} min duration</p>
              </div>
            </div>

            <div className="journey-map-container glass-card">
              <Map
                defaultCenter={STADIUM_CENTER}
                defaultZoom={17}
                mapId="df8f48427f7178c7"
                disableDefaultUI={true}
                style={{ width: '100%', height: '320px', borderRadius: '12px' }}
              >
                {/* Route Path */}
                <Polyline 
                  path={routeCoords}
                  strokeColor="var(--accent-primary)"
                  strokeOpacity={0.8}
                  strokeWeight={6}
                />
                
                {/* Checkpoints */}
                {routeCoords.map((coord, i) => (
                  <AdvancedMarker key={i} position={coord}>
                    <div className="journey-marker" style={{ 
                      '--marker-color': i === 0 ? 'var(--accent-emerald)' : (i === routeCoords.length - 1 ? 'var(--accent-primary)' : 'var(--accent-cyan)')
                    }}>
                      <div className="marker-dot" />
                      {i === 0 && <span className="marker-label">Start</span>}
                      {i === routeCoords.length - 1 && <span className="marker-label">Goal</span>}
                    </div>
                  </AdvancedMarker>
                ))}
              </Map>
            </div>

            {journey.confidenceNote && (
              <div className="ai-notice animate-in">
                <Sparkles size={14} />
                <span>{journey.confidenceNote}</span>
              </div>
            )}

            <div className="timeline-container stagger-children">
              {steps.map((s, i) => (
                <div key={i} className="timeline-card glass-card">
                  <div className="step-badge">{i + 1}</div>
                  <div className="step-info">
                    <h3 className="step-action">{s.action}</h3>
                    <div className="step-tags">
                      {s.walkTimeMinutes && <span className="step-tag"><Clock size={12} /> {s.walkTimeMinutes}m walk</span>}
                      {s.estimatedWaitMinutes > 0 && <span className="step-tag wait"><Clock size={12} /> {s.estimatedWaitMinutes}m wait</span>}
                    </div>
                    {s.tips && <p className="step-tip">Pro Tip: {s.tips}</p>}
                  </div>
                </div>
              ))}

              <div className="timeline-final-card glass-card">
                <CheckCircle size={20} className="text-emerald" />
                <span>Journey Complete — {journey.bufferMinutes || 0} min early</span>
              </div>
            </div>

            <button className="primary-action-btn" onClick={resetJourney}>
              <RotateCcw size={18} />
              Reset Journey Plans
            </button>
          </div>
        </div>
      </APIProvider>
    );
  }

  // Wizard State
  return (
    <div className="journey-page">
      <div className="journey-wizard glass-card animate-in">
        <div className="wizard-header">
          <div className="header-icon-gradient">
            <Compass size={32} />
          </div>
          <h1>AI Journey Planner</h1>
          <p>Optimize your stadium experience based on real-time physics</p>
        </div>

        {error && <div className="error-alert"><AlertCircle size={14} /> {error}</div>}

        <div className="wizard-form">
          <div className="wizard-group">
            <label className="wizard-label">What's the mission?</label>
            <div className="goal-selection">
              {GOAL_OPTIONS.map(goal => (
                <button
                  key={goal.id}
                  className={`goal-toggle ${selectedGoals.includes(goal.id) ? 'active' : ''}`}
                  onClick={() => toggleGoal(goal.id)}
                >
                  <span className="goal-emoji">{goal.emoji}</span>
                  {goal.label}
                </button>
              ))}
            </div>
          </div>

          <div className="wizard-row">
            <div className="wizard-group">
              <label className="wizard-label">Current Location</label>
              <select value={currentZone} onChange={e => setCurrentZone(e.target.value)} className="modern-select">
                <option value="">Select your area...</option>
                {zones.map(z => (
                  <option key={z.zoneId} value={z.zoneId}>{z.name}</option>
                ))}
              </select>
            </div>
            <div className="wizard-group">
              <label className="wizard-label">Return Deadline</label>
              <input type="time" value={deadline} onChange={e => setDeadline(e.target.value)} className="modern-input" />
            </div>
          </div>

          <div className="wizard-group">
            <label className="wizard-label">Preferences</label>
            <div className="pref-grid">
              <label className="checkbox-card">
                <input type="checkbox" checked={avoidCrowds} onChange={e => setAvoidCrowds(e.target.checked)} />
                <div className="check-box" />
                <span>Avoid High Crowds</span>
              </label>
              <label className="checkbox-card">
                <input type="checkbox" checked={accessibility} onChange={e => setAccessibility(e.target.checked)} />
                <div className="check-box" />
                <span>Accessibility Only</span>
              </label>
            </div>
          </div>

          <button className="plan-submit-btn" onClick={handlePlan} disabled={!selectedGoals.length}>
            <Sparkles size={18} />
            Initialize AI Routing
          </button>
        </div>
      </div>
    </div>
  );
}

