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
    const safeFileName = path.basename(req.body.filePath);
    const filePath = path.join(__dirname, 'summaries', safeFileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    const rawText = await extractPdfText(filePath);

    // Step 1: Parse mapping section at end of summary
    const referenceMap = {};
const matchSection = rawText.split('## Detailed Matching Report')[1]?.split('## Summary Table')[0] || '';

const matchLines = matchSection.split('\n').map(line => line.trim()).filter(Boolean);

let currentFile = '';

for (const line of matchLines) {
  // Detect lines with filenames
  const filenameMatch = line.match(/^###\s+\d+\.\s+(.*?)\s*\((\d+)\s+pages\)/i);
  if (filenameMatch) {
    currentFile = filenameMatch[1].trim().replace(/ /g, '_');
    continue;
  }

  // Detect matched references
  const referenceMatch = line.match(/SIBTF\s*-\s*SIF\d+\s*-\s*([A-Z])/g);
  if (referenceMatch && currentFile) {
    for (const ref of referenceMatch) {
      const cleanedRef = ref.trim();
      referenceMap[cleanedRef] = currentFile;
    }
  }
}
    // console.log(rawText)
    // Step 2: Format text with mapped buttons
    const formattedText = formatExtractedText(rawText, referenceMap);
    // console.log(formattedText)
    res.json({ text: formattedText });
  } catch (err) {
    console.error('Error extracting text:', err);
    res.status(500).json({ message: 'Failed to extract PDF text.' });
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