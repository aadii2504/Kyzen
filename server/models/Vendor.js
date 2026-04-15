const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  vendorId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  zone: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone' },
  zoneId: { type: String, required: true },
  category: {
    type: String,
    enum: ['food', 'beverage', 'merch', 'service'],
    required: true
  },
  tags: [String],
  queueLength: { type: Number, default: 0 },
  estimatedWaitMinutes: { type: Number, default: 0 },
  isOpen: { type: Boolean, default: true },
  pin: { type: String, required: true },
  priceRange: {
    type: String,
    enum: ['$', '$$', '$$$'],
    default: '$$'
  },
  rating: { type: Number, min: 0, max: 5, default: 4.0 },
  lastUpdatedBy: { type: String, enum: ['vendor', 'system'], default: 'system' },
  description: { type: String, default: '' },
  image: { type: String, default: '' }
}, { timestamps: true });

// Auto-calculate estimated wait from queue length (approx 2 min per person)
vendorSchema.pre('save', function () {
  if (this.isModified('queueLength')) {
    this.estimatedWaitMinutes = Math.round(this.queueLength * 2);
  }
});

module.exports = mongoose.model('Vendor', vendorSchema);
