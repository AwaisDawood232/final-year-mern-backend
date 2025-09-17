const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Admin = require("../models/adminModel");

dotenv.config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const existingAdmin = await Admin.findOne({ email: "admin@skillswap.com" });

    if (existingAdmin) {
      console.log("Super admin already exists");
      process.exit(0);
    }

    const superAdmin = await Admin.create({
      name: "Super Admin",
      email: "admin@skillswap.com",
      password: "admin123",
      role: "super_admin",
      isActive: true,
    });

    console.log("Super admin created successfully:");
    console.log("Email: admin@skillswap.com");
    console.log("Password: admin123");
    console.log("Role: super_admin");
    console.log("\nPlease change the password after first login!");

    process.exit(0);
  } catch (error) {
    console.error("Error seeding admin:", error);
    process.exit(1);
  }
};

seedAdmin();