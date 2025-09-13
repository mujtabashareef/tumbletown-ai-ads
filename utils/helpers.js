// utils/helpers.js - Utility Functions

// Generate secure access token
const generateAccessToken = () => require('crypto').randomBytes(32).toString('hex');

// Create private URL path
const createPrivateUrl = (postId, token) => `/private/${postId}/${token}`;

// Authentication middleware
const authenticateOwner = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const ownerToken = process.env.OWNER_ACCESS_TOKEN || 'tumbletown-owner-2024';
  
  if (token === ownerToken) {
    next();
  } else {
    res.status(401).json({ success: false, error: 'Unauthorized access' });
  }
};

module.exports = {
  generateAccessToken,
  createPrivateUrl,
  authenticateOwner
};