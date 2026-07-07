export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text1, text2 } = req.body;

  if (!text1 || !text2) {
    return res.status(400).json({ error: 'Both draft versions are required.' });
  }

  if (text1.trim().split(/\s+/).length < 30 || text2.trim().split(/\s+/).length < 30) {
    return res.status(400).json({ error: 'Each draft needs at least 30 words.' });
  }

  const systemPrompt = `You are a professional fiction editor comparing two drafts of the same mystery/thriller scene or chapter. Analyze both versions and return ONLY a valid JSON object with this exact structure — no markdown, no explanation, just raw JSON:

{
  "verdict": "one sentence overall verdict on which draft is stronger and why",
  "winner": "Draft 1/Draft 2/Tie",
  "improvements": [
    {"title": "short label", "detail": "specific thing Draft 2 does better than Draft 1, referencing actual text"}
  ],
  "regressions": [
    {"title": "short label", "detail": "specific thing Draft 1 did better that Draft 2 lost or weakened"}
  ],
  "unchanged_issues": [
    {"title": "short label", "detail": "problem present in both drafts that still needs fixing"}
  ],
  "score_change": {
    "plot": "Improved/Same/Weakened",
    "characters": "Improved/Same/Weakened",
    "tension": "Improved/Same/Weakened",
    "pacing": "Improved/Same/Weakened"
  },
  "key_advice": "one concrete, specific thing the writer should focus on for Draft 3"
}

Each array should have 1-4 items. Always reference specific lines, moments, or choices from the actual text. Be direct and constructive.`;

  const userMessage = `DRAFT 1:\n${text1}\n\n---\n\nDRAFT 2:\n${text2}`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1500,
        temperature: 0.3,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ]
      })
    });

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || '';
    const clean = raw.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);
    return res.status(200).json(result);

  } catch (err) {
    return res.status(500).json({ error: err.message || 'Something went wrong.' });
  }
}
