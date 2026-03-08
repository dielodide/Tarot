import { useEffect, useMemo, useState } from 'react'

type TarotCard = {
  card_name: string
  image_filename: string
  meaning: string
}

type Profile = {
  name: string
  age: number
  gender: string
  zodiacSign: string
}

const TAROT_DATA_URL =
  'https://raw.githubusercontent.com/dielodide/Tarot/refs/heads/Aok/tarot_data.json'
const IMAGE_BASE_URL =
  'https://raw.githubusercontent.com/dielodide/Tarot/Aok/Rider_Waite_Deck/'
const BACK_CARD_URL = `${IMAGE_BASE_URL}backcard.png`
const GITHUB_TOKEN =
  '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'

const topics = [
  'Argent et Finances',
  'Enfants et Famille',
  'Santé et Bien-être',
  'Carrière et Vocation',
  'Amour et amitié',
]

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
]

const getZodiacSign = (dateString: string) => {
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return ''
  const month = date.getMonth() + 1
  const day = date.getDate()
  const match = zodiacRanges.find(({ start, end }) => {
    const [startMonth, startDay] = start
    const [endMonth, endDay] = end
    if (startMonth < endMonth) {
      return (
        (month === startMonth && day >= startDay) ||
        (month === endMonth && day <= endDay) ||
        (month > startMonth && month < endMonth)
      )
    }
    return (
      (month === startMonth && day >= startDay) ||
      (month === endMonth && day <= endDay) ||
      month > startMonth ||
      month < endMonth
    )
  })
  return match?.sign ?? ''
}

const getRandomInt = (max: number) => {
  if (max <= 0) return 0
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const array = new Uint32Array(1)
    crypto.getRandomValues(array)
    return array[0] % max
  }
  return Math.floor(Math.random() * max)
}

const drawCards = (deck: TarotCard[]) => {
  const selected = new Set<number>()
  const picks: TarotCard[] = []
  if (!deck.length) return picks
  while (selected.size < 3 && selected.size < deck.length) {
    const index = getRandomInt(deck.length)
    if (!selected.has(index)) {
      selected.add(index)
      picks.push(deck[index])
    }
  }
  return picks
}

