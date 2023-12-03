// Import necessary modules
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const fs = require("fs");
// Create Express app
const app = express();
const PORT = process.env.PORT || 3001;
const cors = require("cors");
const jsonFilePath = "./heliverse_mock_data.json";
const User = require("./Models/usermodel");
const Team = require("./Models/teammodel");
// Read data from JSON file
const rawData = fs.readFileSync(jsonFilePath);
const dataToInsert = JSON.parse(rawData);
// Connect to MongoDB
async function connecttodb() {
  const url = process.env.MONGO_DB;
  try {
    await mongoose.connect(url, {
      useUnifiedTopology: true,
      useNewUrlParser: true,
    });
    console.log("connected");
  } catch (error) {
    console.log("Not connected");
  }
}
connecttodb();
app.use(bodyParser.json());
app.use(cors());
if (User.find().countDocuments() === 0) {
  User.insertMany(dataToInsert);
}
// Routes

// GET all users with pagination support
app.get("/api/users", async (req, res) => {
  const page = parseInt(req?.query?.page) || 1;
  const limit = parseInt(req?.query?.limit) || 20;
  const domain = req?.query?.domain;
  const available = req?.query?.available;
  const gender = req?.query?.gender;
  const search = req?.query?.search;
  try {
    const query = {};
    if (domain) query.domain = domain;
    if (gender) query.gender = gender;
    if (available !== undefined) {
      if (available === "true") query.available = true;
      else if (available === "false") query.available = false;
    }
    if (search) {
      const arr = search.split(" ");
      const searchRegexfirstname = new RegExp(arr[0], "i");
      const searchRegexlastname = new RegExp(arr[1], "i");
      query.$and = [
        { first_name: searchRegexfirstname },
        { last_name: searchRegexlastname },
      ];
    }
    const users = await User.find(query)
      .skip((page - 1) * limit)
      .limit(limit);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET a specific user by ID
app.get("/api/users/:id", async (req, res) => {
  const userId = req.params.id;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST to create a new user
app.post("/api/users", async (req, res) => {
  const {
    id,
    first_name,
    last_name,
    email,
    gender,
    avatar,
    domain,
    available,
  } = req.body;

  try {
    const newUser = new User({
      id,
      first_name,
      last_name,
      email,
      gender,
      avatar,
      domain,
      available,
    });
    await newUser.save();
    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PUT to update an existing user
app.put("/api/users/:id", async (req, res) => {
  const userId = req.params.id;
  const {
    id,
    first_name,
    last_name,
    email,
    gender,
    avatar,
    domain,
    available,
  } = req.body;
  try {
    const updatedUser = await User.findOneAndUpdate(
      { id: userId },
      { id, first_name, last_name, email, gender, avatar, domain, available }
    );
    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE to delete a user
app.delete("/api/users/:id", async (req, res) => {
  const userId = req.params.id;

  try {
    const deletedUser = await User.findOneAndDelete({ id: userId });
    if (!deletedUser) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(deletedUser);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});
// Endpoint for selecting a team
app.post("/api/team", async (req, res) => {
  try {
    const { name, memberEmails } = req.body;

    // Validate that memberEmails is an array of strings
    if (
      !Array.isArray(memberEmails) ||
      !memberEmails.every((email) => typeof email === "string")
    ) {
      return res.status(400).json({ error: "Invalid memberEmails format" });
    }

    // Find unique users with matching domains and availability set to true
    const uniqueUsers = await User.aggregate([
      { $match: { email: { $in: memberEmails }, available: true } }, // Match users with provided emails and availability true
      { $group: { _id: "$domain", users: { $push: "$$ROOT" } } }, // Group users by domain
    ]);
    // Create a new team with the selected members
    const newTeam = new Team({
      name,
      members: uniqueUsers.map((domainUsers) => domainUsers.users[0]),
    });

    // Save the new team to the database
    await newTeam.save();

    // Respond with the newly created team
    res.status(201).json(newTeam);
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
// Retrieve the details of all team
app.get("/api/team", async (req, res) => {
  try {
    const team = await Team.find();
    res.json(team);
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
// Retrieve the details of a specific team by Id
app.get("/api/team/:id", async (req, res) => {
  try {
    const teamId = req.params.id;

    const team = await Team.findById(teamId);

    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }
    res.json(team);
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
