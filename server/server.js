require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const { setupSocketHandlers } = require('./socket/handler');
const { sanitizeMiddleware } = require('./middleware/sanitize');
const { apiLimiter } = require('./middleware/rateLimiter');

// Import routes
const zoneRoutes = require('./routes/zones');
const vendorRoutes = require('./routes/vendors');
const crowdRoutes = require('./routes/crowd');
const pulseRoutes = require('./routes/pulse');
const journeyRoutes = require('./routes/journey');
const adminRoutes = require('./routes/admin');
const eventRoutes = require('./routes/events');
const insightsRoutes = require('./routes/insights');
const globalErrorHandler = require('./middleware/errorController');
const AppError = require('./utils/AppError');

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

// ─── Security Middleware ───────────────────────────────────────
// Helmet with CSP allowing required external resources
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://unpkg.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://*.basemaps.cartocdn.com", "https://*.tile.openstreetmap.org"],
      connectSrc: ["'self'", "ws:", "wss:", process.env.CLIENT_URL || 'http://localhost:5173'],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS — allow only configured client origin
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'x-admin-password']
}));

// Body parser with payload size limit to prevent abuse
app.use(express.json({ limit: '10kb' }));

// Input sanitization — prevent NoSQL injection
app.use(sanitizeMiddleware);

// Global rate limiter for all API routes
app.use('/api', apiLimiter);

// ─── API Routes ────────────────────────────────────────────────
app.use('/api/zones', zoneRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/crowd', crowdRoutes);
app.use('/api/pulse', pulseRoutes);
app.use('/api/journey', journeyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/insights', insightsRoutes);

// Handle undefined routes
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error Handling Middleware
app.use(globalErrorHandler);

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
