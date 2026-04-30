/**
 * One-time script: Load past essays from Excel into Firestore
 * Run from Mac: node ingest.js /path/to/Final_Essay_Submission_.xlsx
 */
const { Firestore } = require('@google-cloud/firestore')
const XLSX = require('xlsx')
const path = require('path')

const db = new Firestore({ projectId: 'nm-squad-492811' })
const ESSAYS = db.collection('essays')
const BASELINES = db.collection('baselines')

function getTrigrams(text) {
  const words = text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(w => w.length > 0)
  const grams = []
  for (let i = 0; i < words.length - 2; i++) {
    grams.push(words[i] + ' ' + words[i + 1] + ' ' + words[i + 2])
  }
  return [...new Set(grams)]
}

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
  return {
    wordCount, sentenceCount,
    avgSentenceLength: Math.round(mean * 10) / 10,
    stdDev: Math.round(stdDev * 10) / 10,
    iRatio: Math.round((iCount / wordCount) * 10000) / 10000,
    iCount,
  }
}

async function ingest(filePath) {
  console.log('Reading Excel:', filePath)
  const workbook = XLSX.readFile(filePath)
  const essays = []

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })

    for (const row of rows) {
      const text = String(row['Essay'] || row['essay'] || '').trim()
      if (text.length < 100 || text === 'nan') continue

      const name = String(row['Name'] || row['name'] || '').trim()
      const type = String(row['Type'] || row['type'] || '').trim()
      const college = String(row['College'] || row['college'] || '').trim()
      const question = String(row['Question'] || row['question'] || '').trim()
      const email = String(row['Email'] || row['Email Address'] || row['email'] || '').trim()

      essays.push({ text, name, type, college, question, email, sheet: sheetName })
    }
  }

  console.log(`Found ${essays.length} essays across ${workbook.SheetNames.length} sheets`)

  // Batch write to Firestore (500 per batch)
  const BATCH_SIZE = 400
  let written = 0
  let sumSL = 0, sumSD = 0, sumIR = 0, sumWC = 0

  for (let i = 0; i < essays.length; i += BATCH_SIZE) {
    const batch = db.batch()
    const chunk = essays.slice(i, i + BATCH_SIZE)

    for (const e of chunk) {
      const stats = computeStats(e.text)
      const trigrams = getTrigrams(e.text)

      // Skip if too few trigrams (likely garbage data)
      if (trigrams.length < 5) continue

      const ref = ESSAYS.doc()
      batch.set(ref, {
        essay_text: e.text,
        essay_type: e.type,
        college: e.college,
        question: e.question,
        student_name: e.name,
        student_email: e.email,
        school: '',
        source_sheet: e.sheet,
        trigrams,
        stats,
        created_at: Firestore.FieldValue.serverTimestamp(),
      })

      sumSL += stats.avgSentenceLength
      sumSD += stats.stdDev
      sumIR += stats.iRatio
      sumWC += stats.wordCount
      written++
    }

    await batch.commit()
    console.log(`  Written ${Math.min(i + BATCH_SIZE, essays.length)}/${essays.length}`)
  }

  // Store baselines
  const n = written
  await BASELINES.doc('global').set({
    essay_count: n,
    avg_sentence_length: Math.round((sumSL / n) * 10) / 10,
    std_dev: Math.round((sumSD / n) * 10) / 10,
    i_ratio: Math.round((sumIR / n) * 10000) / 10000,
    word_count_mean: Math.round(sumWC / n),
    sum_sentence_length: sumSL,
    sum_std_dev: sumSD,
    sum_i_ratio: sumIR,
    sum_word_count: sumWC,
  })

  console.log(`\nDone! ${written} essays stored. Baselines computed.`)
  console.log(`  Avg sentence length: ${Math.round((sumSL / n) * 10) / 10}`)
  console.log(`  Avg std dev: ${Math.round((sumSD / n) * 10) / 10}`)
  console.log(`  Avg I ratio: ${Math.round((sumIR / n) * 10000) / 10000}`)
  console.log(`  Avg word count: ${Math.round(sumWC / n)}`)
}

const file = process.argv[2]
if (!file) {
  console.error('Usage: node ingest.js /path/to/Final_Essay_Submission_.xlsx')
  process.exit(1)
}
ingest(path.resolve(file)).catch(err => { console.error(err); process.exit(1) })
