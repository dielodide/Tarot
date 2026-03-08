const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const OPENROUTER_KEY =
  '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';

app.use(express.json({ limit: '50kb' }));
app.use(express.static(path.join(__dirname, 'public')));

const rateLimitStore = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 10;

const rateLimit = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = rateLimitStore.get(ip) || { count: 0, start: now };
  if (now - entry.start > WINDOW_MS) {
    entry.count = 0;
    entry.start = now;
  }
  entry.count += 1;
  rateLimitStore.set(ip, entry);
  if (entry.count > MAX_REQUESTS) {
    return res.status(429).json({ error: 'Trop de requêtes. Réessaie bientôt.' });
  }
  return next();
};

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

const buildPrompt = ({ profile, topic, cards }) => {
  const intro = `Profil: ${profile.name}, ${profile.age} ans, ${profile.gender}, signe ${profile.zodiacSign}.`;
  const cardLines = cards
    .map(
      (card, index) =>
        `Carte ${index + 1}: ${card.card_name} — Signification: ${card.meaning}`,
    )
    .join('\n');
  return `Tu es une tarologue empathique, claire et non alarmiste.\n${intro}\nSujet: ${topic}.\n${cardLines}\n\nConsignes de sortie:\n- 1 courte intro personnalisée\n- 3 sections “Carte 1/2/3” (2-3 phrases chacune)\n- 1 synthèse actionnable (3 bullet points max)\n- Français chaleureux, pas de prédictions absolues (utilise “ça pourrait”, “tendance”, “pistes”)\n- Ne pas inventer d’autres significations que celles fournies (tu peux reformuler).`;
};

const buildFallback = ({ profile, topic, cards }) => {
  const intro = `Salut ${profile.name}, voici une lecture douce pour ton sujet “${topic}”.`;
  const sections = cards
    .map(
      (card, index) =>
        `\nCarte ${index + 1} — ${card.card_name}: ${card.meaning}`,
    )
    .join('');
  const advice = `\n\nSynthèse:\n• Reste à l’écoute de ce qui se présente sans forcer.\n• Choisis une petite action concrète qui te rapproche de ton intention.\n• Accorde-toi un moment de recul pour clarifier tes priorités.`;
  return `${intro}${sections}${advice}`;
};

app.get('/api/tarot-data', async (req, res) => {
  try {
    const response = await fetch(
      'https://raw.githubusercontent.com/dielodide/Tarot/refs/heads/Aok/tarot_data.json',
      {
        headers: {
          Authorization: 'token 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',
        },
      },
    );
    if (!response.ok) {
      throw new Error('Tarot data fetch failed');
    }
    const data = await response.json();
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Impossible de charger les cartes.' });
  }
});

app.post('/api/reading', rateLimit, async (req, res) => {
  const { profile, topic, cards } = req.body || {};

  if (
    !profile ||
    !isNonEmptyString(profile.name) ||
    typeof profile.age !== 'number' ||
    !isNonEmptyString(profile.gender) ||
    !isNonEmptyString(profile.zodiacSign) ||
    !isNonEmptyString(topic) ||
    !Array.isArray(cards) ||
    cards.length !== 3
  ) {
    return res.status(400).json({ error: 'Payload invalide.' });
  }

  for (const card of cards) {
    if (
      !card ||
      !isNonEmptyString(card.card_name) ||
      !isNonEmptyString(card.image_filename) ||
      !isNonEmptyString(card.meaning)
    ) {
      return res.status(400).json({ error: 'Cartes invalides.' });
    }
  }

  const prompt = buildPrompt({ profile, topic, cards });

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENROUTER_KEY}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Tarot Chat',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3-8b-instruct:free',
        messages: [
          {
            role: 'system',
            content: 'Tu es une tarologue empathique, claire et non alarmiste.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error('OpenRouter error');
    }

    const data = await response.json();
    const answerText = data?.choices?.[0]?.message?.content;
    if (!answerText) {
      throw new Error('Réponse vide');
    }

    return res.json({ answerText });
  } catch (error) {
    const fallback = buildFallback({ profile, topic, cards });
    return res.json({ answerText: fallback, fallback: true });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Tarot Chat running on http://localhost:${PORT}`);
});
