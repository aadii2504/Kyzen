const express = require('express');
const router = express.Router();
const { planJourney } = require('../services/journeyPlanner');
const Journey = require('../models/Journey');
const { journeyLimiter } = require('../middleware/rateLimiter');

// POST /api/journey/plan — Create AI itinerary (rate limited)
router.post('/plan', journeyLimiter, async (req, res) => {
  try {
    const { goals, currentZone, deadline, preferences } = req.body;

    // Input validation
    if (!goals || !Array.isArray(goals) || !goals.length) {
      return res.status(400).json({ error: 'At least one goal is required (must be an array)' });
    }
    if (goals.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 goals allowed per journey' });
    }
    // Validate each goal is a non-empty string
    for (const goal of goals) {
      if (typeof goal !== 'string' || goal.trim().length === 0) {
        return res.status(400).json({ error: 'Each goal must be a non-empty string' });
      }
    }
    if (!currentZone || typeof currentZone !== 'string') {
      return res.status(400).json({ error: 'currentZone is required and must be a string' });
    }
    if (!deadline || typeof deadline !== 'string') {
      return res.status(400).json({ error: 'deadline is required (format: HH:MM)' });
    }

    // Sanitize goals
    const sanitizedGoals = goals.map(g => g.trim().slice(0, 100));

    const result = await planJourney(sanitizedGoals, currentZone.trim(), deadline.trim(), preferences || {});
    res.status(201).json(result);
  } catch (error) {
    console.error('Journey planning error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/journey/:id — Get journey details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Valid journey ID required' });
    }
    const journey = await Journey.findOne({ journeyId: id });
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
    const validStatuses = ['planning', 'active', 'completed', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
    }

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
