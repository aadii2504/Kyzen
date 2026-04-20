const mongoose = require('mongoose');

const zoneSchema = new mongoose.Schema({
  zoneId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['food', 'restroom', 'seating', 'entry', 'exit', 'vip', 'merch', 'medical', 'parking', 'stage'],
    required: true
  },
  coordinates: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  bounds: [{
    lat: Number,
    lng: Number
  }],
  capacity: { type: Number, required: true },
  currentOccupancy: { type: Number, default: 0 },
  congestionLevel: { type: Number, min: 0, max: 100, default: 0 },
  status: {
    type: String,
    enum: ['normal', 'busy', 'critical', 'closed', 'emergency'],
    default: 'normal'
  },
  adjacentZones: [String],
  walkTimeToAdjacent: [{
    zoneId: String,
    seconds: Number
  }],
  vendors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }],
  floor: { type: Number, default: 0 },
  icon: { type: String, default: 'map-pin' }
}, { timestamps: true });

// Auto-compute congestion level from occupancy
zoneSchema.pre('save', function () {
  if (this.capacity > 0) {
    this.congestionLevel = Math.min(100, Math.round((this.currentOccupancy / this.capacity) * 100));
  }
  // Auto-set status based on congestion
  if (this.congestionLevel >= 90) this.status = 'critical';
  else if (this.congestionLevel >= 60) this.status = 'busy';
  else this.status = 'normal';
});

// Index for filtered queries by type and status (used by journey planner)
zoneSchema.index({ type: 1, status: 1 });

module.exports = mongoose.model('Zone', zoneSchema);
