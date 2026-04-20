const { getGemini } = require('../config/gemini');
const Zone = require('../models/Zone');
const Vendor = require('../models/Vendor');
const Journey = require('../models/Journey');
const { findMultiStopRoute } = require('./dijkstra');
const { nanoid } = require('nanoid');

/**
 * Journey Planner — Gemini-powered smart itinerary
 * Takes user goals + deadline → returns a timestamped multi-stop plan
 */

const buildPrompt = (goals, currentZone, deadline, zones, vendors, preferences) => {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  const matchingVendors = vendors.filter(v => {
    return goals.some(goal => {
      const g = goal.toLowerCase();
      return v.tags.some(t => t.toLowerCase().includes(g)) ||
        v.name.toLowerCase().includes(g) ||
        v.category.toLowerCase().includes(g) ||
        (g.includes('food') && v.category === 'food') ||
        (g.includes('drink') && v.category === 'beverage') ||
        (g.includes('merch') && v.category === 'merch');
    });
  });

  return `You are Kyzen, a smart stadium concierge AI. Plan an optimal multi-stop journey inside a cricket stadium.

CURRENT SITUATION:
- User is at: ${currentZone.name} (Zone ID: ${currentZone.zoneId})
- Current time: ${timeStr}
- Must return by: ${deadline}
- Preferences: ${preferences.avoidCrowds ? 'AVOID crowded areas when possible' : 'No crowd preference'}, ${preferences.accessibility ? 'Needs wheelchair accessible routes only' : 'Standard routes'}

USER GOALS (must visit/accomplish ALL of these):
${goals.map((g, i) => `${i + 1}. ${g}`).join('\n')}

LIVE ZONE DATA (real-time):
${zones.map(z => `- ${z.name} [${z.zoneId}]: ${z.congestionLevel}% congested, ${z.currentOccupancy}/${z.capacity} people, type: ${z.type}, status: ${z.status}`).join('\n')}

RELEVANT VENDORS:
${matchingVendors.map(v => `- ${v.name} [${v.vendorId}] in zone ${v.zoneId}: queue=${v.queueLength} people, wait=${v.estimatedWaitMinutes}min, category=${v.category}, tags=[${v.tags.join(', ')}], price=${v.priceRange}, rating=${v.rating}/5`).join('\n')}

ZONE CONNECTIONS (walking times):
${zones.slice(0, 15).map(z => z.walkTimeToAdjacent.map(a => `  ${z.zoneId} → ${a.zoneId}: ${a.seconds} seconds`).join('\n')).join('\n')}

PLANNING RULES:
1. Visit all goals in the most time-efficient order
2. If user wants to avoid crowds, prefer zones with <50% congestion
3. Factor in vendor queue wait times
4. Suggest the best vendor for each food/drink goal based on wait time and rating
5. Ensure total time fits within the deadline with at least 5 min buffer
6. Give practical, friendly tips for each stop

RESPOND WITH ONLY THIS JSON (no markdown, no explanation):
{
  "steps": [
    {
      "step": 1,
      "action": "Walk to North Food Court",
      "zoneId": "zone-food-north",
      "vendorId": "vendor-biryani-01",
      "walkTimeMinutes": 3,
      "estimatedWaitMinutes": 4,
      "tips": "Order the combo meal — it's pre-packed and faster"
    }
  ],
  "totalTimeMinutes": 18,
  "bufferMinutes": 10,
  "confidenceNote": "Route avoids the congested south corridor. All vendors currently open."
}`;
};

