const mongoose = require('mongoose');

const uploadSchema = new mongoose.Schema({
  shareId: { type: String, required: true, unique: true },
  type: { type: String, enum: ['text', 'file'], required: true },
  content: { type: String, required: true },
  originalName: { type: String },
  expireAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  password: { type: String },
  
  // NEW: Flag for one-time access
  oneTimeView: { type: Boolean, default: false } 
});

module.exports = mongoose.model('Upload', uploadSchema);