const express = require('express');
const router = express.Router();
const CrowdReport = require('../models/CrowdReport');
const Zone = require('../models/Zone');
const { getHeatmapData } = require('../services/heatmapAggregator');
const { reportLimiter } = require('../middleware/rateLimiter');

// POST /api/crowd/report — Submit crowd report (rate limited)
router.post('/report', reportLimiter, async (req, res) => {
  try {
    const { zoneId, congestionLevel, description, sentiment, coordinates } = req.body;

    // Input validation
    if (!zoneId || typeof zoneId !== 'string') {
      return res.status(400).json({ error: 'zoneId is required and must be a string' });
    }
    if (congestionLevel === undefined || typeof congestionLevel !== 'number') {
      return res.status(400).json({ error: 'congestionLevel is required and must be a number' });
    }
    if (congestionLevel < 0 || congestionLevel > 100) {
      return res.status(400).json({ error: 'congestionLevel must be between 0 and 100' });
    }

    const validSentiments = ['positive', 'neutral', 'negative'];
    const safeSentiment = validSentiments.includes(sentiment) ? sentiment : 'neutral';

    const zone = await Zone.findOne({ zoneId });
    if (!zone) return res.status(404).json({ error: 'Zone not found' });

    const report = new CrowdReport({
      zoneId,
      congestionLevel: Math.min(100, Math.max(0, Math.round(congestionLevel))),
      description: typeof description === 'string' ? description.trim().slice(0, 500) : '',
      sentiment: safeSentiment,
      coordinates: coordinates || zone.coordinates,
      reportedBy: 'attendee'
    });

    await report.save();

    // Update zone congestion (blend with existing — 70% sensor, 30% report)
    const recentReports = await CrowdReport.find({
      zoneId,
      createdAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) }
    });
    const avgReported = recentReports.reduce((sum, r) => sum + r.congestionLevel, 0) / recentReports.length;
    zone.congestionLevel = Math.round(zone.congestionLevel * 0.7 + avgReported * 0.3);
    await zone.save();

    // Broadcast new report
    const io = req.app.get('io');
    if (io) {
      io.emit('crowd:newReport', { report, zoneUpdate: { zoneId, congestionLevel: zone.congestionLevel } });
    }

    res.status(201).json({ success: true, report });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/crowd/heatmap — Aggregated heatmap data
router.get('/heatmap', async (req, res) => {
  try {
    const points = await getHeatmapData();
    res.json({ points });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/crowd/history/:zoneId — Congestion history
router.get('/history/:zoneId', async (req, res) => {
  try {
    const { zoneId } = req.params;
    if (!zoneId || typeof zoneId !== 'string') {
      return res.status(400).json({ error: 'Valid zoneId is required' });
    }
    const reports = await CrowdReport.find({ zoneId })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