function App() {
  const [deck, setDeck] = useState<TarotCard[]>([])
  const [deckStatus, setDeckStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )
  const [deckError, setDeckError] = useState('')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [formValues, setFormValues] = useState({
    name: '',
    age: '',
    gender: 'homme',
    birthDate: '',
  })
  const [topic, setTopic] = useState('')
  const [cards, setCards] = useState<TarotCard[]>([])
  const [revealed, setRevealed] = useState<boolean[]>([])
  const [answer, setAnswer] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>(
    'idle',
  )
  const [apiError, setApiError] = useState('')

  const canReveal = useMemo(
    () => revealed.length === 3 && revealed.every(Boolean),
    [revealed],
  )

  useEffect(() => {
    const loadDeck = async () => {
      try {
        const response = await fetch(TAROT_DATA_URL, {
          headers: {
            Authorization: `token ${GITHUB_TOKEN}`,
          },
        })
        if (!response.ok) {
          throw new Error('Impossible de charger les cartes.')
        }
        const data = (await response.json()) as TarotCard[]
        setDeck(data)
        setDeckStatus('ready')
      } catch (error) {
        setDeckStatus('error')
        setDeckError(
          error instanceof Error
            ? error.message
            : 'Erreur lors du chargement des cartes.',
        )
      }
    }
    loadDeck()
  }, [])

  useEffect(() => {
    if (!canReveal || status !== 'idle' || !profile || !topic) return
    const fetchReading = async () => {
      setStatus('loading')
      setApiError('')
      try {
        const response = await fetch('/api/reading', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            profile,
            topic,
            cards,
          }),
        })
        if (!response.ok) {
          throw new Error('Le tirage a échoué, essaie encore.')
        }
        const data = (await response.json()) as { answerText?: string }
        setAnswer(data.answerText ?? 'Aucune réponse reçue.')
        setStatus('done')
      } catch (error) {
        setStatus('error')
        setApiError(
          error instanceof Error
            ? error.message
            : 'Erreur lors de la génération.',
        )
      }
    }
    fetchReading()
  }, [canReveal, status, profile, topic, cards])

  const handleFormChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target
    setFormValues((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const zodiacSign = getZodiacSign(formValues.birthDate)
    const ageNumber = Number(formValues.age)
    if (!zodiacSign || !formValues.name || Number.isNaN(ageNumber)) return
    setProfile({
      name: formValues.name,
      age: ageNumber,
      gender: formValues.gender,
      zodiacSign,
    })
  }

  const handleTopicSelect = (selectedTopic: string) => {
    setTopic(selectedTopic)
    setCards(drawCards(deck))
    setRevealed([false, false, false])
    setAnswer('')
    setStatus('idle')
    setApiError('')
  }

  const handleReveal = (index: number) => {
    setRevealed((prev) => {
      if (!prev.length) return prev
      if (prev[index]) return prev
      const updated = [...prev]
      updated[index] = true
      return updated
    })
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-10 sm:px-8">
        <header className="mb-10">
          <span className="text-sm uppercase tracking-[0.4em] text-slate-400">
            Tarot Chat
          </span>
          <h1 className="mt-3 text-3xl font-semibold text-slate-50 sm:text-4xl">
            Ton tirage rapide, clair et chaleureux.
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:text-base">
            Une expérience mobile-first ultra légère pour explorer tes questions
            avec douceur.
          </p>
        </header>

        {!profile ? (
          <section className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-900/40">
            <h2 className="text-lg font-semibold text-slate-100">
              Fais connaissance avec ton tarot.
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Remplis ces détails pour personnaliser la lecture.
            </p>
            <form
              onSubmit={handleSubmit}
              className="mt-6 flex flex-col gap-4"
            >
              <label className="flex flex-col gap-2 text-sm text-slate-200">
                Nom
                <input
                  name="name"
                  value={formValues.name}
                  onChange={handleFormChange}
                  required
                  className="rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-violet-400"
                  placeholder="Ton prénom"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm text-slate-200">
                  Âge
                  <input
                    name="age"
                    value={formValues.age}
                    onChange={handleFormChange}
                    required
                    type="number"
                    min="1"
                    className="rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-violet-400"
                    placeholder="25"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-slate-200">
                  Date de naissance
                  <input
                    name="birthDate"
                    value={formValues.birthDate}
                    onChange={handleFormChange}
                    required
                    type="date"
                    className="rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-violet-400"
                  />
                </label>
              </div>
              <div className="flex flex-col gap-2 text-sm text-slate-200">
                Genre
                <div className="flex gap-4">
                  {['homme', 'femme'].map((option) => (
                    <label
                      key={option}
                      className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm capitalize transition ${
                        formValues.gender === option
                          ? 'border-violet-400 bg-violet-500/20 text-violet-100'
                          : 'border-slate-700 text-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="gender"
                        value={option}
                        checked={formValues.gender === option}
                        onChange={handleFormChange}
                        className="accent-violet-400"
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </div>
              <button
                type="submit"
                className="mt-2 rounded-2xl bg-violet-500 px-6 py-3 text-sm font-semibold text-slate-50 transition hover:bg-violet-400"
              >
                Continuer
              </button>
            </form>
          </section>
        ) : (
          <section className="flex flex-1 flex-col gap-8">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
              <p className="text-sm text-slate-300">Ah tu es {profile.zodiacSign}.</p>
              <div className="mt-5 flex flex-col gap-3">
                <div className="chat-bubble bot">
                  Tu veux des réponses à quel propos ?
                </div>
                <div className="flex flex-wrap gap-3">
                  {topics.map((item) => (
                    <button
                      key={item}
                      onClick={() => handleTopicSelect(item)}
                      className={`rounded-full border px-4 py-2 text-xs font-medium transition sm:text-sm ${
                        topic === item
                          ? 'border-violet-400 bg-violet-500/20 text-violet-100'
                          : 'border-slate-700 text-slate-300 hover:border-violet-500/60'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {deckStatus === 'error' && (
              <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
                {deckError}
              </div>
            )}

            {topic && cards.length > 0 && (
              <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
                <div className="flex flex-col gap-2">
                  <h3 className="text-lg font-semibold text-slate-100">
                    Tirage: {topic}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Tap sur chaque carte pour la révéler.
                  </p>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  {cards.map((card, index) => (
                    <div key={card.card_name} className="flex flex-col items-center gap-3">
                      <button
                        onClick={() => handleReveal(index)}
                        className={`card-flip ${
                          revealed[index] ? 'is-flipped' : ''
                        }`}
                        aria-label={`Révéler ${card.card_name}`}
                      >
                        <div className="card-face card-back">
                          <img
                            src={BACK_CARD_URL}
                            alt="Dos de carte"
                            loading="lazy"
                          />
                        </div>
                        <div className="card-face card-front">
                          <img
                            src={`${IMAGE_BASE_URL}${card.image_filename}`}
                            alt={card.card_name}
                            loading="lazy"
                          />
                        </div>
                      </button>
                      <p className="text-center text-xs text-slate-400">
                        {revealed[index] ? card.card_name : 'Carte mystère'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {topic && (
              <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
                <h3 className="text-lg font-semibold text-slate-100">
                  Lecture
                </h3>
                {status === 'loading' && (
                  <p className="mt-3 text-sm text-slate-400">
                    La tarologue respire et prépare ta réponse...
                  </p>
                )}
                {status === 'error' && (
                  <p className="mt-3 text-sm text-rose-200">{apiError}</p>
                )}
                {answer && (
                  <div className="mt-4 whitespace-pre-line text-sm text-slate-200">
                    {answer}
                  </div>
                )}
                {!answer && status === 'idle' && (
                  <p className="mt-3 text-sm text-slate-400">
                    Révèle les trois cartes pour débloquer la lecture.
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        <footer className="mt-10 text-xs text-slate-500">
          {deckStatus === 'loading'
            ? 'Chargement des cartes...'
            : 'Chaque tirage est unique et non déterministe.'}
        </footer>
      </div>
    </div>
  )
}

export default App
