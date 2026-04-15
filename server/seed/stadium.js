require('dotenv').config();
const mongoose = require('mongoose');
const Zone = require('../models/Zone');
const Vendor = require('../models/Vendor');
const Event = require('../models/Event');
const CrowdReport = require('../models/CrowdReport');

/**
 * 🏟️ Kyzen Stadium Seed Data
 * Creates a realistic IPL cricket stadium with 20 zones, 15 vendors, and an active event.
 * Based on Wankhede Stadium, Mumbai layout.
 *
 * Map center: 18.9388, 72.8258 (Wankhede Stadium area)
 */

const ZONES = [
  // Entry Gates
  { zoneId: 'gate-1', name: 'Gate 1 — North Entry', type: 'entry', coordinates: { lat: 18.9400, lng: 72.8248 }, capacity: 800, currentOccupancy: 320, adjacentZones: ['food-north', 'seating-north', 'merch-1'], walkTimeToAdjacent: [{ zoneId: 'food-north', seconds: 90 }, { zoneId: 'seating-north', seconds: 120 }, { zoneId: 'merch-1', seconds: 60 }], icon: 'door-open' },
  { zoneId: 'gate-2', name: 'Gate 2 — East Entry', type: 'entry', coordinates: { lat: 18.9390, lng: 72.8272 }, capacity: 800, currentOccupancy: 540, adjacentZones: ['food-east', 'seating-east', 'restroom-a'], walkTimeToAdjacent: [{ zoneId: 'food-east', seconds: 70 }, { zoneId: 'seating-east', seconds: 100 }, { zoneId: 'restroom-a', seconds: 80 }], icon: 'door-open' },
  { zoneId: 'gate-3', name: 'Gate 3 — South Entry', type: 'entry', coordinates: { lat: 18.9375, lng: 72.8258 }, capacity: 800, currentOccupancy: 180, adjacentZones: ['food-south', 'seating-south', 'parking'], walkTimeToAdjacent: [{ zoneId: 'food-south', seconds: 85 }, { zoneId: 'seating-south', seconds: 110 }, { zoneId: 'parking', seconds: 150 }], icon: 'door-open' },
  { zoneId: 'gate-4', name: 'Gate 4 — West VIP Entry', type: 'entry', coordinates: { lat: 18.9390, lng: 72.8242 }, capacity: 400, currentOccupancy: 280, adjacentZones: ['vip-lounge', 'seating-west', 'food-vip'], walkTimeToAdjacent: [{ zoneId: 'vip-lounge', seconds: 45 }, { zoneId: 'seating-west', seconds: 90 }, { zoneId: 'food-vip', seconds: 60 }], icon: 'door-open' },

  // Seating Sections
  { zoneId: 'seating-north', name: 'North Stand', type: 'seating', coordinates: { lat: 18.9398, lng: 72.8255 }, capacity: 8000, currentOccupancy: 5600, adjacentZones: ['gate-1', 'food-north', 'restroom-b', 'seating-east'], walkTimeToAdjacent: [{ zoneId: 'gate-1', seconds: 120 }, { zoneId: 'food-north', seconds: 90 }, { zoneId: 'restroom-b', seconds: 75 }, { zoneId: 'seating-east', seconds: 180 }], icon: 'armchair' },
  { zoneId: 'seating-east', name: 'East Pavilion', type: 'seating', coordinates: { lat: 18.9388, lng: 72.8270 }, capacity: 6000, currentOccupancy: 4800, adjacentZones: ['gate-2', 'food-east', 'restroom-a', 'seating-north', 'seating-south'], walkTimeToAdjacent: [{ zoneId: 'gate-2', seconds: 100 }, { zoneId: 'food-east', seconds: 80 }, { zoneId: 'restroom-a', seconds: 60 }, { zoneId: 'seating-north', seconds: 180 }, { zoneId: 'seating-south', seconds: 200 }], icon: 'armchair' },
  { zoneId: 'seating-south', name: 'South Stand', type: 'seating', coordinates: { lat: 18.9378, lng: 72.8260 }, capacity: 7000, currentOccupancy: 2100, adjacentZones: ['gate-3', 'food-south', 'restroom-c', 'seating-east', 'seating-west'], walkTimeToAdjacent: [{ zoneId: 'gate-3', seconds: 110 }, { zoneId: 'food-south', seconds: 95 }, { zoneId: 'restroom-c', seconds: 70 }, { zoneId: 'seating-east', seconds: 200 }, { zoneId: 'seating-west', seconds: 160 }], icon: 'armchair' },
  { zoneId: 'seating-west', name: 'West Wing', type: 'seating', coordinates: { lat: 18.9392, lng: 72.8244 }, capacity: 5000, currentOccupancy: 3500, adjacentZones: ['gate-4', 'vip-lounge', 'food-vip', 'seating-south', 'seating-north'], walkTimeToAdjacent: [{ zoneId: 'gate-4', seconds: 90 }, { zoneId: 'vip-lounge', seconds: 60 }, { zoneId: 'food-vip', seconds: 50 }, { zoneId: 'seating-south', seconds: 160 }, { zoneId: 'seating-north', seconds: 150 }], icon: 'armchair' },

  // Food Courts
  { zoneId: 'food-north', name: 'North Food Court', type: 'food', coordinates: { lat: 18.9396, lng: 72.8250 }, capacity: 500, currentOccupancy: 310, adjacentZones: ['gate-1', 'seating-north', 'restroom-b', 'merch-1'], walkTimeToAdjacent: [{ zoneId: 'gate-1', seconds: 90 }, { zoneId: 'seating-north', seconds: 90 }, { zoneId: 'restroom-b', seconds: 45 }, { zoneId: 'merch-1', seconds: 55 }], icon: 'utensils' },
  { zoneId: 'food-east', name: 'East Food Plaza', type: 'food', coordinates: { lat: 18.9386, lng: 72.8268 }, capacity: 400, currentOccupancy: 340, adjacentZones: ['gate-2', 'seating-east', 'restroom-a'], walkTimeToAdjacent: [{ zoneId: 'gate-2', seconds: 70 }, { zoneId: 'seating-east', seconds: 80 }, { zoneId: 'restroom-a', seconds: 50 }], icon: 'utensils' },
  { zoneId: 'food-south', name: 'South Snack Zone', type: 'food', coordinates: { lat: 18.9377, lng: 72.8255 }, capacity: 350, currentOccupancy: 120, adjacentZones: ['gate-3', 'seating-south', 'restroom-c', 'merch-2'], walkTimeToAdjacent: [{ zoneId: 'gate-3', seconds: 85 }, { zoneId: 'seating-south', seconds: 95 }, { zoneId: 'restroom-c', seconds: 40 }, { zoneId: 'merch-2', seconds: 65 }], icon: 'utensils' },
  { zoneId: 'food-vip', name: 'VIP Dining Lounge', type: 'food', coordinates: { lat: 18.9393, lng: 72.8245 }, capacity: 150, currentOccupancy: 80, adjacentZones: ['vip-lounge', 'seating-west', 'gate-4'], walkTimeToAdjacent: [{ zoneId: 'vip-lounge', seconds: 30 }, { zoneId: 'seating-west', seconds: 50 }, { zoneId: 'gate-4', seconds: 60 }], icon: 'wine' },

  // Restrooms
  { zoneId: 'restroom-a', name: 'Restroom Block A', type: 'restroom', coordinates: { lat: 18.9389, lng: 72.8266 }, capacity: 100, currentOccupancy: 45, adjacentZones: ['food-east', 'seating-east', 'gate-2'], walkTimeToAdjacent: [{ zoneId: 'food-east', seconds: 50 }, { zoneId: 'seating-east', seconds: 60 }, { zoneId: 'gate-2', seconds: 80 }], icon: 'bath' },
  { zoneId: 'restroom-b', name: 'Restroom Block B', type: 'restroom', coordinates: { lat: 18.9397, lng: 72.8252 }, capacity: 100, currentOccupancy: 70, adjacentZones: ['food-north', 'seating-north'], walkTimeToAdjacent: [{ zoneId: 'food-north', seconds: 45 }, { zoneId: 'seating-north', seconds: 75 }], icon: 'bath' },
  { zoneId: 'restroom-c', name: 'Restroom Block C', type: 'restroom', coordinates: { lat: 18.9376, lng: 72.8256 }, capacity: 100, currentOccupancy: 22, adjacentZones: ['food-south', 'seating-south'], walkTimeToAdjacent: [{ zoneId: 'food-south', seconds: 40 }, { zoneId: 'seating-south', seconds: 70 }], icon: 'bath' },

  // Merch Shops
  { zoneId: 'merch-1', name: 'Official Merch Store', type: 'merch', coordinates: { lat: 18.9399, lng: 72.8247 }, capacity: 200, currentOccupancy: 130, adjacentZones: ['gate-1', 'food-north'], walkTimeToAdjacent: [{ zoneId: 'gate-1', seconds: 60 }, { zoneId: 'food-north', seconds: 55 }], icon: 'shirt' },
  { zoneId: 'merch-2', name: 'Fan Zone Shop', type: 'merch', coordinates: { lat: 18.9378, lng: 72.8252 }, capacity: 150, currentOccupancy: 40, adjacentZones: ['food-south', 'gate-3'], walkTimeToAdjacent: [{ zoneId: 'food-south', seconds: 65 }, { zoneId: 'gate-3', seconds: 90 }], icon: 'shirt' },

  // Medical
  { zoneId: 'medical', name: 'Medical Bay', type: 'medical', coordinates: { lat: 18.9385, lng: 72.8248 }, capacity: 50, currentOccupancy: 5, adjacentZones: ['seating-west', 'seating-south', 'food-south'], walkTimeToAdjacent: [{ zoneId: 'seating-west', seconds: 120 }, { zoneId: 'seating-south', seconds: 100 }, { zoneId: 'food-south', seconds: 110 }], icon: 'cross' },

  // VIP
  { zoneId: 'vip-lounge', name: 'VIP Lounge', type: 'vip', coordinates: { lat: 18.9394, lng: 72.8243 }, capacity: 300, currentOccupancy: 190, adjacentZones: ['gate-4', 'food-vip', 'seating-west'], walkTimeToAdjacent: [{ zoneId: 'gate-4', seconds: 45 }, { zoneId: 'food-vip', seconds: 30 }, { zoneId: 'seating-west', seconds: 60 }], icon: 'crown' },

  // Parking
  { zoneId: 'parking', name: 'Main Parking Area', type: 'parking', coordinates: { lat: 18.9370, lng: 72.8258 }, capacity: 2000, currentOccupancy: 1400, adjacentZones: ['gate-3', 'gate-1'], walkTimeToAdjacent: [{ zoneId: 'gate-3', seconds: 150 }, { zoneId: 'gate-1', seconds: 240 }], icon: 'car' }
];

