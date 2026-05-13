const express = require("express");
const app = express();
const path = require("path");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const userModel = require("./models/user");
const userFile = require("./models/file")
const authenticate = require('./middleware/authenticate');
require('dotenv').config();


// Middleware for parsing JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure CORS
const allowedOrigins = [
  "http://localhost:5173",
  "https://secure-notebook.vercel.app",
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true, // Allow cookies to be sent
  })
);

// Middleware for cookies
app.use(cookieParser());

// Registration Route
app.post("/api/register", async (req, res) => {
  let { email, password } = req.body;

  try {
    // Check if the user already exists
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(400).send({ error: "Email already exists. Please use another email." });
    }

    // Generate salt and hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create the user in the database
    const createdUser = await userModel.create({
      email,
      password: hashedPassword,
    });

    // Generate JWT token
    const token = jwt.sign({ email }, process.env.JWT_SECRET || "shhhhh");

    // Set a secure HTTP-only cookie
    res.cookie("token", token, { httpOnly: true, secure: true, sameSite: "None" });

    // Send success response
    res.status(201).send({ message: "User registered successfully", user: createdUser });
  } catch (error) {
    if (error.code === 11000) {
      // Handle duplicate key error
      res.status(400).send({ error: "Email already exists. Please use another email." });
    } else {
      // Handle other server errors
      res.status(500).send({ error: "Internal server error", details: error.message });
    }
  }
});


// Login Route
app.post("/api/login", async (req, res) => {
  let user = await userModel.findOne({ email: req.body.email });

  if (!user) return res.status(404).send("User not found");

  bcrypt.compare(req.body.password, user.password, (err, result) => {
    if (err) console.error("Error comparing passwords:", err);

    if (result) {
      let token = jwt.sign({ email: user.email }, process.env.JWT_SECRET || "shhhhh");
      res.cookie("token", token, { httpOnly: true, secure: true, sameSite: "None" });
      res.send("logged in");
    } else {
      res.status(401).send("Invalid credentials");
    }
  });
});


// Example of verifying the token on the backend
app.get('/api/verify-token', (req, res) => {
  const token = req.cookies.token; // Assuming the token is stored in cookies

  if (!token) {
    return res.status(401).send('Not authenticated');
  }

  try {
    // Verify the token 
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "shhhhh"); 
    res.status(200).send('Authenticated'); // Token is valid
  } catch (error) {
    res.status(401).send('Invalid token'); // Token is invalid or expired
  }
});


app.get("/api/logout", function(req,res){
  res.cookie("token"," "); 
  res.send("Logged out")
})


app.get("/api/files", authenticate, async (req, res) => {
  try {
    // Fetch files associated with the authenticated user
    const files = await userFile.find({ userId: req.userId });

    // If no files are found, return an empty array
    if (!files || files.length === 0) {
      return res.status(200).json([]);
    }

    // Add the encryption status to each file (assuming the `encrypted` field exists in the model)
    const filesWithStatus = files.map(file => ({
      ...file.toObject(),
      encrypted: file.encryption || false, // Default to false if encrypted field is missing
    }));

    // Send the files with encryption status
    res.status(200).json(filesWithStatus);
  } catch (error) {
    console.error("Error fetching files:", error);
    res.status(500).json({ error: "Error fetching files" });
  }
});

app.get('/api/files/:fileId', async (req, res) => {
  const { fileId } = req.params;

  // Find the file by ID in the mock database
  const file = await userFile.findById(fileId);

  if (file) {
    // If the file is found, return it as a JSON response
    res.json(file);
  } else {
    // If no file is found, return a 404 error
    res.status(404).json({ message: "File not found" });
  }
});




