export const getStatusColor = (level) => {
  if (level < 30) return 'var(--accent-emerald)';
  if (level < 60) return 'var(--accent-amber)';
  if (level < 80) return 'var(--accent-amber)';
  return 'var(--accent-rose)';
};

export const getStatusLabel = (level) => {
  if (level < 30) return 'Clear';
  if (level < 60) return 'Moderate';
  if (level < 80) return 'Busy';
  return 'Critical';
};

export const getZoneColor = (congestion) => {
  if (congestion < 30) return 'rgba(16, 185, 129, 0.35)';
  if (congestion < 60) return 'rgba(245, 158, 11, 0.35)';
  if (congestion < 80) return 'rgba(249, 115, 22, 0.35)';
  return 'rgba(244, 63, 94, 0.4)';
};

export const getZoneBorderColor = (congestion) => {
  if (congestion < 30) return '#10b981';
  if (congestion < 60) return '#f59e0b';
  if (congestion < 80) return '#f97316';
  return '#f43f5e';
};

export const getPulseColor = (score) => {
  if (score >= 80) return 'var(--pulse-safe)';
  if (score >= 50) return 'var(--pulse-moderate)';
  return 'var(--pulse-critical)';
};

export const getPulseGlow = (score) => {
  if (score >= 80) return 'rgba(16, 185, 129, 0.3)';
  if (score >= 50) return 'rgba(245, 158, 11, 0.3)';
  return 'rgba(244, 63, 94, 0.3)';
};

export const formatTime = (date) => {
  return new Date(date).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true
  });
};

export const formatTimeShort = (minutes) => {
  if (minutes < 1) return '<1 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hrs}h ${mins}m`;
};

export const getZoneIcon = (type) => {
  const icons = {
    food: '🍽️', restroom: '🚻', seating: '💺', entry: '🚪', exit: '🚪',
    vip: '👑', merch: '🛍️', medical: '🏥', parking: '🅿️', stage: '🎤'
  };
  return icons[type] || '📍';
};
