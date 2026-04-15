const express = require('express');
const router = express.Router();
const { planJourney } = require('../services/journeyPlanner');
const Journey = require('../models/Journey');

// POST /api/journey/plan — Create AI itinerary
router.post('/plan', async (req, res) => {
  try {
    const { goals, currentZone, deadline, preferences } = req.body;

    if (!goals || !goals.length) {
      return res.status(400).json({ error: 'At least one goal is required' });
    }
    if (!currentZone) {
      return res.status(400).json({ error: 'currentZone is required' });
    }
    if (!deadline) {
      return res.status(400).json({ error: 'deadline is required' });
    }

    const result = await planJourney(goals, currentZone, deadline, preferences || {});
    res.status(201).json(result);
  } catch (error) {
    console.error('Journey planning error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/journey/:id — Get journey details
router.get('/:id', async (req, res) => {
  try {
    const journey = await Journey.findOne({ journeyId: req.params.id });
    if (!journey) return res.status(404).json({ error: 'Journey not found' });
    res.json(journey);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/journey/:id/status — Update journey status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const journey = await Journey.findOneAndUpdate(
      { journeyId: req.params.id },
      { status },
      { new: true }
    );
    if (!journey) return res.status(404).json({ error: 'Journey not found' });
    res.json(journey);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
