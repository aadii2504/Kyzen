/**
 * @module insightsEngine
 * @description Gemini AI-powered insights engine for stadium intelligence.
 * Generates natural language status summaries and crowd predictions
 * using live zone, vendor, and pulse data.
 */

const { getGemini } = require('../config/gemini');
const { calculatePulseScore } = require('./pulseEngine');
const Zone = require('../models/Zone');
const Vendor = require('../models/Vendor');
const CrowdReport = require('../models/CrowdReport');

/** Cache for AI insights to avoid excessive API calls */
let cachedInsights = null;
let lastInsightsTime = 0;
const INSIGHTS_CACHE_TTL = 30000; // 30 seconds

/**
 * Generate AI-powered stadium insights using Gemini.
 * Returns a natural language analysis of current stadium conditions.
 * @returns {Promise<Object>} { summary, highlights, recommendations, generatedAt }
 */
const generatePulseInsights = async () => {
  const now = Date.now();

  // Return cached insights if still fresh
  if (cachedInsights && (now - lastInsightsTime) < INSIGHTS_CACHE_TTL) {
    return cachedInsights;
  }

  try {
    const pulse = await calculatePulseScore();
    const zones = await Zone.find({});
    const vendors = await Vendor.find({ isOpen: true });
    const recentReports = await CrowdReport.find({
      createdAt: { $gte: new Date(now - 15 * 60 * 1000) }
    });

    const gemini = getGemini();
    if (!gemini) {
      // Fallback insights without AI
      return buildFallbackInsights(pulse, zones, vendors);
    }

    const criticalZones = zones.filter(z => z.congestionLevel >= 70);
    const negReports = recentReports.filter(r => r.sentiment === 'negative');

    const prompt = `You are Kyzen, the elite Smart Stadium Intelligence AI. Your goal is to analyze stadium live data and provide high-impact, professional insights.

STADIUM DATA SNAPSHOT:
- Pulse Score: ${pulse.score}/100 (Status: ${pulse.label})
- Global Attendance: ${pulse.stats?.totalAttendance || 0} / ${pulse.stats?.totalCapacity || 0}
- Critical Hot Zones: ${criticalZones.map(z => `${z.name} (${z.congestionLevel}%)`).join(', ') || 'None reported'}
- Vendor Efficiency: ${vendors.length} open stalls, avg wait ${vendors.length ? Math.round(vendors.reduce((s, v) => s + v.estimatedWaitMinutes, 0) / vendors.length) : 0} min
- Real-time Sentiment: ${negReports.length} negative signals detected in the last window.
- Efficiency Metrics: Flow=${pulse.breakdown?.crowdFlow || 0}, Speed=${pulse.breakdown?.queueEfficiency || 0}, Atmosphere=${pulse.breakdown?.mood || 0}

TASK:
Provide a strategic summary, key analytical highlights, and tactical recommendations for fans.

REQUIRED JSON FORMAT (Strictly no markdown):
{
  "summary": "Professional executive summary of stadium state",
  "highlights": ["3 analytical observations"],
  "recommendations": ["2 tactical tips for fans"],
  "crowdPrediction": "Data-driven prediction for the next 30-60 minutes"
}`;

    const response = await gemini.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
      config: {
        temperature: 0.2, // Lower temperature for more stable JSON
        maxOutputTokens: 512,
      }
    });

    let text = response.text || '';
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
      const insights = JSON.parse(text);
      const result = {
        ...insights,
        score: pulse.score,
        label: pulse.label,
        generatedAt: new Date().toISOString(),
        source: 'gemini'
      };

      cachedInsights = result;
      lastInsightsTime = now;
      return result;
    } catch {
      return buildFallbackInsights(pulse, zones, vendors);
    }
  } catch (error) {
    console.error('Insights generation error:', error);
    return buildFallbackInsights(
      { score: 50, label: 'Unknown', breakdown: {}, stats: {} },
      [],
      []
    );
  }
};

/**
 * Build deterministic fallback insights when Gemini is unavailable.
 * @param {Object} pulse - Pulse score data
 * @param {Array} zones - Zone data
 * @param {Array} vendors - Vendor data
 * @returns {Object} Fallback insights object
 */
const buildFallbackInsights = (pulse, zones, vendors) => {
  const criticalZones = zones.filter(z => z.congestionLevel >= 70);
  const avgWait = vendors.length
    ? Math.round(vendors.reduce((s, v) => s + v.estimatedWaitMinutes, 0) / vendors.length)
    : 0;

  const summaryMap = {
    'Smooth': 'Stadium is running smoothly with minimal congestion across all zones.',
    'Good': 'Overall conditions are good with some areas seeing moderate activity.',
    'Moderate': 'Stadium is experiencing moderate crowds — plan your moves wisely.',
    'Stressed': 'Multiple zones are under pressure. Consider timing your visits carefully.',
    'Critical': 'Stadium is at high capacity. Emergency routes are being prioritized.'
  };

  const highlights = [];
  if (criticalZones.length > 0) {
    highlights.push(`${criticalZones.length} zone${criticalZones.length > 1 ? 's' : ''} above 70% capacity`);
  }
  highlights.push(`Average vendor wait time is ${avgWait} minutes`);
  highlights.push(`${vendors.length} vendors currently serving`);
  if (pulse.breakdown?.mood !== undefined) {
    highlights.push(`Crowd mood score: ${pulse.breakdown.mood}/100`);
  }

  const recommendations = [];
  if (criticalZones.length > 0) {
    recommendations.push(`Avoid ${criticalZones[0].name} — try a less busy area`);
  }
  if (avgWait > 10) {
    recommendations.push('Food queues are long — order from less popular stalls for faster service');
  }
  recommendations.push('Use Journey Mode for AI-optimized route planning');

  return {
    summary: summaryMap[pulse.label] || 'Stadium data is being analyzed.',
    highlights,
    recommendations,
    crowdPrediction: pulse.score >= 70
      ? 'Crowds expected to remain manageable for the next 30 minutes.'
      : 'Congestion may increase as the match progresses — plan breaks early.',
    score: pulse.score,
    label: pulse.label,
    generatedAt: new Date().toISOString(),
    source: 'fallback'
  };
};

module.exports = { generatePulseInsights };
