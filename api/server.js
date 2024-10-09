const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccount = require('./config/kordai-db.json'); // Replace with your credentials file
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from 'public'

// API endpoint for bot registration (POST and GET)
app.post('/api/register-bot', registerBot);
app.get('/api/register-bot', registerBot);

async function registerBot(req, res) {
  try {
    // Use GET parameters for registration
    const { ownerName, ownerNumber, botName, botType } = req.method === 'GET' ? req.query : req.body;

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

    await db.collection('bots').add(newBot);

    res.status(200).json({ message: 'Bot registered successfully' });
  } catch (error) {
    console.error('Error registering bot:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// API endpoint for GET request to retrieve bot info
app.get('/api/get-bot', async (req, res) => {
  const { Name, Number } = req.query;

  if (!Name || !Number) {
    return res.status(400).json({ error: 'Missing required query parameters' });
  }

  try {
    const snapshot = await db.collection('bots')
      .where('ownerName', '==', Name)
      .where('ownerNumber', '==', Number)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ error: 'Bot not found' });
    }

    const botData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))[0];
    return res.status(200).json({ message: 'Bot found', bot: botData });
  } catch (error) {
    console.error('Error fetching bot:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});