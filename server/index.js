const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize OpenAI
console.log('OpenAI API Key configured:', process.env.OPENAI_API_KEY ? 'Yes' : 'No');
if (!process.env.OPENAI_API_KEY) {
  console.log('WARNING: OPENAI_API_KEY not found in environment variables');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Middleware
app.use(cors());
app.use(express.json());

// Only serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
}

// Create necessary directories
const UPLOAD_DIR = path.join(__dirname, '../uploads');
const STORAGE_DIR = path.join(__dirname, '../storage');

fs.ensureDirSync(UPLOAD_DIR);
fs.ensureDirSync(STORAGE_DIR);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.docx', '.txt', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'), false);
    }
  }
});

// File Upload Queue System
class UploadQueue {
  constructor() {
    this.maxConcurrent = 3; // Process 3 files at a time
  }

  async addToQueue(files) {
    console.log(`Adding ${files.length} files to processing queue`);
    
    // Process files in batches for better performance
    const results = [];
    for (let i = 0; i < files.length; i += this.maxConcurrent) {
      const batch = files.slice(i, i + this.maxConcurrent);
      console.log(`Processing batch ${Math.floor(i / this.maxConcurrent) + 1}: ${batch.length} files`);
      
      const batchPromises = batch.map(file => this.processFile(file));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    return results;
  }

  async processFile(file) {
    try {
      console.log(`Processing file: ${file.originalname}`);
      
      // Extract text from file
      const content = await documentProcessor.extractTextFromFile(file.path);

      // Classify document using AI
      const classification = await aiClassifier.classifyDocument(file.originalname, content);

      // Store document
      const result = await documentStorage.storeDocument(file.path, classification, file.originalname);

      // Clean up uploaded file
      await fs.remove(file.path);

      console.log(`Successfully processed: ${file.originalname} -> ${result.folder}`);
      return { success: true, file: file.originalname, result };
    } catch (error) {
      console.error(`Error processing ${file.originalname}:`, error);
      
      // Clean up uploaded file even if processing failed
      try {
        await fs.remove(file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
      
      return { 
        success: false, 
        file: file.originalname, 
        error: error.message 
      };
    }
  }
}

// Document Processor Class
class DocumentProcessor {

  async extractTextFromFile(filePath) {
    const fileExtension = path.extname(filePath).toLowerCase();
    
    switch (fileExtension) {
      case '.pdf':
        return await this.extractFromPdf(filePath);
      case '.docx':
        return await this.extractFromDocx(filePath);
      case '.txt':
        return await this.extractFromTxt(filePath);
      case '.jpg':
      case '.jpeg':
      case '.png':
        return await this.extractFromImage(filePath);
      default:
        throw new Error(`Unsupported file type: ${fileExtension}`);
    }
  }

  async extractFromPdf(filePath) {
    try {
      const pdfParse = require('pdf-parse');
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    } catch (error) {
      return `Error extracting PDF text: ${error.message}`;
    }
  }

  async extractFromDocx(filePath) {
    try {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } catch (error) {
      return `Error extracting DOCX text: ${error.message}`;
    }
  }

  async extractFromTxt(filePath) {
    try {
      return await fs.readFile(filePath, 'utf8');
    } catch (error) {
      return `Error extracting TXT text: ${error.message}`;
    }
  }

  async extractFromImage(filePath) {
    // Placeholder for OCR functionality
    return `Image file: ${path.basename(filePath)} (OCR not implemented yet)`;
  }
}

// AI Classifier Class
class AIClassifier {
  async classifyDocument(filename, content) {
    try {
      console.log('Attempting AI classification for:', filename);
      console.log('Content length:', content.length);
      
      if (!process.env.OPENAI_API_KEY) {
        console.log('OpenAI not available, using fallback classification');
        return {
          category: "Other Documents",
          subcategory: "Unknown",
          confidence: 0.0,
          suggested_folder_name: "Other Documents",
          description: `Basic classification for ${filename}`
        };
      }
      
      const prompt = `
        Analyze this document and classify it into a practical, broad category that would be useful for document organization.
        
        Document Name: ${filename}
        Content Preview: ${content.substring(0, 1000)}...
        
        CLASSIFICATION RULES - Create broad, reusable folder names:
        
        For BANKING & FINANCIAL documents:
        - Bank statements, credit card statements, investment statements → "Bank Statements"
        - Salary statements, pay stubs, earnings reports → "Pay Stubs"
        - Financial summaries, account summaries → "Financial Documents"
        
        For TAX documents:
        - Tax returns, W2s, 1099s, tax receipts → "Tax Documents"
        - Tax-related correspondence → "Tax Documents"
        
        For MEDICAL documents:
        - Medical bills, insurance claims, doctor reports → "Medical Bills"
        - Prescriptions, health records → "Medical Records"
        
        For LEGAL documents:
        - Contracts, agreements, legal correspondence → "Legal Documents"
        - Court documents, wills, deeds → "Legal Documents"
        
        For PERSONAL documents:
        - ID cards, passports, birth certificates → "Personal Documents"
        - Marriage certificates, personal correspondence → "Personal Documents"
        
        For JOB & CAREER documents:
        - Resumes, job applications, work contracts → "Resumes"
        - Performance reviews, work-related correspondence → "Work Documents"
        
        For SCHOOL & ACADEMIC documents:
        - Essays, assignments, research papers → "School Work"
        - Class notes, academic documents → "School Work"
        - Certificates, diplomas → "Academic Certificates"
        
        For RECEIPTS & BILLS:
        - Purchase receipts, utility bills → "Receipts"
        - Service invoices, subscription bills → "Bills"
        
        For anything else:
        - Use "Other Documents"
        
        IMPORTANT: Create broad, practical folder names that can be reused for similar documents!
        
        Please provide a JSON response with this structure:
        {
          "category": "The main category",
          "subcategory": "A brief specific description",
          "confidence": 0.95,
          "suggested_folder_name": "The broad, practical folder name",
          "description": "Brief description of what this document is"
        }
      `;

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a document classification expert. Provide accurate JSON responses only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3
      });

      const resultText = completion.choices[0].message.content.trim();
      // Remove markdown code blocks if present
      const cleanResult = resultText.replace(/```json\n?|\n?```/g, '');
      
      return JSON.parse(cleanResult);
    } catch (error) {
      console.error('Classification error:', error);
      return {
        category: "Uncategorized",
        subcategory: "Unknown",
        confidence: 0.0,
        suggested_folder_name: "Uncategorized",
        description: `Error in classification: ${error.message}`
      };
    }
  }
}

// Document Storage Class
class DocumentStorage {
  constructor(storageDir) {
    this.storageDir = storageDir;
    fs.ensureDirSync(storageDir);
  }

