const mongoose = require('mongoose');

const crowdReportSchema = new mongoose.Schema({
  zoneId: { type: String, required: true },
  reportedBy: {
    type: String,
    enum: ['attendee', 'vendor', 'system', 'sensor'],
    default: 'attendee'
  },
  congestionLevel: { type: Number, min: 0, max: 100, required: true },
  description: { type: String, default: '' },
  sentiment: {
    type: String,
    enum: ['positive', 'neutral', 'negative'],
    default: 'neutral'
  },
  coordinates: {
    lat: Number,
    lng: Number
  },
  verified: { type: Boolean, default: false },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 15 * 60 * 1000) // 15 min expiry
  }
}, { timestamps: true });

// TTL index — auto-delete expired reports
crowdReportSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('CrowdReport', crowdReportSchema);
