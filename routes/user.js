import express from 'express';
import Summary from '../models/Summary.js';
import { auth } from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

// Get summaries for a specific user
router.get('/summaries/:userId', auth, async (req, res) => {
  try {
    const summaries = await Summary.find({ userId: req.params.userId });
    res.status(200).json(summaries);
  } catch (error) {
    console.error('Error fetching summaries:', error);
    res.status(500).json({ message: 'Error fetching summaries' });
  }
});

// Get all users with role 'user'
router.get('/', auth, async (req, res) => {
  try {
    const users = await User.find({ role: 'user' }); // Filter by role
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// Get summaries for the authenticated user
router.get('/summaries', auth, async (req, res) => {
  try {
    console.log(`user-id: ${req.user._id}`)
    const summaries = await Summary.find({ userId: req.user._id }); // Fetch summaries for the logged-in user
    res.status(200).json(summaries);
  } catch (error) {
    console.error('Error fetching summaries:', error);
    res.status(500).json({ message: 'Error fetching summaries' });
  }
});

export default router; 