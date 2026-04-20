/**
 * @module insights
 * @description API routes for Gemini AI-powered stadium insights.
 * Provides real-time AI analysis of stadium conditions.
 */

const express = require('express');
const router = express.Router();
const { generatePulseInsights } = require('../services/insightsEngine');

// GET /api/insights/pulse — AI-generated stadium insights
router.get('/pulse', async (req, res) => {
  try {
    const insights = await generatePulseInsights();
    res.json(insights);
  } catch (error) {
    console.error('Insights API error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