const planJourney = async (goals, currentZoneId, deadline, preferences = {}) => {
  try {
    const zones = await Zone.find({});
    const vendors = await Vendor.find({ isOpen: true }).populate('zone');
    const currentZone = zones.find(z => z.zoneId === currentZoneId);

    if (!currentZone) {
      throw new Error(`Zone "${currentZoneId}" not found`);
    }

    const genAI = getGemini();
    let itinerary;

    if (genAI) {
      const prompt = buildPrompt(goals, currentZone, deadline, zones, vendors, preferences);
      let text = '';
      let success = false;
      const modelsToTry = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];

      for (const modelName of modelsToTry) {
        if (success) break;
        for (const apiVer of ['v1beta', 'v1']) {
          try {
            const model = genAI.getGenerativeModel({ model: modelName }, { apiVersion: apiVer });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            text = response.text() || '';
            if (text) {
              success = true;
              break;
            }
          } catch (e) {}
        }
      }

      if (success) {
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        try {
          itinerary = JSON.parse(text);
        } catch (err) {
          itinerary = await buildFallbackItinerary(goals, currentZone, zones, vendors, deadline);
        }
      } else {
        itinerary = await buildFallbackItinerary(goals, currentZone, zones, vendors, deadline);
      }
    } else {
      itinerary = await buildFallbackItinerary(goals, currentZone, zones, vendors, deadline);
    }

    // Save to database
    const journey = new Journey({
      journeyId: nanoid(10),
      request: { goals, deadline, currentZone: currentZoneId, preferences },
      itinerary: itinerary.steps || [],
      totalTimeMinutes: itinerary.totalTimeMinutes || 0,
      bufferMinutes: itinerary.bufferMinutes || 0,
      confidenceNote: itinerary.confidenceNote || 'Route planned based on current conditions',
      status: 'active'
    });

    await journey.save();

    return {
      journeyId: journey.journeyId,
      ...itinerary,
      status: 'active'
    };
  } catch (error) {
    console.error('Journey planning error:', error);
    throw error;
  }
};

/**
 * Fallback itinerary without AI — uses Dijkstra routing
 */
const buildFallbackItinerary = async (goals, currentZone, zones, vendors, deadline) => {
  // Map goals to zone types
  const goalZoneMap = {
    'food': 'food', 'biryani': 'food', 'eat': 'food', 'snack': 'food',
    'drink': 'food', 'beverage': 'food', 'chai': 'food', 'coffee': 'food',
    'restroom': 'restroom', 'bathroom': 'restroom', 'toilet': 'restroom', 'washroom': 'restroom',
    'seat': 'seating', 'back': 'seating',
    'merch': 'merch', 'merchandise': 'merch', 'shop': 'merch',
    'medical': 'medical', 'first aid': 'medical',
    'vip': 'vip'
  };

  const targetZones = [];
  goals.forEach(goal => {
    const g = goal.toLowerCase();
    const matchedType = Object.entries(goalZoneMap).find(([key]) => g.includes(key));
    if (matchedType) {
      // Find least congested zone of this type
      const candidates = zones.filter(z => z.type === matchedType[1] && z.status !== 'closed');
      if (candidates.length) {
        candidates.sort((a, b) => a.congestionLevel - b.congestionLevel);
        targetZones.push(candidates[0]);
      }
    }
  });

  // Build steps
  const steps = [];
  let currentTime = new Date();
  let prevZoneId = currentZone.zoneId;

  for (let i = 0; i < targetZones.length; i++) {
    const zone = targetZones[i];
    const walkMin = Math.ceil(Math.abs(zone.coordinates.lat - currentZone.coordinates.lat) * 800 + 2);
    const vendor = vendors.find(v => v.zoneId === zone.zoneId);

    steps.push({
      step: i + 1,
      action: `Walk to ${zone.name}`,
      zoneId: zone.zoneId,
      vendorId: vendor?.vendorId || '',
      walkTimeMinutes: Math.min(walkMin, 8),
      estimatedWaitMinutes: vendor?.estimatedWaitMinutes || 2,
      tips: vendor ? `Try ${vendor.name} — ${vendor.queueLength} people in line` : 'Should be quick!'
    });
    prevZoneId = zone.zoneId;
  }

  const totalTime = steps.reduce((sum, s) => sum + s.walkTimeMinutes + s.estimatedWaitMinutes, 0);

  return {
    steps,
    totalTimeMinutes: totalTime,
    bufferMinutes: Math.max(0, 30 - totalTime),
    confidenceNote: 'Route planned using shortest-path algorithm (AI unavailable)'
  };
};

module.exports = { planJourney };
