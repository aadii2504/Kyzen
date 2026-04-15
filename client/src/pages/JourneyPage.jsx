import { useState, useEffect } from 'react';
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
          <h2>Planning your journey...</h2>
          <p>AI is finding the best route based on live crowd data</p>
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
    return (
      <div className="journey-page">
        <div className="journey-result animate-in">
          <div className="result-header">
            <Compass size={28} className="text-gradient-icon" />
            <div>
              <h1>Your Journey</h1>
              <p>{steps.length} stops · ~{journey.totalTimeMinutes} min total</p>
            </div>
          </div>

          {journey.confidenceNote && (
            <div className="confidence-note glass-card-static">
              <Sparkles size={16} />
              <span>{journey.confidenceNote}</span>
            </div>
          )}

          <div className="timeline stagger-children">
            {steps.map((s, i) => (
              <div key={i} className="timeline-item glass-card">
                <div className="timeline-step-num">{s.step || i + 1}</div>
                <div className="timeline-connector" />
                <div className="timeline-content">
                  <h3 className="timeline-action">{s.action}</h3>
                  <div className="timeline-meta">
                    {s.walkTimeMinutes && (
                      <span className="tm-tag"><Clock size={12} /> {s.walkTimeMinutes} min walk</span>
                    )}
                    {s.estimatedWaitMinutes > 0 && (
                      <span className="tm-tag"><Clock size={12} /> ~{s.estimatedWaitMinutes} min wait</span>
                    )}
                  </div>
                  {s.tips && <p className="timeline-tip">💡 {s.tips}</p>}
                </div>
              </div>
            ))}

            {/* Final arrival */}
            <div className="timeline-item timeline-final glass-card">
              <div className="timeline-step-num final-step"><CheckCircle size={20} /></div>
              <div className="timeline-content">
                <h3 className="timeline-action">Done! ~{journey.bufferMinutes || 0} min buffer</h3>
              </div>
            </div>
          </div>

          <button className="replan-btn" onClick={resetJourney}>
            <RotateCcw size={16} />
            Plan Another Journey
          </button>
        </div>
      </div>
    );
  }

  // Wizard State
  return (
    <div className="journey-page">
      <div className="journey-wizard animate-in">
        <div className="wizard-header">
          <Compass size={32} className="text-gradient-icon" />
          <h1>Journey Mode</h1>
          <p>Tell us what you need — AI plans the fastest route around live crowds</p>
        </div>

        {error && (
          <div className="wizard-error">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Goals */}
        <div className="wizard-section">
          <h3 className="wizard-label">What do you want to do?</h3>
          <div className="goal-chips">
            {GOAL_OPTIONS.map(goal => (
              <button
                key={goal.id}
                className={`goal-chip ${selectedGoals.includes(goal.id) ? 'goal-selected' : ''}`}
                onClick={() => toggleGoal(goal.id)}
              >
                <span className="chip-emoji">{goal.emoji}</span>
                {goal.label}
              </button>
            ))}
          </div>
        </div>

        {/* Current Location */}
        <div className="wizard-section">
          <h3 className="wizard-label">
            <MapPin size={16} /> Where are you now?
          </h3>
          <select value={currentZone} onChange={e => setCurrentZone(e.target.value)} className="wizard-select">
            <option value="">Select your zone...</option>
            {zones.map(z => (
              <option key={z.zoneId} value={z.zoneId}>
                {getZoneIcon(z.type)} {z.name} ({z.congestionLevel}% busy)
              </option>
            ))}
          </select>
        </div>

        {/* Deadline */}
        <div className="wizard-section">
          <h3 className="wizard-label">
            <Clock size={16} /> Back by when?
          </h3>
          <input type="time" value={deadline} onChange={e => setDeadline(e.target.value)} className="wizard-input" />
        </div>

        {/* Preferences */}
        <div className="wizard-section">
          <h3 className="wizard-label">Preferences</h3>
          <div className="pref-row">
            <label className="pref-toggle">
              <input type="checkbox" checked={avoidCrowds} onChange={e => setAvoidCrowds(e.target.checked)} />
              <span className="pref-slider" />
              <span>Avoid crowds</span>
            </label>
            <label className="pref-toggle">
              <input type="checkbox" checked={accessibility} onChange={e => setAccessibility(e.target.checked)} />
              <span className="pref-slider" />
              <span>Wheelchair accessible</span>
            </label>
          </div>
        </div>

        <button className="plan-btn" onClick={handlePlan} disabled={!selectedGoals.length}>
          <Sparkles size={18} />
          Plan My Journey
        </button>
      </div>
    </div>
  );
}

