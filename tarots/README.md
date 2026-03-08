# Tarot Chat (vanilla + Express)

Webapp tarot ultra légère en HTML/CSS/JS + backend Express pour appeler OpenRouter.

## Prérequis
- Node.js 18+

## Installation
```bash
npm install
```

## Lancer en local
```bash
npm start
```

L'application tourne sur **http://localhost:3000**.

## Endpoint API
`POST /api/reading`

### Exemple payload
```json
{
  "profile": {
    "name": "Alex",
    "age": 28,
    "gender": "homme",
    "zodiacSign": "Lion"
  },
  "topic": "Carrière et Vocation",
  "cards": [
    { "card_name": "The Fool", "image_filename": "the-fool.jpg", "meaning": "Nouveaux départs, spontanéité, foi." },
    { "card_name": "The Magician", "image_filename": "the-magician.jpg", "meaning": "Manifestation, pouvoir personnel, action." },
    { "card_name": "The Hermit", "image_filename": "the-hermit.jpg", "meaning": "Introspection, sagesse, recul." }
  ]
}
```

### Exemple réponse
```json
{
  "answerText": "Salut Alex...\n\nCarte 1 — ...\n\nCarte 2 — ...\n\nCarte 3 — ...\n\nSynthèse:\n• ...\n• ...\n• ..."
}
```
