const Event = require('../models/Event');
const Zone = require('../models/Zone');

/**
 * Emergency Service
 * Handles emergency mode activation/deactivation
 */

const activateEmergency = async (io, message = 'Emergency evacuation in progress') => {
  try {
    // Set all events to emergency mode
    await Event.updateMany({ status: 'live' }, { emergencyMode: true, emergencyMessage: message });

    // Set all zones to emergency status
    await Zone.updateMany({}, { status: 'emergency' });

    // Broadcast to all connected clients
    io.emit('emergency:activate', {
      active: true,
      message,
      timestamp: new Date().toISOString(),
      instructions: [
        'Move calmly to the nearest exit',
        'Follow the illuminated exit signs',
        'Do not use elevators',
        'Assist those who need help',
        'Assembly point: Main Parking Area'
      ]
    });

    console.log('🚨 EMERGENCY MODE ACTIVATED');
    return { success: true, message: 'Emergency mode activated' };
  } catch (error) {
    console.error('Emergency activation error:', error);
    throw error;
  }
};

const deactivateEmergency = async (io) => {
  try {
    await Event.updateMany({}, { emergencyMode: false, emergencyMessage: '' });

    // Re-calculate zone statuses based on occupancy
    const zones = await Zone.find({});
    for (const zone of zones) {
      if (zone.congestionLevel >= 90) zone.status = 'critical';
      else if (zone.congestionLevel >= 60) zone.status = 'busy';
      else zone.status = 'normal';
      await zone.save();
    }

    io.emit('emergency:deactivate', {
      active: false,
      timestamp: new Date().toISOString()
    });

    console.log('✅ Emergency mode deactivated');
    return { success: true, message: 'Emergency mode deactivated' };
  } catch (error) {
    console.error('Emergency deactivation error:', error);
    throw error;
  }
};

module.exports = { activateEmergency, deactivateEmergency };