  normalizeFolderName(folderName) {
    const normalized = folderName.trim();
    
    // Map common variations to standard categories
    const folderMappings = {
      // Banking & Financial
      'earnings statement': 'Pay Stubs',
      'earnings statements': 'Pay Stubs',
      'salary statement': 'Pay Stubs',
      'salary statements': 'Pay Stubs',
      'pay stub': 'Pay Stubs',
      'pay stubs': 'Pay Stubs',
      'bank statement': 'Bank Statements',
      'bank statements': 'Bank Statements',
      'credit card statement': 'Bank Statements',
      'credit card statements': 'Bank Statements',
      'financial statement': 'Financial Documents',
      'financial statements': 'Financial Documents',
      'investment statement': 'Bank Statements',
      'investment statements': 'Bank Statements',
      
      // Tax
      'tax document': 'Tax Documents',
      'tax documents': 'Tax Documents',
      'tax return': 'Tax Documents',
      'tax returns': 'Tax Documents',
      
      // Medical
      'medical record': 'Medical Records',
      'medical records': 'Medical Records',
      'medical bill': 'Medical Bills',
      'medical bills': 'Medical Bills',
      
      // Legal
      'legal document': 'Legal Documents',
      'legal documents': 'Legal Documents',
      'contract': 'Legal Documents',
      'contracts': 'Legal Documents',
      
      // Personal
      'personal document': 'Personal Documents',
      'personal documents': 'Personal Documents',
      
      // Job & Career
      'resume': 'Resumes',
      'resumes': 'Resumes',
      'work document': 'Work Documents',
      'work documents': 'Work Documents',
      
      // School & Academic
      'essay': 'School Work',
      'essays': 'School Work',
      'assignment': 'School Work',
      'assignments': 'School Work',
      'school work': 'School Work',
      'academic': 'School Work',
      'academic document': 'School Work',
      'academic documents': 'School Work',
      'class notes': 'School Work',
      'research paper': 'School Work',
      'research papers': 'School Work',
      
      // Receipts & Bills
      'receipt': 'Receipts',
      'receipts': 'Receipts',
      'invoice': 'Bills',
      'invoices': 'Bills',
      'bill': 'Bills',
      'bills': 'Bills'
    };

    const lowerNormalized = normalized.toLowerCase();
    
    // Check if we have a mapping for this folder name
    for (const [key, value] of Object.entries(folderMappings)) {
      if (lowerNormalized.includes(key)) {
        return value;
      }
    }

    // If no mapping found, check if it's already one of our standard categories
    const standardCategories = [
      'Bank Statements',
      'Pay Stubs',
      'Financial Documents',
      'Tax Documents', 
      'Medical Bills',
      'Medical Records',
      'Legal Documents',
      'Personal Documents',
      'Resumes',
      'Work Documents',
      'School Work',
      'Academic Certificates',
      'Receipts',
      'Bills',
      'Other Documents'
    ];

    if (standardCategories.includes(normalized)) {
      return normalized;
    }

    // For academic/specific content, keep the original name (but clean it up)
    // This allows for folders like "Fahrenheit 451", "English Literature", etc.
    if (normalized.length > 0 && normalized.length <= 50) {
      return normalized;
    }

    // Default to "Other Documents" for unrecognized categories
    return 'Other Documents';
  }

