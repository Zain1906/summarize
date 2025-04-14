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

// Get all users
router.get('/', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:summaryId', auth, async (req, res) => {
  try {
    const summaryId = req.params.summaryId;
    await Summary.findByIdAndDelete(summaryId);
    res.json({ message: 'Summary deleted successfully' });
  } catch (error) {
    console.error('Error deleting summary:', error);
    res.status(500).json({ message: 'Error deleting summary' });
  }
});

// Get summaries for the authenticated user
router.get('/summaries', auth, async (req, res) => {
  try {
    console.log(`user-id: ${req.user._id}`)
    const summaries = await Summary.find({ userId: req.user._id }); // Fetch summaries for the logged-in user
    console.log(summaries);
    res.status(200).json(summaries);
  } catch (error) {
    console.error('Error fetching summaries:', error);
    res.status(500).json({ message: 'Error fetching summaries' });
  }
});
router.get('/summaries/:userId', auth, async (req, res) => {
  try {
    console.log(`user-id: ${req.params.userId}`)
    const summaries = await Summary.find({ userId: req.params.userId }); // Fetch summaries for the logged-in user
    console.log(summaries);
    res.status(200).json(summaries);
  } catch (error) {
    console.error('Error fetching summaries:', error);
    res.status(500).json({ message: 'Error fetching summaries' });
  }
});

router.get('/:fileId/download', async (req, res) => {
  try {
    const document = await Summary.findById(req.params.fileId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    res.download(document.filePath, document.originalName); // Send the file for download
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ message: 'Error downloading document' });
  }
});

export default router; 