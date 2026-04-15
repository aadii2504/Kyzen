const express = require('express');
const router = express.Router();
const Vendor = require('../models/Vendor');
const vendorAuth = require('../middleware/vendorAuth');
const QRCode = require('qrcode');

// GET /api/vendors — All vendors
router.get('/', async (req, res) => {
  try {
    const { category, zoneId } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (zoneId) filter.zoneId = zoneId;
    const vendors = await Vendor.find(filter).sort({ name: 1 });
    res.json(vendors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/vendors/:id — Single vendor
router.get('/:id', async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ vendorId: req.params.id });
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    res.json(vendor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/vendors/:id/update — Vendor self-updates queue (PIN auth)
router.post('/:id/update', vendorAuth, async (req, res) => {
  try {
    const vendor = req.vendor;
    const { queueLength, isOpen } = req.body;

    if (typeof queueLength === 'number') {
      vendor.queueLength = Math.max(0, queueLength);
    }
    if (typeof isOpen === 'boolean') {
      vendor.isOpen = isOpen;
    }
    vendor.lastUpdatedBy = 'vendor';

    await vendor.save();

    // Broadcast via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('vendor:queueUpdate', {
        vendorId: vendor.vendorId,
        name: vendor.name,
        queueLength: vendor.queueLength,
        estimatedWaitMinutes: vendor.estimatedWaitMinutes,
        isOpen: vendor.isOpen
      });
    }

    res.json({ success: true, vendor });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/vendors/:id/qr — Generate QR code
router.get('/:id/qr', async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ vendorId: req.params.id });
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const url = `${clientUrl}/vendor/update?id=${vendor.vendorId}`;
    const qrDataUrl = await QRCode.toDataURL(url, {
      width: 400,
      margin: 2,
      color: { dark: '#6366f1', light: '#0a0e1a' }
    });

    res.json({ qrCode: qrDataUrl, url, vendorId: vendor.vendorId, name: vendor.name });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
