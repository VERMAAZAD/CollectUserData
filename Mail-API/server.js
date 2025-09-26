const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");

require('dotenv').config();
// Init
const app = express();
app.use(cors());
app.use(bodyParser.json());

// MongoDB connection
const mongo_URL = process.env.MONGO_CONN;

mongoose.connect(mongo_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("MongoDB Connected"))
.catch(err => console.error("MongoDB Error:", err));

// Schema
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  landingPageUrl: String,
  createdAt: { type: Date, default: Date.now }
});

const CollectUserData = mongoose.model("CollectUserData", userSchema);

// API to save user
app.post("/api/subscribe", async (req, res) => {
  try {
    const { name, email } = req.body;
    const landingPageUrl = req.headers["referer"] || "unknown";

    if (!name || !email) {
      return res.status(400).json({ success: false, message: "Name and email are required" });
    }

    const newUser = new CollectUserData({ name, email, landingPageUrl });
    await newUser.save();

    res.json({ success: true, message: "User saved successfully!" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API to get all users
app.get("/api/users", async (req, res) => {
  try {
    const users = await CollectUserData.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
