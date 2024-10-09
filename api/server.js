require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  }),
});

const db = admin.firestore();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html at the root URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint for bot registration
app.post('/api/register-bot', registerBot);

async function registerBot(req, res) {
  try {
    const { ownerName, ownerNumber, botName, botType } = req.body;

    if (!ownerName || !ownerNumber || !botName || !botType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const newBot = {
      ownerName,
      ownerNumber,
      botName,
      botType,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('bots').add(newBot);
    console.log('Document written with ID: ', docRef.id);

    res.status(200).json({ message: 'Bot registered successfully', botId: docRef.id });
  } catch (error) {
    console.error('Error registering bot:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message,
      code: error.code
    });
  }
}

// API endpoint to retrieve bot info
app.get('/api/get-bot', async (req, res) => {
  const { name, number } = req.query;

  if (!name || !number) {
    return res.status(400).json({ error: 'Missing required query parameters' });
  }

  try {
    const snapshot = await db.collection('bots')
      .where('ownerName', '==', name)
      .where('ownerNumber', '==', number)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ error: 'Bot not found' });
    }

    const botData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))[0];
    return res.status(200).json({ message: 'Bot found', bot: botData });
  } catch (error) {
    console.error('Error fetching bot:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});