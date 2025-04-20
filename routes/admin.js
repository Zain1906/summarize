import express from 'express';
import Document from '../models/Document.js';
import { auth, admin } from '../middleware/auth.js';
import multer from 'multer';
import Summary from '../models/Summary.js';
import User from '../models/User.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument } from 'pdf-lib';
import { dirname } from 'path';
import mongoose from 'mongoose';

const router = express.Router();

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure multer for file upload to the 'summaries' directory
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'summaries')); // Use the new directory
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname); // Create a unique filename
  }
});

const upload = multer({ storage: storage }); // Initialize multer with the new storage configuration

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get all documents (admin only)
router.get('/documents', auth, isAdmin, async (req, res) => {
  try {
    const documents = await Document.find({ userId: { $ne: null } })
      .populate('userId', 'firstName lastName email')
      .sort({ uploadDate: -1 });
    console.log(documents);
    
    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Download document (admin only)
router.get('/documents/:id/download', auth, isAdmin, async (req, res) => {
  try {
    console.log("Working! Download")
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    res.download(document.filePath, document.originalName);
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a user
router.delete('/:id', auth, isAdmin, async (req, res) => {
  console.log(req.params.id);
  const session = await mongoose.startSession();  // Start a transaction
  session.startTransaction();
  try {
    const user = await User.findById(req.params.id).session(session);
    console.log(user);
    if (!user) {
      await session.abortTransaction();  // Abort transaction if user not found
      session.endSession();
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete all documents associated with the user
    const document = await Document.deleteMany({ userId: req.params.id }).session(session);
    console.log(document);

    // Delete the user
    await User.findByIdAndDelete(req.params.id, { session: session });

    await session.commitTransaction();  // Commit the transaction
    session.endSession();
    res.json({ message: 'User and all associated documents deleted' });
  } catch (error) {
    await session.abortTransaction();  // Abort the transaction on error
    session.endSession();
    console.log("Issues:", error);
    res.status(500).json({ message: error.message });
  }
});


// Admin upload summary route
router.post('/upload-summary', auth, isAdmin, upload.single('summary'), async (req, res) => {
  console.log('Received body:', req.body); // Log the incoming request body
  console.log('Received file:', req.file); // Log the uploaded file

  // const { userId } = req.body._id; // Get the user ID from the request body
  const userId = req.body["_id"];
  // console.log(id);

  try {
    // Check if the file was uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Validate userId
    const userExists = await User.findById(userId);
    if (!userExists) {
      return res.status(400).json({ message: 'User not found' });
    }
    const file = req.file;
      let pageCount = 0;

      // Determine file type and count pages if it's a PDF
      if (file.mimetype === 'application/pdf') {
        try {
          const fileBuffer = fs.readFileSync(file.path);
          const pdfDoc = await PDFDocument.load(fileBuffer);
          pageCount = pdfDoc.getPageCount();
        } catch (pdfError) {
          console.error('Error processing PDF:', pdfError);
        }
      }
    

    const summary = new Summary({
      userId: userId, // Associate with the specific user
      fileName: req.file.filename,
      originalName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      filePath: req.file.path,
      pageCount: pageCount,
      uploadDate: new Date()

    });

    await summary.save();
    res.status(201).json({ message: 'Summary uploaded successfully', summary });
  } catch (error) {
    console.error('Error uploading summary:', error); // Log the error for debugging
    res.status(500).json({ message: 'Error uploading summary', error: error.message }); // Send error message
  }
});

const summariesDir = path.join(__dirname, 'summaries');

if (!fs.existsSync(summariesDir)) {
  fs.mkdirSync(summariesDir);
}

export default router; 