const VENDORS = [
  { vendorId: 'vendor-biryani-01', name: 'Hyderabadi Biryani Express', zoneId: 'food-north', category: 'food', tags: ['biryani', 'indian', 'rice', 'spicy', 'non-veg'], queueLength: 12, isOpen: true, pin: '1234', priceRange: '$$', rating: 4.5, description: 'Authentic Hyderabadi dum biryani with raita' },
  { vendorId: 'vendor-vadapav-01', name: 'Mumbai Vada Pav Corner', zoneId: 'food-north', category: 'food', tags: ['vada pav', 'snack', 'mumbai', 'vegetarian', 'fast'], queueLength: 8, isOpen: true, pin: '2345', priceRange: '$', rating: 4.2, description: 'Classic Mumbai street food — hot and crispy' },
  { vendorId: 'vendor-pizza-01', name: 'Slice & Dice Pizza', zoneId: 'food-east', category: 'food', tags: ['pizza', 'italian', 'cheese', 'fast food'], queueLength: 15, isOpen: true, pin: '3456', priceRange: '$$', rating: 4.0, description: 'Wood-fired thin crust pizzas' },
  { vendorId: 'vendor-dosa-01', name: 'South Express Dosa', zoneId: 'food-east', category: 'food', tags: ['dosa', 'south indian', 'idli', 'vegetarian', 'healthy'], queueLength: 6, isOpen: true, pin: '4567', priceRange: '$', rating: 4.3, description: 'Crispy masala dosas and filter coffee' },
  { vendorId: 'vendor-burger-01', name: 'Smash Burger Co.', zoneId: 'food-south', category: 'food', tags: ['burger', 'fries', 'american', 'fast food'], queueLength: 4, isOpen: true, pin: '5678', priceRange: '$$', rating: 3.9, description: 'Juicy smashed patty burgers' },
  { vendorId: 'vendor-momos-01', name: 'Momo Nation', zoneId: 'food-south', category: 'food', tags: ['momos', 'dumpling', 'chinese', 'steamed', 'spicy'], queueLength: 3, isOpen: true, pin: '6789', priceRange: '$', rating: 4.4, description: 'Steamed and fried momos with spicy chutney' },
  { vendorId: 'vendor-vip-dining', name: 'The Pavilion Kitchen', zoneId: 'food-vip', category: 'food', tags: ['gourmet', 'premium', 'platter', 'vip'], queueLength: 2, isOpen: true, pin: '7890', priceRange: '$$$', rating: 4.7, description: 'Premium gourmet platters for VIP guests' },
  { vendorId: 'vendor-chai-01', name: 'Chai Pe Charcha', zoneId: 'food-north', category: 'beverage', tags: ['chai', 'tea', 'coffee', 'hot drinks', 'indian'], queueLength: 10, isOpen: true, pin: '8901', priceRange: '$', rating: 4.6, description: 'Cutting chai and filter kaapi' },
  { vendorId: 'vendor-drinks-01', name: 'Chill Zone Beverages', zoneId: 'food-east', category: 'beverage', tags: ['cold drinks', 'juice', 'soda', 'water', 'beer'], queueLength: 7, isOpen: true, pin: '9012', priceRange: '$', rating: 4.1, description: 'Cold drinks, fresh juices and mocktails' },
  { vendorId: 'vendor-icecream-01', name: 'Scoops & Shakes', zoneId: 'food-south', category: 'beverage', tags: ['ice cream', 'milkshake', 'dessert', 'cold'], queueLength: 5, isOpen: true, pin: '0123', priceRange: '$', rating: 4.3, description: 'Handcrafted ice creams and thick shakes' },
  { vendorId: 'vendor-merch-official', name: 'Cricket Merch Official', zoneId: 'merch-1', category: 'merch', tags: ['jersey', 'cap', 'merchandise', 'official', 'cricket'], queueLength: 9, isOpen: true, pin: '1111', priceRange: '$$$', rating: 4.0, description: 'Official team jerseys, caps and memorabilia' },
  { vendorId: 'vendor-merch-fan', name: 'Fan Frenzy Store', zoneId: 'merch-2', category: 'merch', tags: ['flags', 'face paint', 'fan gear', 'accessories'], queueLength: 2, isOpen: true, pin: '2222', priceRange: '$', rating: 3.8, description: 'Flags, face paints and fan accessories' },
  { vendorId: 'vendor-lassi-01', name: 'Lassi Junction', zoneId: 'food-north', category: 'beverage', tags: ['lassi', 'buttermilk', 'yogurt', 'cold', 'refreshing'], queueLength: 4, isOpen: true, pin: '3333', priceRange: '$', rating: 4.5, description: 'Fresh mango and rose lassi' },
  { vendorId: 'vendor-chaat-01', name: 'Chaat Street', zoneId: 'food-east', category: 'food', tags: ['chaat', 'pani puri', 'bhel', 'street food', 'vegetarian'], queueLength: 11, isOpen: true, pin: '4444', priceRange: '$', rating: 4.4, description: 'Mumbai-style pani puri and bhel puri' },
  { vendorId: 'vendor-kebab-01', name: 'Kebab Korner', zoneId: 'food-south', category: 'food', tags: ['kebab', 'grill', 'non-veg', 'tandoori', 'mughlai'], queueLength: 6, isOpen: false, pin: '5555', priceRange: '$$', rating: 4.2, description: 'Tandoori kebabs and seekh rolls — Currently restocking' }
];

