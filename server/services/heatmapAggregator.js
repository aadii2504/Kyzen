/**
 * @module heatmapAggregator
 * @description Generates heatmap data points by combining zone occupancy + crowd reports.
 * Includes an in-memory cache with configurable TTL to avoid redundant DB queries.
 */

const CrowdReport = require('../models/CrowdReport');
const Zone = require('../models/Zone');

/** Cache config */
const CACHE_TTL_MS = 10000; // 10-second cache TTL
let cachedPoints = null;
let lastCacheTime = 0;

/**
 * Get aggregated heatmap data points for Leaflet heatmap rendering.
 * Returns cached data if within TTL window to reduce DB load.
 * @returns {Promise<Array<[number, number, number]>>} Array of [lat, lng, intensity] tuples
 */
const getHeatmapData = async () => {
  try {
    const now = Date.now();

    // Return cached data if still valid
    if (cachedPoints && (now - lastCacheTime) < CACHE_TTL_MS) {
      return cachedPoints;
    }

    const zones = await Zone.find({});
    const recentReports = await CrowdReport.find({
      createdAt: { $gte: new Date(now - 30 * 60 * 1000) }
    });

    const points = [];

    // Generate points from zone data (primary source)
    zones.forEach(zone => {
      const intensity = zone.congestionLevel / 100;
      // Add multiple points per zone based on congestion (more congestion = more heat points)
      const pointCount = Math.max(1, Math.floor(intensity * 10));
      for (let i = 0; i < pointCount; i++) {
        // Spread points slightly around zone center for visual density
        const jitterLat = (Math.random() - 0.5) * 0.001;
        const jitterLng = (Math.random() - 0.5) * 0.001;
        points.push([
          zone.coordinates.lat + jitterLat,
          zone.coordinates.lng + jitterLng,
          intensity
        ]);
      }
    });

    // Add points from crowd reports (secondary source)
    recentReports.forEach(report => {
      if (report.coordinates?.lat && report.coordinates?.lng) {
        points.push([
          report.coordinates.lat,
          report.coordinates.lng,
          report.congestionLevel / 100
        ]);
      }
    });

    // Update cache
    cachedPoints = points;
    lastCacheTime = now;

    return points;
  } catch (error) {
    console.error('Heatmap aggregation error:', error);
    return cachedPoints || [];
  }
};

/**
 * Invalidate the heatmap cache. Useful after significant data changes.
 */
const invalidateHeatmapCache = () => {
  cachedPoints = null;
  lastCacheTime = 0;
};

module.exports = { getHeatmapData, invalidateHeatmapCache };
