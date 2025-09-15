// routes/webInterface.js - Web Interface Route
const express = require('express');
const router = express.Router();

// Main Web Interface
router.get('/', (req, res) => {
  res.sendFile('index.html', { root: './public' });
});

module.exports = router;