const CROWD_REPORTS = [
  { zoneId: 'food-north', congestionLevel: 75, description: 'Very crowded near biryani stall', sentiment: 'negative', reportedBy: 'attendee' },
  { zoneId: 'seating-east', congestionLevel: 85, description: 'Packed section, hard to find seats', sentiment: 'negative', reportedBy: 'attendee' },
  { zoneId: 'restroom-c', congestionLevel: 20, description: 'Almost empty, quick access', sentiment: 'positive', reportedBy: 'attendee' },
  { zoneId: 'food-south', congestionLevel: 30, description: 'Not too busy, good options', sentiment: 'positive', reportedBy: 'attendee' },
  { zoneId: 'gate-2', congestionLevel: 70, description: 'Long queue at security check', sentiment: 'negative', reportedBy: 'attendee' },
  { zoneId: 'merch-1', congestionLevel: 65, description: 'Moderate crowd at jersey counter', sentiment: 'neutral', reportedBy: 'attendee' }
];

const EVENT = {
  eventId: 'ipl-2026-mi-vs-csk',
  name: 'IPL 2026 — MI vs CSK',
  venue: 'Wankhede Stadium, Mumbai',
  date: new Date(),
  totalCapacity: 33000,
  currentAttendance: 19426,
  status: 'live',
  emergencyMode: false,
  announcements: [
    { message: 'Welcome to Wankhede Stadium! Enjoy the match.', type: 'info' },
    { message: 'Food courts are now open on all levels.', type: 'info' }
  ]
};