  async storeDocument(filePath, classification, originalFilename) {
    // Normalize folder name to ensure consistency
    const folderName = this.normalizeFolderName(classification.suggested_folder_name || "Uncategorized");
    const folderPath = path.join(this.storageDir, folderName);
    await fs.ensureDir(folderPath);

    const stats = await fs.stat(filePath);
    const metadata = {
      original_filename: originalFilename,
      stored_filename: path.basename(filePath),
      category: classification.category || "Uncategorized",
      subcategory: classification.subcategory || "",
      confidence: classification.confidence || 0.0,
      description: classification.description || "",
      upload_timestamp: new Date().toISOString(),
      file_size: stats.size,
      file_extension: path.extname(filePath)
    };

    // Save metadata as JSON
    const metadataFile = path.join(folderPath, `${path.parse(filePath).name}_metadata.json`);
    await fs.writeJson(metadataFile, metadata, { spaces: 2 });

    // Copy file to storage folder
    const storageFilePath = path.join(folderPath, path.basename(filePath));
    await fs.copy(filePath, storageFilePath);

    return {
      success: true,
      folder: folderName,
      metadata: metadata,
      storage_path: storageFilePath
    };
  }

  async getDocuments() {
    try {
      const folders = await fs.readdir(this.storageDir);
      const documents = {};

      for (const folder of folders) {
        const folderPath = path.join(this.storageDir, folder);
        const stats = await fs.stat(folderPath);
        
        if (stats.isDirectory()) {
          const files = await fs.readdir(folderPath);
          const metadataFiles = files.filter(file => file.endsWith('_metadata.json'));
          
          documents[folder] = [];
          
          for (const metadataFile of metadataFiles) {
            const metadataPath = path.join(folderPath, metadataFile);
            const metadata = await fs.readJson(metadataPath);
            documents[folder].push(metadata);
          }
        }
      }

      return documents;
    } catch (error) {
      console.error('Error reading documents:', error);
      return {};
    }
  }

