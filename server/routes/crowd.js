const express = require('express');
const router = express.Router();
const CrowdReport = require('../models/CrowdReport');
const Zone = require('../models/Zone');
const { getHeatmapData } = require('../services/heatmapAggregator');
const { reportLimiter } = require('../middleware/rateLimiter');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// POST /api/crowd/report — Submit crowd report (rate limited)
/**
 * @route POST /api/crowd/report
 * @description Submit a live crowd report from a user in the stadium.
 * @access Public
 */
router.post('/report', reportLimiter, catchAsync(async (req, res, next) => {
  const { zoneId, congestionLevel, description, sentiment, coordinates } = req.body;

  // Granular Validation
  if (!zoneId) return next(new AppError('zoneId is required', 400));
  if (congestionLevel === undefined || congestionLevel < 0 || congestionLevel > 100) {
    return next(new AppError('Valid congestionLevel (0-100) is required', 400));
  }

  const validSentiments = ['positive', 'neutral', 'negative'];
  const safeSentiment = validSentiments.includes(sentiment) ? sentiment : 'neutral';

  const zone = await Zone.findOne({ zoneId });
  if (!zone) return next(new AppError('Zone not found', 404));

  const report = await CrowdReport.create({
    zoneId,
    congestionLevel: Math.min(100, Math.max(0, Math.round(congestionLevel))),
    description: typeof description === 'string' ? description.trim().slice(0, 500) : '',
    sentiment: safeSentiment,
    coordinates: coordinates || zone.coordinates,
    reportedBy: 'attendee'
  });

  // Modernize Zone congestion calculation
  const recentReports = await CrowdReport.find({
    zoneId,
    createdAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) }
  });
  const avgReported = recentReports.reduce((sum, r) => sum + r.congestionLevel, 0) / recentReports.length;
  zone.congestionLevel = Math.round(zone.congestionLevel * 0.7 + avgReported * 0.3);
  await zone.save();

  // Real-time Update via Socket.io
  const io = req.app.get('io');
  if (io) {
    io.emit('crowd:newReport', { 
      report, 
      zoneUpdate: { zoneId, congestionLevel: zone.congestionLevel } 
    });
  }

  res.status(201).json({ status: 'success', data: { report } });
}));

// GET /api/crowd/heatmap — Aggregated heatmap data
router.get('/heatmap', catchAsync(async (req, res) => {
  const points = await getHeatmapData();
  res.status(200).json({ status: 'success', points });
}));

// GET /api/crowd/history/:zoneId — Congestion history
router.get('/history/:zoneId', catchAsync(async (req, res, next) => {
  const { zoneId } = req.params;
  if (!zoneId) return next(new AppError('zoneId is required', 400));

  const reports = await CrowdReport.find({ zoneId })
    .sort({ createdAt: -1 })
    .limit(50);
  
  res.status(200).json({ status: 'success', results: reports.length, data: { reports } });
}));

module.exports = router;
