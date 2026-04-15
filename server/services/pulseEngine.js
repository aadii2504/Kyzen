const Zone = require('../models/Zone');
const Vendor = require('../models/Vendor');
const CrowdReport = require('../models/CrowdReport');
const Event = require('../models/Event');

/**
 * Pulse Score Engine
 * Calculates a single 0-100 score representing overall stadium health.
 * 
 * Formula:
 *   Pulse = 100 - weightedAvg([
 *     zoneCongestion   × 0.35
 *     queuePressure    × 0.20
 *     crowdSentiment   × 0.15
 *     capacityRatio    × 0.20
 *     emergencyPenalty × 0.10
 *   ])
 */

const calculatePulseScore = async () => {
  try {
    const zones = await Zone.find({});
    const vendors = await Vendor.find({ isOpen: true });
    const recentReports = await CrowdReport.find({
      createdAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) }
    });
    const event = await Event.findOne({ status: 'live' });

    if (!zones.length) {
      return { score: 100, breakdown: {}, trend: 'stable', label: 'No Data' };
    }

    // 1. Zone Congestion (avg congestion across all zones)
    const avgCongestion = zones.reduce((sum, z) => sum + z.congestionLevel, 0) / zones.length;

    // 2. Queue Pressure (avg wait time normalized to 0-100, cap at 30 min = 100)
    const avgWait = vendors.length
      ? vendors.reduce((sum, v) => sum + v.estimatedWaitMinutes, 0) / vendors.length
      : 0;
    const queuePressure = Math.min(100, (avgWait / 30) * 100);

    // 3. Crowd Sentiment (% of negative reports in last 15 min)
    const negativeReports = recentReports.filter(r => r.sentiment === 'negative').length;
    const sentimentScore = recentReports.length
      ? (negativeReports / recentReports.length) * 100
      : 0;

    // 4. Capacity Ratio (total attendance / total capacity)
    const totalCapacity = zones.reduce((sum, z) => sum + z.capacity, 0);
    const totalOccupancy = zones.reduce((sum, z) => sum + z.currentOccupancy, 0);
    const capacityRatio = totalCapacity ? (totalOccupancy / totalCapacity) * 100 : 0;

    // 5. Emergency Penalty
    const emergencyPenalty = event?.emergencyMode ? 100 : 0;

    // Weighted calculation
    const weightedPenalty = (
      avgCongestion * 0.35 +
      queuePressure * 0.20 +
      sentimentScore * 0.15 +
      capacityRatio * 0.20 +
      emergencyPenalty * 0.10
    );

    const score = Math.max(0, Math.min(100, Math.round(100 - weightedPenalty)));

    // Determine label and trend
    let label, trend;
    if (score >= 80) { label = 'Smooth'; trend = 'excellent'; }
    else if (score >= 60) { label = 'Good'; trend = 'stable'; }
    else if (score >= 40) { label = 'Moderate'; trend = 'caution'; }
    else if (score >= 20) { label = 'Stressed'; trend = 'warning'; }
    else { label = 'Critical'; trend = 'critical'; }

    return {
      score,
      label,
      trend,
      breakdown: {
        crowdFlow: Math.round(100 - avgCongestion),
        queueEfficiency: Math.round(100 - queuePressure),
        mood: Math.round(100 - sentimentScore),
        capacity: Math.round(100 - capacityRatio),
        safety: emergencyPenalty === 0 ? 100 : 0
      },
      stats: {
        totalZones: zones.length,
        activeVendors: vendors.length,
        recentReports: recentReports.length,
        totalAttendance: totalOccupancy,
        totalCapacity
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Pulse Score calculation error:', error);
    return { score: 50, label: 'Unknown', trend: 'stable', breakdown: {}, timestamp: new Date().toISOString() };
  }
};

module.exports = { calculatePulseScore };
