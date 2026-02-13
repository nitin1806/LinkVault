const mongoose = require('mongoose');

const uploadSchema = new mongoose.Schema({
  shareId: { type: String, required: true, unique: true },
  type: { type: String, enum: ['text', 'file'], required: true },
  content: { type: String, required: true },
  originalName: { type: String },
  expireAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  
  // --- ADVANCED FIELDS (These were missing!) ---
  password: { type: String },              
  oneTimeView: { type: Boolean, default: false }, 
  
  // Counts how many times link was opened (Default 0 is CRITICAL)
  views: { type: Number, default: 0 },     
  
  // The limit set by the user
  maxViews: { type: Number }               
});

module.exports = mongoose.model('Upload', uploadSchema);