const Upload = require('../models/Upload');
const { nanoid } = require('nanoid'); 
const bcrypt = require('bcryptjs'); 
const path = require('path');
const fs = require('fs'); // Import fs to delete files

const generateId = () => nanoid(10); 

// --- UPLOAD CONTENT ---
exports.uploadContent = async (req, res) => {
  try {
    const { text, userExpiry, password, oneTimeView } = req.body; // Get flag
    const file = req.file;

    if (!text && !file) {
      return res.status(400).json({ error: 'Please provide text or a file.' });
    }

    // Hash password
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Expiry Logic
    let finalExpiry;
    if (userExpiry) {
      finalExpiry = new Date(userExpiry);
    } else {
      finalExpiry = new Date(Date.now() + 10 * 60 * 1000); 
    }

    const shareId = generateId();
    const isOneTime = oneTimeView === 'true'; // Convert string to boolean

    if (file) {
      const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
      
      const newUpload = await Upload.create({
        shareId,
        type: 'file',
        content: fileUrl,
        originalName: file.originalname,
        expireAt: finalExpiry,
        password: hashedPassword,
        oneTimeView: isOneTime // Save flag
      });
      res.status(201).json({ success: true, shareId, expiresAt: newUpload.expireAt });

    } else {
      const newUpload = await Upload.create({
        shareId,
        type: 'text',
        content: text,
        expireAt: finalExpiry,
        password: hashedPassword,
        oneTimeView: isOneTime // Save flag
      });
      res.status(201).json({ success: true, shareId, expiresAt: newUpload.expireAt });
    }

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

    if (!item) {
      return res.status(404).json({ error: 'Link not found or expired' });
    }

    // Check expiry
    if (new Date() > item.expireAt) {
      return res.status(404).json({ error: 'Link expired' });
    }

    // Password Check
    if (item.password) {
      if (!password) {
        return res.status(401).json({ protected: true, error: 'Password required' });
      }
      const isMatch = await bcrypt.compare(password, item.password);
      if (!isMatch) {
        return res.status(403).json({ protected: true, error: 'Incorrect password' });
      }
    }

    // --- ONE-TIME VIEW LOGIC ---
    // If we reached here, the user is authorized to see the content.
    // If it's a one-time link, we DELETE it now so it can't be seen again.
    if (item.oneTimeView) {
        // 1. Delete file from disk if it exists
        if (item.type === 'file') {
            const filename = item.content.split('/').pop();
            const filePath = path.join(__dirname, '../uploads', filename);
            
            // Fire and forget deletion (don't wait for it)
            fs.unlink(filePath, (err) => {
                if (err) console.error("Failed to delete local file:", err.message);
            });
        }
        
        // 2. Delete from Database
        await Upload.deleteOne({ _id: item._id });
    }

    res.json({
      type: item.type,
      content: item.content,
      originalName: item.originalName,
      createdAt: item.createdAt,
      expireAt: item.expireAt,
      oneTimeView: item.oneTimeView, // Tell frontend this was a one-time view
      protected: !!item.password
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error' });
  }
};