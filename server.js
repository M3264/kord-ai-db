const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from 'public'

// API endpoint for POST request
app.post('/api/register-bot', async (req, res) => {
  try {
    const { ownerName, ownerNumber, botName, botType } = req.body;

    if (!ownerName || !ownerNumber || !botName || !botType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const data = `Owner_Name,Owner_Number,Bot_Name,Bot_Type\n${ownerName},${ownerNumber},${botName},${botType}\n`;
    await fs.appendFile(path.join(__dirname, 'registered_bots.csv'), data);

    res.status(200).json({ message: 'Bot registered successfully' });
  } catch (error) {
    console.error('Error registering bot:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint for GET request
app.get('/api/register-bot', async (req, res) => {
  const { Name, Number } = req.query;

  if (!Name || !Number) {
    return res.status(400).json({ error: 'Missing required query parameters' });
  }

  try {
    const data = await fs.readFile(path.join(__dirname, 'registered_bots.csv'), 'utf-8');
    const lines = data.split('\n').slice(1); // Skip header
    const bots = lines.map(line => {
      const [ownerName, ownerNumber, botName, botType] = line.split(',');
      return { ownerName, ownerNumber, botName, botType };
    });

    const foundBot = bots.find(bot => bot.ownerName === Name && bot.ownerNumber === Number);
    if (foundBot) {
      return res.status(200).json({ message: 'Bot found', bot: foundBot });
    } else {
      return res.status(404).json({ error: 'Bot not found' });
    }
  } catch (error) {
    console.error('Error reading file:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});