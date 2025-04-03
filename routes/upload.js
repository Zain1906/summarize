import express from 'express';
import multer from 'multer';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import { auth } from '../middleware/auth.js';
import Document from '../models/Document.js';


const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Ensure this directory exists
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

router.post('/', auth, upload.array('files'), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      console.error('No files uploaded');
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const userId = req.user._id;
    if (!userId) {
      console.error('User ID is not available');
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const uploadedFiles = req.files;
    const savedDocuments = [];

    for (const file of uploadedFiles) {
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

      const document = new Document({
        userId: userId,
        fileName: file.filename,
        originalName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        filePath: file.path,
        pageCount: pageCount,
        uploadDate: new Date()
      });

      try {
        const savedDocument = await document.save();
        savedDocuments.push(savedDocument);
      } catch (dbError) {
        console.error('Database save error:', dbError);
        return res.status(500).json({ message: 'Error saving document to database', error: dbError.message });
      }
    }

    res.status(200).json({
      message: 'Files uploaded successfully',
      documents: savedDocuments
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Error uploading files', error: error.message });
  }
});

// Get all documents for a specific user by user ID
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user._id; // Assuming you have user ID in req.user
    console.log(userId)
    const documents = await Document.find({ userId }); // Fetch documents for the user
    res.status(200).json(documents);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching documents' });
  }
});

// Get documents for a specific user by user ID (this route can be used for the ManageUsers component)
router.get('/:userId', async (req, res) => {
  try {
    const files = await Document.find({ userId: req.params.userId });
    res.json(files.map(file => ({
      id: file._id,
      name: file.originalName, // Include original name
      uploadTime: file.uploadDate // Include upload time
    })));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching files' });
  }
});

// Delete a specific file
router.delete('/:fileId', async (req, res) => {
  try {
    await Document.findByIdAndDelete(req.params.fileId);
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting file' });
  }
});


export default router;
