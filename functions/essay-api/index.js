const { Firestore } = require('@google-cloud/firestore')
const cors = require('cors')({ origin: true })

const db = new Firestore()
const ESSAYS = db.collection('essays')
const BASELINES = db.collection('baselines')

// ============================================================
// Trigram utilities
// ============================================================
function getTrigrams(text) {
  const words = text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(w => w.length > 0)
  const grams = new Set()
  for (let i = 0; i < words.length - 2; i++) {
    grams.add(words[i] + ' ' + words[i + 1] + ' ' + words[i + 2])
  }
  return grams
}

function jaccard(setA, setB) {
  let intersection = 0
  for (const item of setA) {
    if (setB.has(item)) intersection++
  }
  const union = setA.size + setB.size - intersection
  return union > 0 ? intersection / union : 0
}

// ============================================================
// Sentence stats
// ============================================================
function computeStats(text) {
  const sentences = text.split(/\s*[.!?]+\s+/).map(s => s.trim()).filter(s => s.length > 0)
  const lengths = sentences.map(s => s.split(/\s+/).filter(w => w.length > 0).length)
  const words = text.split(/\s+/).filter(w => w.length > 0)
  const wordCount = words.length
  const sentenceCount = lengths.length

  if (sentenceCount === 0) return { wordCount, sentenceCount: 0, avgSentenceLength: 0, stdDev: 0, iRatio: 0 }

  const mean = lengths.reduce((a, b) => a + b, 0) / sentenceCount
  const variance = lengths.reduce((sum, l) => sum + (l - mean) ** 2, 0) / sentenceCount
  const stdDev = Math.sqrt(variance)
  const iCount = (text.match(/\bI\b/g) || []).length
  const iRatio = iCount / wordCount

  return { wordCount, sentenceCount, avgSentenceLength: Math.round(mean * 10) / 10, stdDev: Math.round(stdDev * 10) / 10, iRatio: Math.round(iRatio * 10000) / 10000, iCount }
}

// ============================================================
// STORE - Save a new essay
// ============================================================
async function handleStore(body) {
  const { essay_text, essay_type, college, question, school, student_name, student_email } = body
  if (!essay_text || essay_text.length < 50) return { error: 'Essay text too short' }

  const trigrams = getTrigrams(essay_text)
  const stats = computeStats(essay_text)

  const doc = {
    essay_text,
    essay_type: essay_type || '',
    college: college || '',
    question: question || '',
    school: school || '',
    student_name: student_name || '',
    student_email: student_email || '',
    trigrams: [...trigrams],
    stats,
    created_at: Firestore.FieldValue.serverTimestamp(),
  }

  const ref = await ESSAYS.add(doc)

  // Update running baselines
  await updateBaselines(stats)

  return { id: ref.id, stored: true, stats }
}

// ============================================================
// SIMILARITY - Compare essay against stored essays
// ============================================================
async function handleSimilarity(body) {
  const { essay_text, essay_type, college } = body
  if (!essay_text || essay_text.length < 50) return { error: 'Essay text too short' }

  const inputTrigrams = getTrigrams(essay_text)
  if (inputTrigrams.size === 0) return { matches: [], max_similarity: 0 }

  // Filter: same essay type first, then broaden if needed
  let query = ESSAYS.limit(500)
  if (essay_type) query = ESSAYS.where('essay_type', '==', essay_type).limit(300)

  const snapshot = await query.get()
  const matches = []

  snapshot.forEach(doc => {
    const data = doc.data()
    if (!data.trigrams || data.trigrams.length === 0) return

    const storedTrigrams = new Set(data.trigrams)
    const score = jaccard(inputTrigrams, storedTrigrams)

    if (score > 0.15) {
      matches.push({
        id: doc.id,
        similarity: Math.round(score * 100) / 100,
        college: data.college || '',
        essay_type: data.essay_type || '',
        student_name: data.student_name || '',
        word_count: data.stats ? data.stats.wordCount : 0,
      })
    }
  })

  matches.sort((a, b) => b.similarity - a.similarity)
  const top = matches.slice(0, 5)
  const maxSim = top.length > 0 ? top[0].similarity : 0

  let flag = null
  if (maxSim > 0.8) flag = { severity: 'high', message: 'This essay is very similar to a previously submitted essay.' }
  else if (maxSim > 0.6) flag = { severity: 'medium', message: 'This essay shares significant structural similarity with existing essays.' }
  else if (maxSim > 0.4) flag = { severity: 'low', message: 'Some structural similarity detected with past essays.' }

  return { matches: top, max_similarity: maxSim, flag, compared_count: snapshot.size }
}

// ============================================================
// BASELINES - Return dynamic baselines
// ============================================================
async function handleBaselines() {
  const doc = await BASELINES.doc('global').get()
  if (!doc.exists) {
    // Return defaults if not yet computed
    return {
      avg_sentence_length: 17.2,
      std_dev: 11.0,
      i_ratio: 0.0225,
      word_count_mean: 247,
      essay_count: 0,
      histogram: { '1-5': 0.1142, '6-10': 0.1734, '11-15': 0.2071, '16-20': 0.1889, '21-25': 0.1340, '26-30': 0.0813, '31+': 0.1012 },
    }
  }
  return doc.data()
}

// ============================================================
// Update running baselines incrementally
// ============================================================
async function updateBaselines(newStats) {
  const ref = BASELINES.doc('global')
  const doc = await ref.get()

  if (!doc.exists) {
    await ref.set({
      avg_sentence_length: newStats.avgSentenceLength,
      std_dev: newStats.stdDev,
      i_ratio: newStats.iRatio,
      word_count_mean: newStats.wordCount,
      essay_count: 1,
      sum_sentence_length: newStats.avgSentenceLength,
      sum_std_dev: newStats.stdDev,
      sum_i_ratio: newStats.iRatio,
      sum_word_count: newStats.wordCount,
    })
    return
  }

  const data = doc.data()
  const n = (data.essay_count || 0) + 1
  const sumSL = (data.sum_sentence_length || 0) + newStats.avgSentenceLength
  const sumSD = (data.sum_std_dev || 0) + newStats.stdDev
  const sumIR = (data.sum_i_ratio || 0) + newStats.iRatio
  const sumWC = (data.sum_word_count || 0) + newStats.wordCount

  await ref.update({
    essay_count: n,
    sum_sentence_length: sumSL,
    sum_std_dev: sumSD,
    sum_i_ratio: sumIR,
    sum_word_count: sumWC,
    avg_sentence_length: Math.round((sumSL / n) * 10) / 10,
    std_dev: Math.round((sumSD / n) * 10) / 10,
    i_ratio: Math.round((sumIR / n) * 10000) / 10000,
    word_count_mean: Math.round(sumWC / n),
  })
}

// ============================================================
// Main entry point
// ============================================================
exports.essayApi = (req, res) => {
  cors(req, res, async () => {
    try {
      if (req.method === 'OPTIONS') return res.status(204).send('')
      if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

      const path = req.path || '/'
      const body = req.body || {}

      if (path === '/similarity' && req.method === 'POST') {
        const result = await handleSimilarity(body)
        return res.json(result)
      }

      if (path === '/store' && req.method === 'POST') {
        const result = await handleStore(body)
        return res.json(result)
      }

      if (path === '/baselines') {
        const result = await handleBaselines()
        return res.json(result)
      }

      return res.json({ status: 'ok', endpoints: ['/similarity', '/store', '/baselines'] })
    } catch (err) {
      console.error('Essay API error:', err)
      res.status(500).json({ error: err.message })
    }
  })
}
