const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Secret key for JWT signing
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_linkvault_key';

exports.register = async (req, res) => {
  try {
    const { userId, email, password } = req.body;
    
    // Check if either the User ID OR the Email already exists in the database
    const userExists = await User.findOne({ $or: [{ email }, { userId }] });
    if (userExists) {
      return res.status(400).json({ error: 'User ID or Email already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create the user
    const user = await User.create({ 
      userId, 
      email, 
      password: hashedPassword 
    });
    
    // Generate a token
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({ token, userId: user.userId });
    
  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { loginId, password } = req.body; 
    
    // Find the user by either their email or their unique userId
    const user = await User.findOne({ $or: [{ email: loginId }, { userId: loginId }] });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Verify the password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate a token
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, userId: user.userId });
    
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: 'Server error' });
  }
};