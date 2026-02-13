const Upload = require('../models/Upload');
const { nanoid } = require('nanoid'); 
const bcrypt = require('bcryptjs'); 
const path = require('path');
const fs = require('fs'); 

const generateId = () => nanoid(10); 

// --- UPLOAD CONTENT ---
exports.uploadContent = async (req, res) => {
  try {
    console.log("📥 Raw Request Body:", req.body);
    const { text, userExpiry, password, oneTimeView, maxViews } = req.body; 
    const file = req.file;

    if (!text && !file) return res.status(400).json({ error: 'Please provide text or a file.' });

    // 1. Hash Password
    let hashedPassword = null;
    if (password) hashedPassword = await bcrypt.hash(password, 10);

    // 2. Expiry
    let finalExpiry;
    if (userExpiry) finalExpiry = new Date(userExpiry);
    else finalExpiry = new Date(Date.now() + 10 * 60 * 1000); 

    const shareId = generateId();
    const isOneTime = oneTimeView === 'true'; 
    
    // 3. ROBUST MAX VIEWS PARSING
    let parsedMaxViews = null;
    // Check if maxViews exists and is a valid number string
    if (maxViews && maxViews !== 'undefined' && maxViews !== '' && !isNaN(maxViews)) {
        parsedMaxViews = parseInt(maxViews);
    }

    console.log(`📤 Uploading: ID=${shareId} | MaxViews=${parsedMaxViews} | OneTime=${isOneTime}`);

    const uploadData = {
      shareId,
      type: file ? 'file' : 'text',
      content: file ? `${req.protocol}://${req.get('host')}/uploads/${file.filename}` : text,
      originalName: file ? file.originalname : undefined,
      expireAt: finalExpiry,
      password: hashedPassword,
      oneTimeView: isOneTime,
      maxViews: parsedMaxViews
    };

    const newUpload = await Upload.create(uploadData);
    res.status(201).json({ success: true, shareId, expiresAt: newUpload.expireAt });

  } catch (error) {
    console.error("Upload Error:", error);
    res.status(500).json({ error: 'Server Error' });
  }
};

// --- GET CONTENT ---
exports.getContent = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.query; 

    // 1. Fetch metadata FIRST (don't increment yet)
    const item = await Upload.findOne({ shareId: id });

    if (!item) return res.status(404).json({ error: 'Link not found or expired' });
    if (new Date() > item.expireAt) return res.status(404).json({ error: 'Link expired' });

    // 2. Password Check
    if (item.password) {
      if (!password) return res.status(401).json({ protected: true, error: 'Password required' });
      const isMatch = await bcrypt.compare(password, item.password);
      if (!isMatch) return res.status(403).json({ protected: true, error: 'Incorrect password' });
    }

    // 3. ATOMIC INCREMENT (The Fix)
    // We tell MongoDB specifically to "add 1 to views" and return the NEW document
    const updatedItem = await Upload.findOneAndUpdate(
      { _id: item._id },
      { $inc: { views: 1 } },
      { new: true } // Return the updated document
    );

    // Use updatedItem for checks now
    const currentViews = updatedItem.views;
    const maxLimit = updatedItem.maxViews;

    console.log(`👀 View ID: ${updatedItem.shareId}`);
    console.log(`   Count: ${currentViews} / ${maxLimit || 'Unlimited'}`);

    // 4. Check for Deletion
    let shouldDelete = false;
    
    if (updatedItem.oneTimeView) {
        console.log("   ❌ Deleting: One-Time View");
        shouldDelete = true;
    }
    
    if (maxLimit && currentViews >= maxLimit) {
        console.log("   ❌ Deleting: Max Views Reached");
        shouldDelete = true;
    }

    if (shouldDelete) {
        if (updatedItem.type === 'file') {
            const filename = updatedItem.content.split('/').pop();
            const filePath = path.join(__dirname, '../uploads', filename);
            fs.unlink(filePath, (err) => {
                if (err && err.code !== 'ENOENT') console.error("File delete error:", err.message);
            });
        }
        await Upload.deleteOne({ _id: updatedItem._id });
    }

    // Return the content
    res.json({
      type: updatedItem.type,
      content: updatedItem.content,
      originalName: updatedItem.originalName,
      createdAt: updatedItem.createdAt,
      expireAt: updatedItem.expireAt,
      oneTimeView: updatedItem.oneTimeView,
      views: currentViews, 
      maxViews: maxLimit,
      protected: !!updatedItem.password
    });

  } catch (error) {
    console.error("GetContent Error:", error);
    res.status(500).json({ error: 'Server Error' });
  }
};

// --- MANUAL DELETE ---
exports.deleteContent = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the item
    const item = await Upload.findOne({ shareId: id });
    
    if (!item) {
      return res.status(404).json({ error: 'Link already deleted or not found' });
    }

    // Delete file from disk if it exists
    if (item.type === 'file') {
      const filename = item.content.split('/').pop();
      const filePath = path.join(__dirname, '../uploads', filename);
      
      fs.unlink(filePath, (err) => {
        if (err && err.code !== 'ENOENT') console.error("File delete error:", err.message);
      });
    }

    // Delete from Database
    await Upload.deleteOne({ _id: item._id });
    
    console.log(`🗑️ Manually Deleted: ID=${id}`);
    res.json({ success: true, message: 'Content deleted successfully' });

  } catch (error) {
    console.error("Delete Error:", error);
    res.status(500).json({ error: 'Server Error' });
  }
};