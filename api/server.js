require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3000;

// MongoDB connection string
const mongoURI = process.env.MONGODB_URI || "mongodb+srv://M3264:Iyanu1234.db@kordai-db.ukun1.mongodb.net/?retryWrites=true&w=majority&appName=Kordai-db";

// Connect to MongoDB Atlas
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('Error connecting to MongoDB Atlas:', err));

// Define Bot schema
const botSchema = new mongoose.Schema({
  ownerName: String,
  ownerNumber: String,
  botName: String,
  botType: String,
  createdAt: { type: Date, default: Date.now }
});

const Bot = mongoose.model('Bot', botSchema);

// File schema
const fileSchema = new mongoose.Schema({
  filename: String,
  path: String,
  size: Number,
  mimetype: String,
  uploadedAt: { type: Date, default: Date.now }
});

const File = mongoose.model('File', fileSchema);

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Multer configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)){
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Serve index.html at the root URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// GET method for bot registration (for form rendering or info)
app.get('/api/register-bot', (req, res) => {
    res.status(200).json({
        message: 'Bot registration form',
        requiredFields: ['ownerName', 'ownerNumber', 'botName', 'botType'],
        instructions: 'Submit a POST request to this endpoint with the required fields to register a bot.'
    });
});

// POST method for bot registration
app.post('/api/register-bot', async (req, res) => {
    try {
        const { ownerName, ownerNumber, botName, botType } = req.body;

        if (!ownerName || !ownerNumber || !botName || !botType) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const newBot = new Bot({ ownerName, ownerNumber, botName, botType });
        await newBot.save();

        res.status(200).json({ message: 'Bot registered successfully', botId: newBot._id });
    } catch (error) {
        console.error('Error registering bot:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// API endpoint to retrieve bot info
app.get('/api/get-bot', async (req, res) => {
    try {
        const { name, number } = req.query;

        if (!name || !number) {
            return res.status(400).json({ error: 'Missing required query parameters' });
        }

        const bot = await Bot.findOne({ ownerName: name, ownerNumber: number });

        if (!bot) {
            return res.status(404).json({ error: 'Bot not found' });
        }

        res.status(200).json({ message: 'Bot found', bot });
    } catch (error) {
        console.error('Error fetching bot:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// API endpoint to list all bots
app.get('/api/list-bots', async (req, res) => {
    try {
        const bots = await Bot.find();
        res.status(200).json({ bots });
    } catch (error) {
        console.error('Error listing bots:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// API endpoint to delete a bot
app.delete('/api/delete-bot/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await Bot.findByIdAndDelete(id);

        if (!result) {
            return res.status(404).json({ error: 'Bot not found' });
        }

        res.status(200).json({ message: 'Bot deleted successfully' });
    } catch (error) {
        console.error('Error deleting bot:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// File upload endpoint
app.post('/api/upload-file', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const newFile = new File({
            filename: req.file.originalname,
            path: req.file.path,
            size: req.file.size,
            mimetype: req.file.mimetype
        });

        await newFile.save();

        res.status(200).json({ 
            message: 'File uploaded successfully', 
            fileId: newFile._id,
            filename: newFile.filename,
            size: newFile.size,
            mimetype: newFile.mimetype
        });
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File size limit exceeded (10MB max)' });
        }
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});