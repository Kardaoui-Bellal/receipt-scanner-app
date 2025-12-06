// This is a serverless function for Vercel
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version')
  
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { image, mediaType } = req.body

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: image
                }
              },
              {
                type: 'text',
                text: `Analyze this receipt and extract the following information in JSON format only (no markdown, no preamble):
{
  "merchant": "store name",
  "date": "YYYY-MM-DD",
  "total": number,
  "items": [
    {"name": "item name", "price": number, "quantity": number},
    {"name": "item name", "price": number, "quantity": number}
  ],
  "category": "one of: Groceries, Transport, Dining, Shopping, Healthcare, Entertainment, Utilities, Other"
}`
              }
            ]
          }
        ]
      })
    })

    const data = await response.json()
    res.status(200).json(data)
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ error: 'Failed to process receipt' })
  }
}