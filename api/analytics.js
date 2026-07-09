const VALID_EVENTS = ['analyze', 'compare', 'characters', 'sentiment', 'readability', 'visit'];

export default async function handler(req, res) {
  // Allow GET for stats, POST for tracking
  if (req.method === 'GET') {
    return getStats(res);
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { event } = req.body;

  if (!event || !VALID_EVENTS.includes(event)) {
    return res.status(400).json({ error: 'Invalid event' });
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    // Silently succeed if not configured — won't break the app
    return res.status(200).json({ ok: true });
  }

  try {
    // Increment the counter for this event
    // Also increment total
    await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([
        ['INCR', `pzl:${event}`],
        ['INCR', 'pzl:total']
      ])
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    // Never let analytics break the main app
    return res.status(200).json({ ok: true });
  }
}

async function getStats(res) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return res.status(200).json(getEmptyStats());
  }

  try {
    const keys = ['pzl:total', 'pzl:analyze', 'pzl:compare', 'pzl:characters', 'pzl:sentiment', 'pzl:readability', 'pzl:visit'];

    const response = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(keys.map(k => ['GET', k]))
    });

    const data = await response.json();
    const values = data.map(r => parseInt(r.result || '0', 10) || 0);

    return res.status(200).json({
      total:       values[0],
      analyze:     values[1],
      compare:     values[2],
      characters:  values[3],
      sentiment:   values[4],
      readability: values[5],
      visits:      values[6]
    });
  } catch (err) {
    return res.status(200).json(getEmptyStats());
  }
}

function getEmptyStats() {
  return { total: 0, analyze: 0, compare: 0, characters: 0, sentiment: 0, readability: 0, visits: 0 };
}
