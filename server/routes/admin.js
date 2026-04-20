const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const { authLimiter } = require('../middleware/rateLimiter');
const Zone = require('../models/Zone');
const Vendor = require('../models/Vendor');
const CrowdReport = require('../models/CrowdReport');
const Event = require('../models/Event');
const { activateEmergency, deactivateEmergency } = require('../services/emergencyService');
const { calculatePulseScore } = require('../services/pulseEngine');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { body, validationResult } = require('express-validator');

// POST /api/admin/login — Admin auth (rate limited)
router.post('/login', authLimiter, (req, res, next) => {
  const { password } = req.body;

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return next(new AppError('Invalid administrative credentials', 401));
  }

  res.status(200).json({ status: 'success', message: 'Kyzen Administrative Core Unlocked' });
});

// GET /api/admin/analytics — Dashboard analytics (auth required)
router.get('/analytics', adminAuth, catchAsync(async (req, res) => {
  const zones = await Zone.find({});
  const vendors = await Vendor.find({});
  const recentReports = await CrowdReport.find({
    createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }
  }).sort({ createdAt: -1 });
  const event = await Event.findOne({ status: 'live' });
  const pulse = await calculatePulseScore();

  const criticalZones = zones.filter(z => z.congestionLevel >= 80);
  const closedVendors = vendors.filter(v => !v.isOpen);

  res.status(200).json({
    status: 'success',
    data: {
      pulse,
      event,
      zones: {
        total: zones.length,
        critical: criticalZones.length,
        criticalList: criticalZones.map(z => ({ zoneId: z.zoneId, name: z.name, congestion: z.congestionLevel })),
        avgCongestion: zones.length ? Math.round(zones.reduce((s, z) => s + z.congestionLevel, 0) / zones.length) : 0
      },
      vendors: {
        total: vendors.length,
        open: vendors.filter(v => v.isOpen).length,
        closed: closedVendors.length,
        avgWait: vendors.length ? Math.round(vendors.reduce((s, v) => s + v.estimatedWaitMinutes, 0) / vendors.length) : 0
      },
      reports: {
        lastHour: recentReports.length,
        negative: recentReports.filter(r => r.sentiment === 'negative').length,
        recent: recentReports.slice(0, 10)
      }
    }
  });
}));

// POST /api/admin/emergency — Toggle emergency mode
router.post('/emergency', adminAuth, [
  body('activate').isBoolean().withMessage('activate status must be a boolean'),
  body('message').optional().isString().trim().escape().isLength({ max: 500 })
], catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new AppError('Validation Failed', 400));

  const { activate, message } = req.body;
  const io = req.app.get('io');

  if (activate) {
    const result = await activateEmergency(io, message || 'Emergency protocol initiated');
    res.status(200).json({ status: 'success', data: result });
  } else {
    const result = await deactivateEmergency(io);
    res.status(200).json({ status: 'success', data: result });
  }
}));

// POST /api/admin/announce — Push announcement
router.post('/announce', adminAuth, [
  body('message').isString().trim().notEmpty().isLength({ max: 1000 }),
  body('type').isIn(['info', 'warning', 'critical'])
], catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new AppError(errors.array()[0].msg, 400));

  const { message, type } = req.body;
  const event = await Event.findOne({ status: 'live' });
  
  if (event) {
    event.announcements.push({ message, type });
    await event.save();
  }

  const io = req.app.get('io');
  if (io) {
    io.emit('announcement', {
      message,
      type,
      timestamp: new Date().toISOString()
    });
  }

  res.status(200).json({ status: 'success', message: 'Global broadcast complete' });
}));

// POST /api/admin/announce/stop — Clear announcement
router.post('/announce/stop', adminAuth, catchAsync(async (req, res) => {
  const io = req.app.get('io');
  if (io) io.emit('announcement:clear');
  res.status(200).json({ status: 'success', message: 'Broadcasting ceased' });
}));

module.exports = router;
