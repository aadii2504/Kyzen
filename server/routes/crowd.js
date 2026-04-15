const express = require('express');
const router = express.Router();
const CrowdReport = require('../models/CrowdReport');
const Zone = require('../models/Zone');
const { getHeatmapData } = require('../services/heatmapAggregator');

// POST /api/crowd/report — Submit crowd report
router.post('/report', async (req, res) => {
  try {
    const { zoneId, congestionLevel, description, sentiment, coordinates } = req.body;

    if (!zoneId || congestionLevel === undefined) {
      return res.status(400).json({ error: 'zoneId and congestionLevel are required' });
    }

    const zone = await Zone.findOne({ zoneId });
    if (!zone) return res.status(404).json({ error: 'Zone not found' });

    const report = new CrowdReport({
      zoneId,
      congestionLevel: Math.min(100, Math.max(0, congestionLevel)),
      description: description || '',
      sentiment: sentiment || 'neutral',
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
    const reports = await CrowdReport.find({ zoneId: req.params.zoneId })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
