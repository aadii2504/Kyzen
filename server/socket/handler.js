const { calculatePulseScore } = require('../services/pulseEngine');
const { getHeatmapData } = require('../services/heatmapAggregator');

/**
 * Socket.io Event Handlers
 * Manages real-time communication between server and all clients
 */

let pulseHistory = [];

const setupSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Send initial data on connect
    socket.on('request:initialData', async () => {
      try {
        const pulse = await calculatePulseScore();
        const heatmap = await getHeatmapData();
        socket.emit('pulse:update', { ...pulse, history: pulseHistory.slice(-20) });
        socket.emit('heatmap:refresh', { points: heatmap });
      } catch (err) {
        console.error('Initial data error:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  // Periodic pulse score recalculation (every 30 seconds)
  setInterval(async () => {
    try {
      const pulse = await calculatePulseScore();
      pulseHistory.push({ score: pulse.score, timestamp: pulse.timestamp });
      if (pulseHistory.length > 120) pulseHistory.shift(); // Keep 1 hour of data
      io.emit('pulse:update', { ...pulse, history: pulseHistory.slice(-20) });
    } catch (err) {
      console.error('Pulse broadcast error:', err);
    }
  }, 30000);

  // Periodic heatmap refresh (every 15 seconds)
  setInterval(async () => {
    try {
      const heatmap = await getHeatmapData();
      io.emit('heatmap:refresh', { points: heatmap });
    } catch (err) {
      console.error('Heatmap broadcast error:', err);
    }
  }, 15000);

  return io;
};

module.exports = { setupSocketHandlers };
