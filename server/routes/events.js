const express = require('express');
const router = express.Router();
const Event = require('../models/Event');

// GET /api/events/current — Current active event
router.get('/current', async (req, res) => {
  try {
    const event = await Event.findOne({ status: 'live' });
    if (!event) {
      return res.json({ event: null, message: 'No active event' });
    }
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/events — All events
router.get('/', async (req, res) => {
  try {
    const events = await Event.find({}).sort({ date: -1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/events — Create event
router.post('/', async (req, res) => {
  try {
    const event = new Event(req.body);
    await event.save();
    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
