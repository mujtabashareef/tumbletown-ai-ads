// server.js - Main Entry Point
require('dotenv').config();
const express = require('express');
const cron = require('node-cron');

// Import modules
const { initDatabase } = require('./config/database');
const { generateDailyAd } = require('./configuration/services/adGenerator');
const webInterface = require('./routes/webInterface');
const apiRoutes = require('./routes/api');
const privateRoutes = require('./routes/private');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));  // Serve files from public directory
app.use(express.static('uploads')); // Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/', webInterface);
app.use('/api', apiRoutes);
app.use('/private', privateRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'TumbleTown AI Ad Generator',
    cost: '$0.00 per ad',
    features: ['Pollinations AI', 'PostgreSQL', 'Railway Hosting']
  });
});

// Schedule daily generation (9 AM every day)
cron.schedule('0 9 * * *', () => {
  console.log('🕘 Scheduled daily ad generation triggered');
  generateDailyAd().catch(error => {
    console.error('Scheduled ad generation failed:', error);
  });
}, {
  timezone: process.env.TIMEZONE || 'America/New_York'
});

// Start server
async function startServer() {
  try {
    await initDatabase();
    
    app.listen(PORT, () => {
      console.log(`🎪 TumbleTown AI Ad Generator running on port ${PORT}`);
      console.log('💰 100% FREE version - No API costs!');
      console.log('🤖 Using Pollinations AI for image generation');
      console.log('📅 Daily ad generation scheduled for 9:00 AM');
      console.log('🔗 Health check: /health');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
