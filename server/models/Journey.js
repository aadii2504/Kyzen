const mongoose = require('mongoose');

const journeySchema = new mongoose.Schema({
  journeyId: { type: String, required: true, unique: true },
  userId: { type: String, default: 'anonymous' },
  request: {
    goals: [String],
    deadline: String,
    currentZone: String,
    preferences: {
      avoidCrowds: { type: Boolean, default: false },
      accessibility: { type: Boolean, default: false },
      budgetMax: Number
    }
  },
  itinerary: [{
    step: Number,
    action: String,
    zoneId: String,
    vendorId: String,
    walkTimeMinutes: Number,
    estimatedWaitMinutes: Number,
    estimatedArrival: String,
    tips: String,
    congestionAtPlan: Number
  }],
  totalTimeMinutes: Number,
  bufferMinutes: Number,
  confidenceNote: String,
  status: {
    type: String,
    enum: ['planning', 'active', 'completed', 'cancelled'],
    default: 'planning'
  },
  geminiModel: { type: String, default: 'gemini-2.5-flash' }
}, { timestamps: true });

module.exports = mongoose.model('Journey', journeySchema);
