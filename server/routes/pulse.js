const express = require('express');
const router = express.Router();
const { calculatePulseScore } = require('../services/pulseEngine');

// In-memory history (resets on server restart, fine for demo)
let pulseHistory = [];

// GET /api/pulse — Current Pulse Score + breakdown
router.get('/', async (req, res) => {
  try {
    const pulse = await calculatePulseScore();
    pulseHistory.push({ score: pulse.score, timestamp: pulse.timestamp });
    if (pulseHistory.length > 120) pulseHistory.shift();
    res.json({ ...pulse, history: pulseHistory });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/pulse/history — Score over time
router.get('/history', (req, res) => {
  res.json({ history: pulseHistory });
});

module.exports = router;
