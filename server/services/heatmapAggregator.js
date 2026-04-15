const CrowdReport = require('../models/CrowdReport');
const Zone = require('../models/Zone');

/**
 * Heatmap Aggregator
 * Generates heatmap data points by combining zone occupancy + crowd reports
 */

const getHeatmapData = async () => {
  try {
    const zones = await Zone.find({});
    const recentReports = await CrowdReport.find({
      createdAt: { $gte: new Date(Date.now() - 30 * 60 * 1000) }
    });

    const points = [];

    // Generate points from zone data (primary source)
    zones.forEach(zone => {
      const intensity = zone.congestionLevel / 100;
      // Add multiple points per zone based on congestion (more congestion = more heat points)
      const pointCount = Math.max(1, Math.floor(intensity * 10));
      for (let i = 0; i < pointCount; i++) {
        // Spread points slightly around zone center
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

    return points;
  } catch (error) {
    console.error('Heatmap aggregation error:', error);
    return [];
  }
};

module.exports = { getHeatmapData };