// File upload route
app.post("/api/upload", authenticate, async (req, res) => {
  try {
    const { fileName, content, encryption, shareable, iv, salt } = req.body;

    // Create a new file object with all necessary fields
    const newFile = new userFile({
      fileName,
      content, // This will be Base64 ciphertext if encrypted
      userId: req.userId,
      encryption,
      shareable: shareable !== undefined ? shareable : true,
      passcode: "", // Deprecated server-side passcode
      iv: encryption ? iv : undefined,
      salt: encryption ? salt : undefined,
      DateCreated: new Date(), // Current timestamp
    });

    // Save the file to the database
    await newFile.save();

    // Send success response
    res.status(201).json({ message: "File uploaded successfully", fileId: newFile._id });

  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({ error: "Error uploading file" });
  }
});


// Get all users
app.get("/api/users", authenticate, async (req, res) => {
  try {
    const users = await userModel.find({}, 'email'); // Fetch all users and only return the email field
    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Error fetching users" });
  }
});

app.post('/api/shareFile', async (req, res) => {
  const { fileId, email, senderEmail } = req.body; // Add senderEmail to destructuring

  try {
    // Find the user by email
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find the file
    const file = await userFile.findById(fileId);
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    // Add user ID to the sharedWith array if not already shared
    if (!file.sharedWith.includes(user._id)) {
      file.sharedWith.push(user._id);
      await file.save();
    }

    // Check if the file is already in the user's sharedFiles array
    const fileAlreadyShared = user.sharedFiles.some(
      (sharedFile) => sharedFile.fileId.toString() === fileId.toString()
    );

    if (!fileAlreadyShared) {
      // Add the file to sharedFiles with additional information
      const currentTime = new Date();
      const expiryTime = new Date(currentTime.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

      user.sharedFiles.push({
        fileId,
        email: senderEmail, // Store senderEmail here
        expiry: expiryTime,
      });

      await user.save();
    }

    res.status(200).json({ success: true, message: "File shared successfully" });
  } catch (error) {
    console.error("Error sharing file:", error);
    res.status(500).json({ message: "Server error" });
  }
});



// Route to fetch shared files for the authenticated user
app.get('/api/shared-files', authenticate, async (req, res) => {
  try {
    // Fetch the authenticated user by userId (ensure userId is part of req.userId)
    const user = await userModel.findById(req.userId);

    // If the user is not found or there are no shared files
    if (!user || !user.sharedFiles || user.sharedFiles.length === 0) {
      return res.status(200).json([]);
    }

    // Extract all fileIds from the sharedFiles array
    const fileIds = user.sharedFiles.map((sharedFile) => sharedFile.fileId);

    // Find all files with matching IDs
    const files = await userFile.find({ _id: { $in: fileIds } });

    // If no files are found
    if (!files || files.length === 0) {
      return res.status(404).json({ message: "No shared files found" });
    }

    // Map over the files and include expiry time
    const filesWithStatus = files.map((file) => {
      const sharedFile = user.sharedFiles.find(
        (shared) => shared.fileId.toString() === file._id.toString()
      );
      return {
        ...file.toObject(),
        expiry: sharedFile ? sharedFile.expiry : null, // Add expiry time if exists
        email: sharedFile.email // Include the email of the user who shared the file
      };
    });

    res.status(200).json(filesWithStatus);
  } catch (error) {
    console.error("Error fetching shared files:", error);
    res.status(500).json({ error: "Error fetching shared files" });
  }
});

// Function to clean expired shared files
const cleanExpiredSharedFiles = async () => {
  try {
    const users = await userModel.find(); // Get all users

    for (let user of users) {
      const currentTime = new Date();
      
      // Create a new array by filtering out expired files
      const updatedSharedFiles = user.sharedFiles.filter(sharedFile => {
        // Ensure expiry is a Date object and compare it with current time
        return new Date(sharedFile.expiry) > currentTime;
      });

      // Check if the sharedFiles array was modified (i.e., if files were expired and removed)
      if (updatedSharedFiles.length !== user.sharedFiles.length) {
        console.log(`User ${user.email}: Expired files removed.`); // Log the cleanup
        
        // Replace the old sharedFiles with the updated one (without expired files)
        user.sharedFiles = updatedSharedFiles;

        // Mark the document as modified to ensure mongoose saves it
        await user.save();
      }
    }
  } catch (error) {
    console.error("Error cleaning expired files:", error);
  }
};

// Run cleanup every hour (3,600,000 milliseconds) instead of every 100ms
const interval = 1000 * 60 * 60; 
setInterval(() => {
  cleanExpiredSharedFiles(); // Call cleanup function
}, interval);

// Optionally, you can call cleanExpiredSharedFiles once immediately when the app starts.
cleanExpiredSharedFiles();

app.get('/api/notes/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const note = await userFile.findById(fileId);

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    // Remove the passcode field if encryption is enabled
    const responseNote = { ...note._doc };
    if (note.encryption) {
      delete responseNote.passcode;
    }

    res.json(responseNote);
  } catch (error) {
    console.error("Error fetching note:", error);
    res.status(500).json({ message: "An error occurred while fetching the note" });
  }
});


