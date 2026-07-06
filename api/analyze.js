export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body;
  if (!text || text.trim().split(/\s+/).length < 50) {
    return res.status(400).json({ error: 'Text too short.' });
  }

  const systemPrompt = `You are a professional fiction editor specializing in mystery and thriller novels. Analyze the provided chapter excerpt and return ONLY a valid JSON object with this exact structure — no markdown, no explanation, just raw JSON:

{
  "overall": "2-3 sentence overall assessment",
  "scores": {
    "plot": "Strong/Good/Fair/Weak",
    "characters": "Strong/Good/Fair/Weak",
    "tension": "Strong/Good/Fair/Weak",
    "pacing": "Strong/Good/Fair/Weak"
  },
  "plot_holes": [
    {"title": "short label", "detail": "specific explanation referencing the text"}
  ],
  "character_issues": [
    {"title": "short label", "detail": "specific explanation"}
  ],
  "tension_suggestions": [
    {"title": "short label", "detail": "specific actionable suggestion"}
  ],
  "pacing_notes": [
    {"title": "short label", "detail": "specific observation"}
  ],
  "strengths": [
    {"title": "short label", "detail": "specific strength, quote the text where possible"}
  ]
}

Each array should have 2-4 items. Always reference actual lines or scenes from the text.`;

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
        temperature: 0.4,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
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
