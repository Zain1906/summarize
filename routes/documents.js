import express from 'express';
import Document from '../models/Document.js'; // Assuming you have a Document model
import { authenticate } from '../middleware/auth.js'; // Middleware to authenticate user

const router = express.Router();

// Get all documents for a specific user
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user._id; // Assuming you have user ID in req.user
    const documents = await Document.find({ userId }); // Fetch documents for the user
    res.status(200).json(documents);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching documents' });
  }
});

router.delete('/documents/:id', authenticate, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Delete the file from the filesystem
    const filePath = path.join(__dirname, '..', 'uploads', document.fileName);
    fs.unlink(filePath, async (err) => {
      if (err) {
        return res.status(500).json({ message: 'Failed to delete the file', error: err });
      }

      // If file is successfully deleted from filesystem, delete the document from the database
      await Document.findByIdAndDelete(req.params.id);
      res.json({ message: 'Document and file successfully deleted' });
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router; 