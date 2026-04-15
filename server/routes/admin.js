const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const Zone = require('../models/Zone');
const Vendor = require('../models/Vendor');
const CrowdReport = require('../models/CrowdReport');
const Event = require('../models/Event');
const { activateEmergency, deactivateEmergency } = require('../services/emergencyService');
const { calculatePulseScore } = require('../services/pulseEngine');

// POST /api/admin/login — Admin auth
router.post('/login', (req, res) => {
  const { password } = req.body;
  if (password === process.env.ADMIN_PASSWORD) {
    res.json({ success: true, message: 'Admin access granted' });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

// GET /api/admin/analytics — Dashboard analytics
router.get('/analytics', async (req, res) => {
  try {
    const zones = await Zone.find({});
    const vendors = await Vendor.find({});
    const recentReports = await CrowdReport.find({
      createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }
    }).sort({ createdAt: -1 });
    const event = await Event.findOne({ status: 'live' });
    const pulse = await calculatePulseScore();

    const criticalZones = zones.filter(z => z.congestionLevel >= 80);
    const closedVendors = vendors.filter(v => !v.isOpen);

    res.json({
      pulse,
      event,
      zones: {
        total: zones.length,
        critical: criticalZones.length,
        criticalList: criticalZones.map(z => ({ zoneId: z.zoneId, name: z.name, congestion: z.congestionLevel })),
        avgCongestion: Math.round(zones.reduce((s, z) => s + z.congestionLevel, 0) / zones.length)
      },
      vendors: {
        total: vendors.length,
        open: vendors.filter(v => v.isOpen).length,
        closed: closedVendors.length,
        avgWait: Math.round(vendors.reduce((s, v) => s + v.estimatedWaitMinutes, 0) / vendors.length)
      },
      reports: {
        lastHour: recentReports.length,
        negative: recentReports.filter(r => r.sentiment === 'negative').length,
        recent: recentReports.slice(0, 10)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/emergency — Toggle emergency mode
router.post('/emergency', adminAuth, async (req, res) => {
  try {
    const { activate, message } = req.body;
    const io = req.app.get('io');

    if (activate) {
      const result = await activateEmergency(io, message);
      res.json(result);
    } else {
      const result = await deactivateEmergency(io);
      res.json(result);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/announce — Push announcement
router.post('/announce', adminAuth, async (req, res) => {
  try {
    const { message, type } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

    const event = await Event.findOne({ status: 'live' });
    if (event) {
      event.announcements.push({ message, type: type || 'info' });
      await event.save();
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('announcement', {
        message,
        type: type || 'info',
        timestamp: new Date().toISOString()
      });
    }

    res.json({ success: true, message: 'Announcement broadcast' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