const seed = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error('❌ MONGODB_URI not set in server/.env file!');
      console.log('\n📋 Steps to fix:');
      console.log('1. Create a file: server/.env');
      console.log('2. Add: MONGODB_URI=your_mongodb_connection_string');
      console.log('3. Run this script again: npm run seed\n');
      process.exit(1);
    }

    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await Zone.deleteMany({});
    await Vendor.deleteMany({});
    await CrowdReport.deleteMany({});
    await Event.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Create zones
    const zones = await Zone.insertMany(ZONES);
    console.log(`📍 Created ${zones.length} zones`);

    // Create vendors and link to zones
    for (const vendorData of VENDORS) {
      const zone = zones.find(z => z.zoneId === vendorData.zoneId);
      const vendor = new Vendor({ ...vendorData, zone: zone?._id });
      await vendor.save();

      // Add vendor ref to zone
      if (zone) {
        zone.vendors.push(vendor._id);
        await zone.save();
      }
    }
    console.log(`🏪 Created ${VENDORS.length} vendors`);

    // Create crowd reports
    for (const report of CROWD_REPORTS) {
      const zone = zones.find(z => z.zoneId === report.zoneId);
      await CrowdReport.create({
        ...report,
        coordinates: zone?.coordinates || { lat: 18.9388, lng: 72.8258 }
      });
    }
    console.log(`📊 Created ${CROWD_REPORTS.length} crowd reports`);

    // Create event
    await Event.create(EVENT);
    console.log('🎉 Created active event: IPL 2026 — MI vs CSK');

    console.log('\n╔══════════════════════════════════════╗');
    console.log('║  🏟️  Stadium seeded successfully!    ║');
    console.log('║  20 zones, 15 vendors, 1 live event  ║');
    console.log('╚══════════════════════════════════════╝\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
};

seed();
