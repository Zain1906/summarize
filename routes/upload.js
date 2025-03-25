import express from 'express';
import multer from 'multer';
// import path from 'path';
import { auth } from '../middleware/auth.js';
import Document from '../models/Document.js';

const router = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Ensure this directory exists
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Upload route
router.post('/', auth, upload.array('files'), async (req, res) => {
  try {
    console.log('Received files:', req.files); // Log received files
    console.log('Authenticated user:', req.user); // Log the authenticated user

    if (!req.files || req.files.length === 0) {
      console.error('No files uploaded');
      return res.status(400).json({ message: 'No files uploaded' });
    }

    // Access userId correctly
    const userId = req.user._id; // Change this line

    if (!userId) {
      console.error('User ID is not available');
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const uploadedFiles = req.files;
    const savedDocuments = [];

    for (const file of uploadedFiles) {
      const document = new Document({
        userId: userId, // Use the correct userId
        fileName: file.filename,
        originalName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        filePath: file.path,
        pageCount: 0, // Set to 0 since we're not counting pages
        uploadDate: new Date()
      });

      try {
        const savedDocument = await document.save();
        savedDocuments.push(savedDocument);
      } catch (dbError) {
        console.error('Database save error:', dbError); // Log database error
        return res.status(500).json({ message: 'Error saving document to database', error: dbError.message });
      }
    }

    console.log('Documents saved:', savedDocuments); // Log saved documents
    res.status(200).json({
      message: 'Files uploaded successfully',
      documents: savedDocuments
    });
  } catch (error) {
    console.error('Upload error:', error); // Log the error
    res.status(500).json({ message: 'Error uploading files', error: error.message });
  }
});

export default router; 