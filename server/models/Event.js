const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  venue: { type: String, required: true },
  date: { type: Date, required: true },
  totalCapacity: { type: Number, required: true },
  currentAttendance: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['upcoming', 'live', 'completed'],
    default: 'live'
  },
  emergencyMode: { type: Boolean, default: false },
  emergencyMessage: { type: String, default: '' },
  announcements: [{
    message: String,
    type: { type: String, enum: ['info', 'warning', 'critical'], default: 'info' },
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
