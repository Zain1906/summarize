import express from 'express';
import Summary from '../models/Summary.js';
import { auth } from '../middleware/auth.js';
import User from '../models/User.js';
import fs from 'fs';
import path from 'path';
// import pdfParse from 'pdf-parse';
import { fileURLToPath } from 'url';
import { extractPdfText } from '../utils/pdfExtract.js';
import { formatExtractedText } from '../utils/formatSummary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


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
    // console.log(`user-id: ${req.user._id}`)
    const summaries = await Summary.find({ userId: req.user._id }); // Fetch summaries for the logged-in user
    // console.log(summaries);
    res.status(200).json(summaries);
  } catch (error) {
    console.error('Error fetching summaries:', error);
    res.status(500).json({ message: 'Error fetching summaries' });
  }
});
router.get('/summaries/:userId', auth, async (req, res) => {
  try {
    // console.log(`user-id: ${req.params.userId}`)
    const summaries = await Summary.find({ userId: req.params.userId }); // Fetch summaries for the logged-in user
    // console.log(summaries);
    res.status(200).json(summaries);
  } catch (error) {
    console.error('Error fetching summaries:', error);
    res.status(500).json({ message: 'Error fetching summaries' });
  }
});
router.get('/summary/:summaryId', auth, async (req, res) => {
  try {
    // console.log(user-id: ${req.params.userId})
    const summary = await Summary.findById(req.params.summaryId);
    // Fetch summaries for the logged-in user
    console.log(summary);
    // console.log('Summary Metadata Response:', res.data);
    res.status(200).json(summary);
  } catch (error) {
    console.error('Error fetching summaries:', error);
    res.status(500).json({ message: 'Error fetching summaries' });
  }
});

// import fs from 'fs';
// import pdfParse from 'pdf-parse';
// import path from 'path';
// import { fileURLToPath } from 'url';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);



router.post('/extract-text', async (req, res) => {
  try {
    console.log("Extraction-text");

    // Step 1: Get and sanitize file name
    const safeFileName = path.basename(req.body.filePath);
    console.log("Received filePath from client:", req.body.filePath);
    console.log("Sanitized safeFileName:", safeFileName);

    // Step 2: Clean and prepare for fuzzy matching
    const requestedName = safeFileName
      .replace(/\.pdf$/i, '')  // remove ".pdf"
      .trim()
      .toLowerCase();

    const summariesDir = path.join(__dirname, 'summaries');
    const allFiles = fs.readdirSync(summariesDir);

    // Step 3: Try to find the closest match in the folder
    const matchedFile = allFiles.find(file =>
      file.toLowerCase().includes(requestedName)
    );

    if (!matchedFile) {
      return res.status(404).json({ message: 'File not found in summaries folder' });
    }

    const filePath = path.join(summariesDir, matchedFile);
    console.log("Matched file path:", filePath);

    // Step 4: Extract PDF text
    const rawText = await extractPdfText(filePath);

    // Step 5: Parse the "Detailed Matching Report" section
    const referenceMap = {};
    const matchSection = rawText.split('## Detailed Matching Report')[1]?.split('## Summary Table')[0] || '';
    const matchLines = matchSection.split('\n').map(line => line.trim()).filter(Boolean);

    let currentFile = '';

    for (const line of matchLines) {
      const filenameMatch = line.match(/^###\s+\d+\.\s+(.*?)\s*\((\d+)\s+pages\)/i);
      if (filenameMatch) {
        currentFile = filenameMatch[1].trim().replace(/ /g, '_');
        continue;
      }

      const referenceMatch = line.match(/SIBTF\s*-\s*SIF\d+\s*-\s*([A-Z])/g);
      if (referenceMatch && currentFile) {
        for (const ref of referenceMatch) {
          const cleanedRef = ref.trim();
          referenceMap[cleanedRef] = currentFile;
        }
      }
    }

    // Step 6: Format and send back response
    const formattedText = formatExtractedText(rawText, referenceMap);
    res.json({ text: formattedText });

  } catch (err) {
    console.error('Error extracting text:', err);
    res.status(500).json({ message: 'Failed to extract PDF text.' });
  }
});




router.get('/:fileId/download', async (req, res) => {
  try {
    console.log("Downloading")
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

router.get('/preview/:filename', async (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, '../uploads');

    // Step 1: Clean up the requested filename
    let requestedName = req.params.filename
      .replace(/_/g, ' ')                // Underscores to spaces
      .replace(/\.pdf$/i, '')            // Remove `.pdf`
      .trim();                           // Trim any whitespace

    console.log('Requested name:', requestedName);

    // Step 2: Read all files and find one that includes the requested name
    const files = fs.readdirSync(uploadsDir);
    const matchedFile = files.find(file =>
      file.toLowerCase().includes(requestedName.toLowerCase())
    );

    if (!matchedFile) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Step 3: Return it as an inline preview
    const filePath = path.join(uploadsDir, matchedFile);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${matchedFile}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error('Error previewing file:', error);
    res.status(500).json({ message: 'Failed to preview file' });
  }
});



export default router;