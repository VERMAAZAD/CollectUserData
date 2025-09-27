const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const dns = require("dns").promises;

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

// --- Email validation helpers ---
function isValidEmailFormat(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

async function hasMxRecord(email) {
  try {
    const domain = email.split("@")[1];
    const records = await dns.resolveMx(domain);
    return records && records.length > 0;
  } catch {
    return false;
  }
}

// Optional: basic disposable domain list (expand as needed)
const disposableDomains = ["tempmail.com", "10minutemail.com", "mailinator.com"];
function isDisposable(email) {
  const domain = email.split("@")[1];
  return disposableDomains.includes(domain);
}

// API to save user
app.post("/api/subscribe", async (req, res) => {
  try {
    const { name, email } = req.body;
    const landingPageUrl = req.headers["referer"] || "unknown";

    if (!name || !email) {
      return res.status(400).json({ success: false, message: "Name and email are required" });
    }
    

    
    // 1) Check email format
    if (!isValidEmailFormat(email)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email format" });
    }

    // 2) Check disposable domain
    if (isDisposable(email)) {
      return res
        .status(400)
        .json({ success: false, message: "Disposable emails not allowed" });
    }

    // 3) Check MX record
    const mxValid = await hasMxRecord(email);
    if (!mxValid) {
      return res
        .status(400)
        .json({ success: false, message: "Email domain not valid" });
    }



     // check if email already exists
    const existingUser = await CollectUserData.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email already subscribed!" });
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
