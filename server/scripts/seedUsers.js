/**
 * Seed Users Script
 *
 * Creates initial users (1 admin + 1 member) if database is empty
 *
 * Usage: node scripts/seedUsers.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/user");

const DB = process.env.DB_STRING || "mongodb://localhost:27017/musicapp";

async function seedUsers() {
  try {
    await mongoose.connect(DB);
    console.log("✅ Connected to MongoDB");

    // Check if users already exist
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log(`⚠️  Database already has ${userCount} users. Skipping seed.`);
      process.exit(0);
    }

    // Create admin user
    try {
      const admin = await User.create({
        name: "Admin User",
        email: "admin@musicapp.com",
        password: "admin123",
        role: "admin",
        imageURL: ""
      });

      console.log(`🔐 Admin created:
   Email: ${admin.email}
   Password: admin123
   Role: ${admin.role}`);
    } catch (adminErr) {
      console.error("❌ Failed to create admin:", adminErr.message);
      throw adminErr;
    }

    // Create member user
    try {
      const member = await User.create({
        name: "Member User",
        email: "member@musicapp.com",
        password: "member123",
        role: "member",
        imageURL: ""
      });

      console.log(`👤 Member created:
   Email: ${member.email}
   Password: member123
   Role: ${member.role}`);
    } catch (memberErr) {
      console.error("❌ Failed to create member:", memberErr.message);
      throw memberErr;
    }

    console.log("\n🎉 Seed complete!");
    console.log(`   Total users: 2`);

    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
    console.error(err);
    process.exit(1);
  }
}

seedUsers();
