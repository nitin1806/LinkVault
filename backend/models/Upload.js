const mongoose = require('mongoose');

const uploadSchema = new mongoose.Schema({
  shareId: { type: String, required: true, unique: true },
  type: { type: String, enum: ['text', 'file'], required: true },
  content: { type: String, required: true },
  originalName: { type: String },
  expireAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  
  password: { type: String },              
  oneTimeView: { type: Boolean, default: false }, 
  
  // Counts 
  views: { type: Number, default: 0 },     
  
  // The limit set by the user
  maxViews: { type: Number },

  // for users
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  status: { type: String, enum: ['active', 'deactivated', 'expired'], default: 'active' }
});

module.exports = mongoose.model('Upload', uploadSchema);