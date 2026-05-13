const mongoose = require("mongoose");

// Utility function to format date as dd-mm-yyyy
const formatDate = (date) => {
  const day = String(date.getDate()).padStart(2, '0'); // Ensure two digits
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

const fileSchema = mongoose.Schema({
  fileName: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  encryption: {
    type: Boolean,
    default: false,
  },
  passcode: {
    type: String, 
  },
  iv: {
    type: String, // Base64 Initialization Vector for AES-GCM
  },
  salt: {
    type: String, // Base64 Salt for PBKDF2
  },
  shareable: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: String, // Change type to String to store formatted date
  },
  updatedAt: {
    type: String, // Change type to String to store formatted date
  },
  isPinned: {
    type: Boolean,
    default: false,
  },
  isArchived: {
    type: Boolean,
    default: false,
  },
  sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
});

// Pre-save hook to format dates
fileSchema.pre("save", function (next) {
  const now = new Date();
  this.createdAt = this.createdAt || formatDate(now); // Set createdAt only if not already set
  this.updatedAt = formatDate(now); // Always update updatedAt
  next();
});

module.exports = mongoose.model("file", fileSchema);
