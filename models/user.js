const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  // Prevent duplicate connections in dev environment
  if (mongoose.connections[0].readyState) return;
  
  // Guard against missing Environment Variables which causes crashes
  if (!process.env.MONGO_URI) {
    console.error("CRITICAL: MONGO_URI missing from Environment Variables!");
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB securely connected.");
  } catch (err) {
    console.error("MongoDB Connection Error: ", err);
  }
};

connectDB();

// Subschema for shared files
const sharedFileSchema = mongoose.Schema({
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "userfile",
  },
  email: {
    type: String,
  },
  expiry: {
    type: Date,
  }
}, { _id: false }); // Disable _id for sharedFiles

// Main user schema
const userSchema = mongoose.Schema({
  email: {
    type: String,
    unique: true,
    required: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, 
  },
  password: String,
  sharedFiles: [sharedFileSchema] // Use the sharedFileSchema here
});

module.exports = mongoose.model("user", userSchema);
