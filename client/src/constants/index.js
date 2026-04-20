/**
 * @module constants
 * @description Shared constants and configuration values for the Kyzen frontend.
 * Single source of truth for thresholds, zone types, goal options, and labels.
 */

/** Zone type definitions with icons and labels */
export const ZONE_TYPES = ['all', 'food', 'restroom', 'seating', 'entry', 'merch', 'vip', 'medical', 'parking'];

/** Goal options for Journey Mode wizard */
export const GOAL_OPTIONS = [
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

/** Zone type icon mapping */
export const ZONE_ICONS = {
  food: '🍽️', restroom: '🚻', seating: '💺', entry: '🚪', exit: '🚪',
  vip: '👑', merch: '🛍️', medical: '🏥', parking: '🅿️', stage: '🎤',
};

/** Congestion level thresholds */
export const CONGESTION_THRESHOLDS = {
  CLEAR: 30,
  MODERATE: 60,
  BUSY: 80,
  CRITICAL: 100,
};

/** Pulse score thresholds */
export const PULSE_THRESHOLDS = {
  EXCELLENT: 80,
  GOOD: 60,
  MODERATE: 40,
  WARNING: 20,
};

/** Announcement types */
export const ANNOUNCEMENT_TYPES = ['info', 'warning', 'critical'];

/** Wankhede Stadium coordinates (default map center) */
export const STADIUM_CENTER = [18.9388, 72.8258];

/** Auto-refresh intervals (milliseconds) */
export const REFRESH_INTERVALS = {
  PULSE: 30000,
  HEATMAP: 15000,
  ANALYTICS: 15000,
};

/** Maximum allowed values */
export const LIMITS = {
  MAX_GOALS: 10,
  MAX_QUEUE: 200,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_ANNOUNCEMENT_LENGTH: 1000,
};
