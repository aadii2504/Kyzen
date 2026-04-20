const express = require('express');
const router = express.Router();
const Zone = require('../models/Zone');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// GET /api/zones — All zones with live congestion
router.get('/', catchAsync(async (req, res) => {
  const zones = await Zone.find({}).sort({ name: 1 });
  res.status(200).json(zones);
}));

// GET /api/zones/:id — Single zone detail
router.get('/:id', catchAsync(async (req, res, next) => {
  const zone = await Zone.findOne({ zoneId: req.params.id }).populate('vendors');
  if (!zone) return next(new AppError('Zone not found', 404));
  
  res.status(200).json({ status: 'success', data: { zone } });
}));

// PATCH /api/zones/:id/occupancy — Update occupancy
router.patch('/:id/occupancy', catchAsync(async (req, res, next) => {
  const { occupancy, delta } = req.body;
  const zone = await Zone.findOne({ zoneId: req.params.id });
  if (!zone) return next(new AppError('Zone not found', 404));

  if (typeof occupancy === 'number') {
    zone.currentOccupancy = Math.max(0, occupancy);
  } else if (typeof delta === 'number') {
    zone.currentOccupancy = Math.max(0, zone.currentOccupancy + delta);
  }

  await zone.save();

  // Broadcast update via Socket.io
  const io = req.app.get('io');
  if (io) {
    io.emit('zone:update', {
      zoneId: zone.zoneId,
      currentOccupancy: zone.currentOccupancy,
      congestionLevel: zone.congestionLevel,
      status: zone.status
    });
  }

  res.status(200).json(zone);
}));

module.exports = router;