  async deleteDocument(folderName, filename) {
    try {
      console.log(`Attempting to delete: ${folderName}/${filename}`);
      
      const folderPath = path.join(this.storageDir, folderName);
      const filePath = path.join(folderPath, filename);
      const metadataPath = path.join(folderPath, `${path.parse(filename).name}_metadata.json`);

      // Check if files exist before trying to delete
      const fileExists = await fs.pathExists(filePath);
      const metadataExists = await fs.pathExists(metadataPath);

      if (!fileExists) {
        console.log(`File not found: ${filePath}`);
        return { success: false, error: 'File not found' };
      }

      if (!metadataExists) {
        console.log(`Metadata file not found: ${metadataPath}`);
        return { success: false, error: 'Metadata file not found' };
      }

      // Delete both files
      await fs.remove(filePath);
      await fs.remove(metadataPath);

      console.log(`Successfully deleted: ${folderName}/${filename}`);
      return { success: true };
    } catch (error) {
      console.error('Error deleting document:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteFolder(folderName) {
    try {
      console.log(`Attempting to delete folder: ${folderName}`);
      
      const folderPath = path.join(this.storageDir, folderName);

      // Check if folder exists
      const folderExists = await fs.pathExists(folderPath);
      if (!folderExists) {
        console.log(`Folder not found: ${folderPath}`);
        return { success: false, error: 'Folder not found' };
      }

      // Get folder stats to confirm it's a directory
      const stats = await fs.stat(folderPath);
      if (!stats.isDirectory()) {
        console.log(`Path is not a directory: ${folderPath}`);
        return { success: false, error: 'Path is not a directory' };
      }

      // Delete the entire folder and all its contents
      await fs.remove(folderPath);

      console.log(`Successfully deleted folder: ${folderName}`);
      return { 
        success: true, 
        message: `Folder '${folderName}' and all its contents have been deleted` 
      };
    } catch (error) {
      console.error('Error deleting folder:', error);
      return { success: false, error: error.message };
    }
  }
}

// Initialize classes
const documentProcessor = new DocumentProcessor();
const aiClassifier = new AIClassifier();
const documentStorage = new DocumentStorage(STORAGE_DIR);
const uploadQueue = new UploadQueue();

// Routes
app.post('/api/upload', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    console.log(`Processing ${req.files.length} files...`);

    // Process all files through the queue
    const results = await uploadQueue.addToQueue(req.files);

    // Count successes and failures
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`Processing complete: ${successful.length} successful, ${failed.length} failed`);

    res.json({
      success: true,
      total: req.files.length,
      successful: successful.length,
      failed: failed.length,
      results: results
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});



app.get('/api/documents', async (req, res) => {
  try {
    const documents = await documentStorage.getDocuments();
    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/documents/:folder/:filename', async (req, res) => {
  try {
    const { folder, filename } = req.params;
    console.log(`Delete request for: ${folder}/${filename}`);
    
    const result = await documentStorage.deleteDocument(folder, filename);
    
    if (result.success) {
      console.log(`Successfully deleted: ${folder}/${filename}`);
      res.json(result);
    } else {
      console.log(`Failed to delete: ${folder}/${filename} - ${result.error}`);
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/folders/:folder', async (req, res) => {
  try {
    const { folder } = req.params;
    console.log(`Delete folder request for: ${folder}`);
    
    const result = await documentStorage.deleteFolder(folder);
    
    if (result.success) {
      console.log(`Successfully deleted folder: ${folder}`);
      res.json(result);
    } else {
      console.log(`Failed to delete folder: ${folder} - ${result.error}`);
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/documents/:folder/:filename/preview', async (req, res) => {
  try {
    const { folder, filename } = req.params;
    console.log(`Preview request for: ${folder}/${filename}`);
    
    const filePath = path.join(STORAGE_DIR, folder, filename);
    
    // Check if file exists
    if (!await fs.pathExists(filePath)) {
      console.log(`File not found: ${filePath}`);
      return res.status(404).json({ error: 'File not found' });
    }

    // Get file stats
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) {
      return res.status(400).json({ error: 'Path is not a file' });
    }

    // Set appropriate headers
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png'
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Error serving file preview:', error);
    res.status(500).json({ error: error.message });
  }
});

// Only serve React app in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Document Sorting AI server running on port ${PORT}`);
  console.log(`🌐 Open your browser to: http://localhost:${PORT}`);
}); 