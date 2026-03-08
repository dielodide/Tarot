const TAROT_DATA_URL =
  'tarot_data.json';
const IMAGE_BASE_URL =
  'Rider_Waite_Deck/';
const BACK_CARD_URL = `${IMAGE_BASE_URL}backcard.png`;
const GITHUB_TOKEN = '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';

const topics = [
  'Argent et Finances',
  'Enfants et Famille',
  'Santé et Bien-être',
  'Carrière et Vocation',
  'Amour et amitié',
];

const zodiacRanges = [
  { sign: 'Verseau', start: [1, 20], end: [2, 18] },
  { sign: 'Poissons', start: [2, 19], end: [3, 20] },
  { sign: 'Bélier', start: [3, 21], end: [4, 19] },
  { sign: 'Taureau', start: [4, 20], end: [5, 20] },
  { sign: 'Gémeaux', start: [5, 21], end: [6, 20] },
  { sign: 'Cancer', start: [6, 21], end: [7, 22] },
  { sign: 'Lion', start: [7, 23], end: [8, 22] },
  { sign: 'Vierge', start: [8, 23], end: [9, 22] },
  { sign: 'Balance', start: [9, 23], end: [10, 22] },
  { sign: 'Scorpion', start: [10, 23], end: [11, 21] },
  { sign: 'Sagittaire', start: [11, 22], end: [12, 21] },
  { sign: 'Capricorne', start: [12, 22], end: [1, 19] },
];

const state = {
  deck: [],
  profile: null,
  topic: '',
  cards: [],
  revealed: [false, false, false],
};

const formSection = document.getElementById('form-section');
const chatSection = document.getElementById('chat-section');
const drawSection = document.getElementById('draw-section');
const readingSection = document.getElementById('reading-section');
const footerText = document.getElementById('footer-text');
const profileForm = document.getElementById('profile-form');
const zodiacText = document.getElementById('zodiac-text');
const topicChips = document.getElementById('topic-chips');
const cardsGrid = document.getElementById('cards-grid');
const drawTitle = document.getElementById('draw-title');
const readingStatus = document.getElementById('reading-status');
const readingOutput = document.getElementById('reading-output');

const getRandomInt = (max) => {
  if (max <= 0) return 0;
  if (window.crypto && window.crypto.getRandomValues) {
    const arr = new Uint32Array(1);
    window.crypto.getRandomValues(arr);
    return arr[0] % max;
  }
  return Math.floor(Math.random() * max);
};

const drawCards = (deck) => {
  const selected = new Set();
  const picks = [];
  while (selected.size < 3 && selected.size < deck.length) {
    const index = getRandomInt(deck.length);
    if (!selected.has(index)) {
      selected.add(index);
      picks.push(deck[index]);
    }
  }
  return picks;
};

const getZodiacSign = (dateString) => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const match = zodiacRanges.find(({ start, end }) => {
    const [startMonth, startDay] = start;
    const [endMonth, endDay] = end;
    if (startMonth < endMonth) {
      return (
        (month === startMonth && day >= startDay) ||
        (month === endMonth && day <= endDay) ||
        (month > startMonth && month < endMonth)
      );
    }
    return (
      (month === startMonth && day >= startDay) ||
      (month === endMonth && day <= endDay) ||
      month > startMonth ||
      month < endMonth
    );
  });

  return match ? match.sign : '';
};

const renderTopics = () => {
  topicChips.innerHTML = '';
  topics.forEach((topic) => {
    const button = document.createElement('button');
    button.className = 'chip';
    button.textContent = topic;
    button.addEventListener('click', () => selectTopic(topic));
    topicChips.appendChild(button);
  });
};

const renderCards = () => {
  cardsGrid.innerHTML = '';
  state.cards.forEach((card, index) => {
    const wrapper = document.createElement('div');
    const button = document.createElement('button');
    button.className = 'card-flip';
    button.setAttribute('aria-label', `Révéler ${card.card_name}`);

    const back = document.createElement('div');
    back.className = 'face back';
    const backImg = document.createElement('img');
    backImg.src = BACK_CARD_URL;
    backImg.alt = 'Dos de carte';
    back.appendChild(backImg);

    const front = document.createElement('div');
    front.className = 'face front';
    const frontImg = document.createElement('img');
    frontImg.src = `${IMAGE_BASE_URL}${card.image_filename}`;
    frontImg.alt = card.card_name;
    front.appendChild(frontImg);

    button.appendChild(back);
    button.appendChild(front);
    button.addEventListener('click', () => revealCard(index, button));

    const label = document.createElement('p');
    label.className = 'muted';
    label.textContent = 'Carte mystère';

    wrapper.appendChild(button);
    wrapper.appendChild(label);
    cardsGrid.appendChild(wrapper);
  });
};

const revealCard = (index, button) => {
  if (state.revealed[index]) return;
  state.revealed[index] = true;
  button.classList.add('is-flipped');
  const label = button.nextSibling;
  if (label) label.textContent = state.cards[index].card_name;

  if (state.revealed.every(Boolean)) {
    requestReading();
  }
};

const selectTopic = (topic) => {
  state.topic = topic;
  state.cards = drawCards(state.deck);
  state.revealed = [false, false, false];
  drawTitle.textContent = `Tirage: ${topic}`;
  readingOutput.textContent = '';
  readingStatus.textContent = 'Révèle les cartes pour démarrer.';
  readingSection.hidden = false;
  drawSection.hidden = false;

  Array.from(topicChips.children).forEach((chip) => {
    chip.classList.toggle('active', chip.textContent === topic);
  });

  renderCards();
};

const requestReading = async () => {
  readingStatus.textContent = 'La tarologue prépare ta réponse...';
  try {
    const response = await fetch('/api/reading', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profile: state.profile,
        topic: state.topic,
        cards: state.cards,
      }),
    });

    if (!response.ok) {
      throw new Error('Lecture indisponible, réessaie.');
    }

    const data = await response.json();
    readingOutput.textContent = data.answerText || 'Pas de réponse reçue.';
    readingStatus.textContent = '';
  } catch (error) {
    readingOutput.textContent = '';
    readingStatus.textContent =
      error instanceof Error ? error.message : 'Erreur de lecture.';
  }
};

profileForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(profileForm);
  const name = formData.get('name')?.toString().trim();
  const age = Number(formData.get('age'));
  const gender = formData.get('gender')?.toString();
  const birthDate = formData.get('birthDate')?.toString();
  const zodiacSign = getZodiacSign(birthDate);

  if (!name || !birthDate || !gender || !zodiacSign || Number.isNaN(age)) {
    return;
  }

  state.profile = { name, age, gender, zodiacSign };
  zodiacText.textContent = `Ah tu es ${zodiacSign}.`;
  formSection.hidden = true;
  chatSection.hidden = false;
  renderTopics();
});

const loadDeck = async () => {
  try {
    const response = await fetch(TAROT_DATA_URL, {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
      },
    });
    if (!response.ok) {
      throw new Error('Impossible de charger les cartes.');
    }
    const data = await response.json();
    state.deck = data;
    footerText.textContent = 'Prêt pour un nouveau tirage.';
  } catch (error) {
    try {
      const fallback = await fetch('/api/tarot-data');
      if (!fallback.ok) {
        throw new Error('Impossible de charger les cartes.');
      }
      const data = await fallback.json();
      state.deck = data;
      footerText.textContent = 'Prêt pour un nouveau tirage.';
    } catch (innerError) {
      footerText.textContent =
        innerError instanceof Error
          ? innerError.message
          : 'Erreur au chargement des cartes.';
    }
  }
};

loadDeck();
