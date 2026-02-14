const admin = require('firebase-admin');
const path = require('path');

let bucket = null;

try {
  // Try to load the service account key
  const serviceAccount = require(path.join(__dirname, '../serviceAccountKey.json'));
  
  // Initialize Firebase
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_BUCKET_URL
  });
  
  // Only define bucket if initialization worked
  bucket = admin.storage().bucket();
  console.log(" Firebase Admin Initialized");

} catch (error) {
  // If the file is missing or invalid, we just log a warning and keep the server running
  console.warn(" Firebase Warning: serviceAccountKey.json not found or invalid.");
  console.warn(" File uploads will be disabled, but Text uploads will work.");
}

module.exports = bucket;