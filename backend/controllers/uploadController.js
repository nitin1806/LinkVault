const Upload = require('../models/Upload');
const { nanoid } = require('nanoid'); 
const bcrypt = require('bcryptjs'); 
const path = require('path');
const fs = require('fs'); 

const generateId = () => nanoid(10); 

// --- HELPER: SOFT DELETE ---
// This deletes the physical file but KEEPS the database record for the Dashboard.
const softDeleteFile = async (item, reason = 'expired') => {
    // 1. Delete the physical file if it exists
    if (item.type === 'file' && item.content.startsWith('http')) {
        const filename = item.content.split('/').pop();
        const filePath = path.join(__dirname, '../uploads', filename);
        
        fs.unlink(filePath, (err) => {
            if(err && err.code !== 'ENOENT') console.log(`File delete warning: ${err.message}`);
        });
    }

    // 2. Update Database Record (Do NOT delete it)
    item.status = 'expired'; 
    item.content = reason === 'manual' ? 'Manually deleted by user' : 'Link expired or limit reached';
    // We keep 'originalName', 'views', 'createdAt' etc. so the dashboard still looks good
    await item.save();
};

// --- UPLOAD CONTENT ---
exports.uploadContent = async (req, res) => {
  try {
    const { text, userExpiry, password, oneTimeView, maxViews } = req.body; 
    const file = req.file;

    if (!text && !file) return res.status(400).json({ error: 'Provide text or file.' });

    let hashedPassword = null;
    if (password) hashedPassword = await bcrypt.hash(password, 10);

    let finalExpiry = userExpiry ? new Date(userExpiry) : new Date(Date.now() + 10 * 60 * 1000); 

    let parsedMaxViews = null;
    if (maxViews && !isNaN(maxViews)) parsedMaxViews = parseInt(maxViews);

    const uploadData = {
      shareId: generateId(),
      type: file ? 'file' : 'text',
      content: file ? `${req.protocol}://${req.get('host')}/uploads/${file.filename}` : text,
      originalName: file ? file.originalname : undefined,
      expireAt: finalExpiry,
      password: hashedPassword,
      oneTimeView: oneTimeView === 'true',
      maxViews: parsedMaxViews,
      // --- IMPORTANT: Link to User ---
      creator: req.user ? req.user.id : null 
    };

    const newUpload = await Upload.create(uploadData);
    res.status(201).json({ success: true, shareId: newUpload.shareId, expiresAt: newUpload.expireAt });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error' });
  }
};

// --- GET CONTENT ---
exports.getContent = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.query; 

    const item = await Upload.findOne({ shareId: id });
    if (!item) return res.status(404).json({ error: 'Link not found' });
    
    // 1. Status Checks
    if (item.status === 'deactivated') return res.status(403).json({ error: 'Link deactivated by creator' });
    
    // 2. Check Expiry Time
    if (item.status === 'expired' || new Date() > item.expireAt) {
        // If it expired by time but hasn't been marked yet, mark it now
        if (item.status !== 'expired') await softDeleteFile(item, 'expired');
        return res.status(404).json({ error: 'Link expired' });
    }

    // 3. Password Check
    if (item.password) {
      if (!password) return res.status(401).json({ protected: true, error: 'Password required' });
      if (!(await bcrypt.compare(password, item.password))) return res.status(403).json({ protected: true, error: 'Incorrect password' });
    }

    // 4. Update View Count (Atomic Increment)
    const updatedItem = await Upload.findOneAndUpdate(
        { _id: item._id }, 
        { $inc: { views: 1 } }, 
        { new: true }
    );

    // 5. Check One-Time / Max Views Limits
    let shouldExpire = false;
    if (updatedItem.oneTimeView) shouldExpire = true;
    if (updatedItem.maxViews && updatedItem.views >= updatedItem.maxViews) shouldExpire = true;

    if (shouldExpire) {
        // --- FIX: Use Soft Delete instead of hard delete ---
        // We do this asynchronously so the user still sees the content this one last time
        softDeleteFile(updatedItem, 'limit_reached');
    }

    res.json({
      type: updatedItem.type,
      content: updatedItem.content,
      originalName: updatedItem.originalName,
      createdAt: updatedItem.createdAt,
      expireAt: updatedItem.expireAt,
      oneTimeView: updatedItem.oneTimeView,
      views: updatedItem.views, 
      maxViews: updatedItem.maxViews,
      protected: !!updatedItem.password
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error' });
  }
};

// --- MANUAL DELETE (Updated to Soft Delete) ---
exports.deleteContent = async (req, res) => {
    try {
        const item = await Upload.findOne({ shareId: req.params.id });
        if (!item) return res.status(404).json({ error: 'Not found' });

        // --- FIX: SOFT DELETE HERE TOO ---
        await softDeleteFile(item, 'manual');
        
        res.json({ success: true, message: 'Content marked as deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server Error' });
    }
};

// --- DASHBOARD: GET USER LINKS ---
exports.getUserDashboard = async (req, res) => {
    try {
        // This will now find "Active", "Deactivated", AND "Expired" links
        const links = await Upload.find({ creator: req.user.id }).sort({ createdAt: -1 });
        res.json(links);
    } catch (error) {
        res.status(500).json({ error: 'Server Error' });
    }
};

// --- DASHBOARD: TOGGLE STATUS ---
exports.toggleLinkStatus = async (req, res) => {
    try {
        const item = await Upload.findOne({ shareId: req.params.id, creator: req.user.id });
        if(!item) return res.status(404).json({ error: 'Not found or unauthorized' });
        
        if(item.status === 'expired') return res.status(400).json({ error: 'Cannot reactivate expired link' });
        
        item.status = item.status === 'active' ? 'deactivated' : 'active';
        await item.save();
        res.json({ success: true, status: item.status });
    } catch (error) {
        res.status(500).json({ error: 'Server Error' });
    }
};