import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js'; // Ensure correct file extension
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, speciality, email, password } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({
        message: 'User already exists',
        errors: [{
          field: 'email',
          message: 'This email is already registered'
        }]
      });
    }

    // Validate fields
    if (!firstName || !lastName || !speciality || !email || !password) {
      const errors = [];
      if (!firstName) errors.push({ field: 'firstName', message: 'First name is required' });
      if (!lastName) errors.push({ field: 'lastName', message: 'Last name is required' });
      if (!speciality) errors.push({ field: 'speciality', message: 'Speciality is required' });
      if (!email) errors.push({ field: 'email', message: 'Email is required' });
      if (!password) errors.push({ field: 'password', message: 'Password is required' });

      return res.status(400).json({
        message: 'Validation failed',
        errors
      });
    }

    // Create new user with explicit role
    user = new User({
      firstName,
      lastName,
      speciality,
      email,
      password,
      role: 'user'  // Explicitly set the role
    });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // Save user
    await user.save();

    // Create JWT token
    const payload = { 
      user: { 
        id: user.id,
        role: user.role  // Include role in token
      } 
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        speciality: user.speciality,
        role: user.role  // Include role in response
      }
    });
  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      return res.status(400).json({
        message: 'Duplicate email',
        code: 11000,
        errors: [{
          field: 'email',
          message: 'This email is already registered'
        }]
      });
    }
    res.status(500).json({
      message: 'Server error occurred during registration',
      errors: [{ field: 'general', message: 'An unexpected error occurred' }]
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(`🔍 Login attempt for email: ${email}`);

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      console.log("❌ User not found!");
      return res.status(401).json({ message: "Invalid email or password" });
    }

    console.log("✅ User found in database:", user);

    // Compare password
    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log("🔍 Password comparison result:", isValidPassword);

    if (!isValidPassword) {
      console.log("❌ Invalid password!");
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Generate JWT token with role
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    console.log("✅ Login successful! Token generated.");

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        speciality: user.speciality,
        role: user.role
      },
      redirectTo: user.role === 'admin' ? '/admin' : '/dashboard'
    });
  } catch (error) {
    console.error("🚨 Login error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
});

export default router;
