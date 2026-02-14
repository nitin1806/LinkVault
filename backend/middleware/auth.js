const jwt = require('jsonwebtoken');

// Define a secret key (In production, put this in .env)
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_linkvault_key';

exports.protect = (req, res, next) => {
  let token = req.headers.authorization;
  if (token && token.startsWith('Bearer')) {
    try {
      token = token.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded; // Attach user ID to request
      next();
    } catch (error) {
      res.status(401).json({ error: 'Not authorized, token failed' });
    }
  } else {
    res.status(401).json({ error: 'Not authorized, no token' });
  }
};

// Optional auth for guests creating links vs logged-in users
exports.optionalAuth = (req, res, next) => {
    let token = req.headers.authorization;
    if (token && token.startsWith('Bearer')) {
      try {
        req.user = jwt.verify(token.split(' ')[1], JWT_SECRET);
      } catch (error) {} // Ignore invalid tokens for optional routes
    }
    next();
};