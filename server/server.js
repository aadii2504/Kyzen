require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const { setupSocketHandlers } = require('./socket/handler');

// Import routes
const zoneRoutes = require('./routes/zones');
const vendorRoutes = require('./routes/vendors');
const crowdRoutes = require('./routes/crowd');
const pulseRoutes = require('./routes/pulse');
const journeyRoutes = require('./routes/journey');
const adminRoutes = require('./routes/admin');
const eventRoutes = require('./routes/events');

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PATCH', 'DELETE']
  }
});

// Make io accessible in routes
app.set('io', io);

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// API Routes
app.use('/api/zones', zoneRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/crowd', crowdRoutes);
app.use('/api/pulse', pulseRoutes);
app.use('/api/journey', journeyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/events', eventRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: 'Kyzen API', timestamp: new Date().toISOString() });
});

// Setup Socket handlers
setupSocketHandlers(io);

// Connect to DB and start server
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════╗
║   🏟️  KYZEN Server is LIVE          ║
║   Port: ${PORT}                        ║
║   Environment: ${process.env.NODE_ENV || 'development'}        ║
╚══════════════════════════════════════╝
    `);
  });
}).catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

module.exports = { app, server, io };
