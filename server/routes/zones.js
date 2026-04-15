const express = require('express');
const router = express.Router();
const Zone = require('../models/Zone');

// GET /api/zones — All zones with live congestion
router.get('/', async (req, res) => {
  try {
    const zones = await Zone.find({}).sort({ name: 1 });
    res.json(zones);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/zones/:id — Single zone detail
router.get('/:id', async (req, res) => {
  try {
    const zone = await Zone.findOne({ zoneId: req.params.id }).populate('vendors');
    if (!zone) return res.status(404).json({ error: 'Zone not found' });
    res.json(zone);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/zones/:id/occupancy — Update occupancy
router.patch('/:id/occupancy', async (req, res) => {
  try {
    const { occupancy, delta } = req.body;
    const zone = await Zone.findOne({ zoneId: req.params.id });
    if (!zone) return res.status(404).json({ error: 'Zone not found' });

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

    res.json(zone);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
