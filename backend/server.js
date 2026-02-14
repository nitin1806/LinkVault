require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const fs = require('fs');
const connectDB = require('./config/db');
const apiRoutes = require('./routes/apiRoutes');
const Upload = require('./models/Upload');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve Static Files (Locally stored uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database Connection
connectDB();

// Mount Routes
app.use('/api', apiRoutes);

// --- BACKGROUND JOB: SMART CLEANUP ---
// Runs every minute. Finds expired items, deletes the physical file, 
// but keeps the database record marked as 'expired' for the user's dashboard.
cron.schedule('* * * * *', async () => {
  try {
    const now = new Date();
    
    // Find docs that are past expiry AND haven't been marked expired yet
    const expiredDocs = await Upload.find({ 
      expireAt: { $lt: now }, 
      status: { $ne: 'expired' } 
    });
    
    if (expiredDocs.length > 0) {
      console.log(`Cleanup: Marking ${expiredDocs.length} items as expired.`);
      
      for (const doc of expiredDocs) {
        // 1. Delete physical file from the server
        if (doc.type === 'file' && doc.content.startsWith('http')) {
          const filename = doc.content.split('/').pop();
          const filePath = path.join(__dirname, 'uploads', filename);
          
          fs.unlink(filePath, (err) => {
            if (err && err.code !== 'ENOENT') {
              console.error(`Failed to delete file: ${filename}`);
            }
          });
        }
        
        // 2. Soft-Delete in Database (Keep for Dashboard History)
        doc.status = 'expired';
        doc.content = 'Deleted automatically due to expiration';
        await doc.save();
      }
    }
  } catch (err) {
    console.error('Cleanup job error:', err);
  }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));