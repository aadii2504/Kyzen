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

    const genAI = getGemini();
    if (!genAI) return buildFallbackInsights(pulse, zones, vendors);

    const criticalZones = zones.filter(z => z.congestionLevel >= 70);
    const negReports = recentReports.filter(r => r.sentiment === 'negative');

    const prompt = `You are Kyzen, the elite Smart Stadium Intelligence AI. Analyze stadium data and provide professional insights.

STADIUM DATA SNAPSHOT:
- Pulse Score: ${pulse.score}/100
- Hot Zones: ${criticalZones.map(z => `${z.name} (${z.congestionLevel}%)`).join(', ') || 'None'}
- Metrics: Flow=${pulse.breakdown?.crowdFlow || 0}, Speed=${pulse.breakdown?.queueEfficiency || 0}, Atmosphere=${pulse.breakdown?.mood || 0}

REQUIRED JSON FORMAT:
{
  "summary": "Executive summary of stadium state",
  "highlights": ["Obs 1", "Obs 2", "Obs 3"],
  "recommendations": ["Tip 1", "Tip 2"],
  "crowdPrediction": "Prediction"
}`;

    let text = '';
    let success = false;
    const modelsToTry = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];

    for (const modelName of modelsToTry) {
      if (success) break;
      
      // Try both v1beta (default) and v1 (stable) API versions
      for (const apiVer of ['v1beta', 'v1']) {
        try {
          const model = genAI.getGenerativeModel(
            { model: modelName }, 
            { apiVersion: apiVer }
          );
          const result = await model.generateContent(prompt);
          const response = await result.response;
          text = response.text() || '';
          if (text) {
            success = true;
            console.log(`✅ Gemini Connected: ${modelName} (${apiVer})`);
            break;
          }
        } catch (e) {
          // Log only the first major error to avoid terminal spam
          if (modelName === 'gemini-1.5-flash' && apiVer === 'v1beta') {
            console.error(`🔍 Diagnostic: ${modelName} failed with: ${e.message}`);
          }
        }
      }
    }

    if (!success) {
      console.warn('AI Bridge: All versions/models unavailable. Activating Kyzen Local-IQ.');
      return buildFallbackInsights(pulse, zones, vendors);
    }

    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
      const insights = JSON.parse(text);
      return {
        ...insights,
        score: pulse.score,
        label: pulse.label,
        generatedAt: new Date().toISOString(),
        source: 'gemini'
      };
    } catch {
      return buildFallbackInsights(pulse, zones, vendors);
    }
  } catch (globalError) {
    console.error('Critical Insights Engine Failure:', globalError);
    return buildFallbackInsights({ score: 50, label: 'Stable' }, [], []);
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
  const critical = zones.filter(z => z.congestionLevel >= 70);
  const avgWait = vendors.length ? Math.round(vendors.reduce((s, v) => s + v.estimatedWaitMinutes, 0) / vendors.length) : 0;

  // Intelligence Decision Map
  let strategy = '';
  if (pulse.score > 80) strategy = 'Stadium infrastructure is operating at peak efficiency. Crowd distribution is balanced across all monitored sectors.';
  else if (pulse.score > 60) strategy = 'Operational health is stable, though transit corridors are showing initial congestion signals.';
  else if (pulse.score > 40) strategy = 'Substantial capacity load detected. Intelligence recommends proactive distribution to secondary vendors.';
  else strategy = 'Critical load detected. High-density signals suggest immediate fan-flow management is required.';

  return {
    summary: `${strategy} Global pulse score currently stands at ${pulse.score}%.`,
    highlights: [
      `Infrastructure Load: ${critical.length} high-density sectors identified.`,
      `Service Velocity: Average turnover time is ${avgWait} minutes.`,
      `Connectivity: ${pulse.stats?.recentReports || 0} real-time sentiment signals processed.`
    ],
    recommendations: [
      critical.length > 0 ? `Avoid ${critical[0].name} to minimize transit delay.` : 'Corridors are clear — optimal time for movement.',
      'Tactical Advice: Monitor "Journey Mode" for real-time lane optimizations.'
    ],
    crowdPrediction: pulse.score < 50 ? 'Dynamic capacity surge expected in the next window.' : 'System expectations suggest stable flow patterns.',
    score: pulse.score,
    label: pulse.label,
    generatedAt: new Date().toISOString(),
    source: 'kyzen-local-iq'
  };
};

module.exports = { generatePulseInsights };
