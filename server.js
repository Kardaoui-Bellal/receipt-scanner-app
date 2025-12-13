import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
  console.error('ERROR: GROQ_API_KEY environment variable is not set');
  process.exit(1);
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Parse receipt endpoint
app.post('/api/parse-receipt', async (req, res) => {
  try {
    const { ocrText } = req.body;

    if (!ocrText) {
      return res.status(400).json({ error: 'OCR text is required' });
    }

    const prompt = `You are a receipt parser. Extract structured data from this receipt text.

Receipt Text:
${ocrText}

Return ONLY a valid JSON object with this exact structure:
{
  "merchant": "store name",
  "date": "YYYY-MM-DD",
  "total": 0.00,
  "category": "Food" or "Transport" or "Shopping" or "Bills" or "Other",
  "items": [
    {"name": "item name", "price": 0.00}
  ]
}

Rules:
- merchant: First clear business name found
- date: Format as YYYY-MM-DD, use today if not found
- total: Final total amount
- category: Choose best fit: Food (groceries/restaurants), Transport (gas/uber), Shopping (retail), Bills (utilities), Other
- items: Individual purchases with name and price (must extract ALL items with prices)
- Return valid JSON only, no markdown or explanations`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 2000
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Groq API error:', data);
      return res.status(response.status).json({ error: data.error?.message || 'Groq API error' });
    }

    const content = data.choices[0].message.content.trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return res.json(parsed);
      } catch (e) {
        console.error('JSON parse error:', e);
        return res.status(400).json({ error: 'Failed to parse AI response as JSON' });
      }
    }

    return res.status(400).json({ error: 'No valid JSON found in response' });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`🚀 Receipt parser server running on http://localhost:${PORT}`);
  console.log('API endpoint: POST http://localhost:${PORT}/api/parse-receipt');
});
