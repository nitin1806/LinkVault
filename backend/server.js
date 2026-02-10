require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');     // Import Cron
const fs = require('fs');              // Import File System
const connectDB = require('./config/db');
const apiRoutes = require('./routes/apiRoutes');
const Upload = require('./models/Upload');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve Static Files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database
connectDB();

// Routes
app.use('/api', apiRoutes);

// --- BACKGROUND JOB: CLEANUP EXPIRED FILES ---
// Runs every minute ('* * * * *')
cron.schedule('* * * * *', async () => {
  console.log('🧹 Running cleanup job...');
  
  try {
    const now = new Date();
    
    // 1. Find all documents that have expired
    const expiredDocs = await Upload.find({ expireAt: { $lt: now } });
    
    if (expiredDocs.length > 0) {
      console.log(`Found ${expiredDocs.length} expired items. Deleting...`);
      
      for (const doc of expiredDocs) {
        // 2. If it's a file, delete it from disk
        if (doc.type === 'file') {
          // Extract filename from the URL we stored
          const filename = doc.content.split('/').pop();
          const filePath = path.join(__dirname, 'uploads', filename);
          
          fs.unlink(filePath, (err) => {
            if (err) console.error(`Failed to delete file: ${filePath}`, err.message);
            else console.log(`Deleted file: ${filename}`);
          });
        }
        
        // 3. Delete the document from MongoDB
        await Upload.deleteOne({ _id: doc._id });
      }
    }
  } catch (err) {
    console.error('Cleanup job error:', err);
  }
});
// ---------------------------------------------

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));