// Update a specific note by ID
app.put('/api/notes/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const { fileName, content, encryption, shareable, iv, salt } = req.body;

    const updateFields = { fileName, content, encryption, shareable };
    if (encryption) {
        updateFields.iv = iv;
        updateFields.salt = salt;
        updateFields.passcode = ""; // Clear out old passcode
    }

    const updatedNote = await userFile.findByIdAndUpdate(
      fileId,
      updateFields, // Update the fields
      { new: true } // Return the updated note
    );

    if (!updatedNote) {
      return res.status(404).json({ message: "Note not found" });
    }

    res.json({ message: "Note updated successfully", note: updatedNote });
  } catch (error) {
    console.error("Error updating note:", error);
    res.status(500).json({ message: "An error occurred while updating the note" });
  }
});

// Toggle Pinned / Archived states safely
app.patch('/api/notes/:fileId/toggle', authenticate, async (req, res) => {
  try {
    const { fileId } = req.params;
    const { isPinned, isArchived } = req.body;
    
    let updateFields = {};
    if (isPinned !== undefined) updateFields.isPinned = isPinned;
    if (isArchived !== undefined) updateFields.isArchived = isArchived;

    const updatedNote = await userFile.findOneAndUpdate(
      { _id: fileId, userId: req.userId }, // Ensure ownership
      { $set: updateFields },
      { new: true }
    );

    if (!updatedNote) {
      return res.status(404).json({ message: "Note not found or unauthorized to toggle" });
    }

    res.json({ message: "Note state toggled successfully", note: updatedNote });
  } catch (error) {
    console.error("Error toggling note state:", error);
    res.status(500).json({ message: "An error occurred while toggling the note" });
  }
});



app.delete('/api/files/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    // Delete file logic, e.g., from a database
    const result = await userFile.findByIdAndDelete(fileId);
    if (!result) {
      return res.status(404).json({ error: "File not found" });
    }
    res.status(200).json({ message: "File deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "An error occurred while deleting the file" });
  }
});




app.get('/api/current-user', authenticate, async (req, res) => {
  try {
    const user = await userModel.findById(req.userId).select('-password'); // Exclude password
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user); // Send user data to the frontend
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// // Serve static files from React build
// app.use(express.static(path.join(__dirname, "../frontend/dist")));

// // Serve React app for all routes
// app.get("*", (req, res) => {
//   res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
// });

// Start the server
const port = process.env.PORT || 5050;
const corsOrigin = process.env.FRONTEND_URL || "http://localhost:5173";

// Dedicated Endpoint for cron-job.org to prevent Render from sleeping
app.get("/api/ping", (req, res) => {
  res.status(200).send("Server is awake");
});

app.listen(port, () => {
  console.log(`Backend server running on port ${port}`);
  console.log(`CORS allowed origin: ${corsOrigin}`);
});