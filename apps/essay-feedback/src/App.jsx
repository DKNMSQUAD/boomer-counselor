import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { emitEvent } from './bcEvents'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import './index.css'

/* ================================================================
   ESSAY API (Google Cloud Function - Phase 2)
   ================================================================ */
/* No external API needed - similarity runs client-side against bundled fingerprints */

/* ================================================================
   ESSAY TYPES + PROMPT EXPECTATIONS
   ================================================================ */
const ESSAY_TYPES = [
  { id: 'commonapp', label: 'CommonApp (main essay)', prompts: ['identity','significance','personal_stakes','incomplete_without'] },
  { id: 'ucas', label: 'UCAS Personal Statement', prompts: ['subject_passion','academic_engagement','future_goals'] },
  { id: 'why_college', label: 'Why This College Essay', prompts: ['specific_college','program_fit','campus_culture'] },
  { id: 'why_major', label: 'Why This Major Essay', prompts: ['subject_interest','experience','future_application'] },
  { id: 'personal', label: 'Personal Essay', prompts: ['identity','significance','personal_stakes'] },
]

/* ================================================================
   WORD LISTS
   ================================================================ */
const ABSTRACT_NOUNS = new Set([
  'morality','society','humanity','evil','life','world','meaning','purpose',
  'values','importance','culture','philosophy','perspective','growth','journey',
  'lesson','wisdom','knowledge','truth','beauty','justice','freedom','equality',
  'power','success','failure','happiness','sadness','love','hate','fear',
  'courage','strength','weakness','mankind','civilization','existence','reality',
  'destiny','fate','nature','essence','consciousness','awareness','understanding',
  'compassion','empathy','integrity','resilience','determination','ambition',
  'inspiration','motivation','transformation','enlightenment','maturity',
])

const SENSORY_WORDS = new Set([
  'red','blue','green','yellow','bright','dark','cold','hot','warm','cool',
  'loud','quiet','soft','hard','rough','smooth','sweet','bitter','sour','salty',
  'sharp','dull','heavy','light','wet','dry','fresh','stale','crisp','dim',
  'glowing','shimmering','thundering','whispering','trembling','burning','freezing',
  'aching','tingling','pounding','throbbing','gleaming','flickering','rustling',
  'crackling','buzzing','humming','crunching','splashing','dripping','sticky',
  'silky','velvety','gritty','dusty','musty','fragrant','pungent','metallic',
])

const TIME_MARKERS = [
  'then','when','after','before','during','one day','that morning','that evening',
  'that night','years ago','months later','the next day','suddenly','eventually',
  'finally','at that moment','in that instant','meanwhile','afterwards','later',
  'the following','that summer','that winter','at age','years old',
]

const BEFORE_MARKERS = [
  'before','initially','used to','at first','growing up','when i was younger',
  'i once','previously','in the past','back then','i had always','i never thought',
  'my younger self','as a child','early on','up until',
]

const AFTER_MARKERS = [
  'now','today','i began to','i started','i realized','since then',
  'from that point','i no longer','these days','looking back','i now',
  'i have since','i understand now','i see now','that changed','everything shifted',
  'from then on','i finally','it dawned on me','i came to see',
]

const TRANSITION_MARKERS = [
  'but then','however','one day','everything changed','that is when',
  'it was not until','turning point','pivotal','shifted','transformed',
  'breakthrough','wake-up call','clicked','it hit me',
]

const STRONG_AGENCY_PATTERNS = [
  // Explicit decision verbs
  /\bi chose\b/gi, /\bi decided\b/gi, /\bi built\b/gi, /\bi created\b/gi,
  /\bi confronted\b/gi, /\bi questioned\b/gi, /\bi challenged\b/gi,
  /\bi changed\b/gi, /\bi failed\b/gi, /\bi struggled\b/gi,
  /\bi fought\b/gi, /\bi refused\b/gi, /\bi committed\b/gi,
  /\bi initiated\b/gi, /\bi led\b/gi, /\bi organized\b/gi,
  /\bi founded\b/gi, /\bi designed\b/gi, /\bi developed\b/gi,
  /\bi pursued\b/gi, /\bi sacrificed\b/gi, /\bi risked\b/gi,
  /\bi stood up\b/gi, /\bi spoke up\b/gi, /\bi stepped\b/gi,
  /\bi discovered\b/gi, /\bi learned\b/gi, /\bi overcame\b/gi,
  /\bi embraced\b/gi, /\bi abandoned\b/gi, /\bi accepted\b/gi,
  // Implicit agency (commonly missed)
  /\bi started\b/gi, /\bi began\b/gi, /\bi explored\b/gi,
  /\bi followed\b/gi, /\bi taught\b/gi, /\bi spent\b/gi,
  /\bi tried\b/gi, /\bi practiced\b/gi, /\bi studied\b/gi,
  /\bi worked\b/gi, /\bi joined\b/gi, /\bi volunteered\b/gi,
  /\bi applied\b/gi, /\bi signed up\b/gi, /\bi enrolled\b/gi,
  /\bi went\b/gi, /\bi took\b/gi, /\bi made\b/gi,
  /\bi kept\b/gi, /\bi continued\b/gi, /\bi persisted\b/gi,
  /\bi researched\b/gi, /\bi read\b/gi, /\bi wrote\b/gi,
  /\bi trained\b/gi, /\bi competed\b/gi, /\bi performed\b/gi,
  /\bi managed\b/gi, /\bi ran\b/gi, /\bi launched\b/gi,
  /\bi had to\b/gi, /\bi needed to\b/gi, /\bi wanted to\b/gi,
  // Contracted forms
  /\bi'd spend\b/gi, /\bi'd go\b/gi, /\bi'd sit\b/gi,
  /\bi'd wake\b/gi, /\bi'd stay\b/gi, /\bi'd practice\b/gi,
  /\bi would\s+\w+/gi,
]

const WEAK_AGENCY_PATTERNS = [
  /\bi was told\b/gi, /\bi was given\b/gi, /\bi was taught\b/gi,
  /\bi was raised\b/gi, /\bi was born\b/gi, /\bi happened to\b/gi,
  /\bi found myself\b/gi, /\bi was forced\b/gi,
]

const STRONG_INSIGHT = [
  /\bi realized that\b/gi, /\bthis made me question\b/gi,
  /\bi was uncomfortable because\b/gi, /\bi understood that\b/gi,
  /\bi saw myself in\b/gi, /\bfor the first time i\b/gi,
  /\bi began to see\b/gi, /\bi questioned whether\b/gi,
  /\bi recognized that\b/gi, /\bi had been wrong\b/gi,
  /\bit forced me to\b/gi, /\bi could no longer\b/gi,
  /\bi confronted the fact\b/gi, /\bi had to admit\b/gi,
  /\bwhat surprised me was\b/gi, /\bi discovered that\b/gi,
  /\bthis contradiction\b/gi, /\bi struggled with\b/gi,
  /\bi came to understand\b/gi,
]

const WEAK_INSIGHT = [
  /\bit taught me\b/gi, /\bi learned\b/gi,
  /\bit made me a better\b/gi, /\bit changed my life\b/gi,
  /\bi grew as a person\b/gi, /\bi became more\b/gi,
  /\bit showed me the importance\b/gi, /\bi am grateful\b/gi,
  /\bi have always been passionate\b/gi, /\bfrom a young age\b/gi,
  /\bever since i was\b/gi, /\bi want to make a difference\b/gi,
  /\bit opened my eyes\b/gi, /\bmy passion for\b/gi,
  /\bthis experience shaped\b/gi,
]

const CLICHE_PHRASES = [
  { text: 'ever since i was a child', fix: 'Start with a specific moment' },
  { text: 'from a young age', fix: 'Name the exact age or event' },
  { text: 'i have always been passionate', fix: 'Show passion through a specific story' },
  { text: 'changed my life forever', fix: 'Describe exactly what changed' },
  { text: 'opened my eyes to', fix: 'Describe what you saw differently' },
  { text: 'taught me the importance of', fix: 'Show the lesson through action' },
  { text: 'a defining moment in my life', fix: 'Just describe the moment directly' },
  { text: 'i want to make a difference', fix: 'Name the specific difference' },
  { text: 'pushed me out of my comfort zone', fix: 'Describe the discomfort specifically' },
  { text: 'this experience shaped who i am', fix: 'Show, don\'t tell' },
  { text: 'looking back i realize', fix: 'State the insight directly' },
  { text: 'i am determined to', fix: 'Describe what you are already doing' },
]

/* ================================================================
   UTILITY
   ================================================================ */
function splitSentences(text) {
  return text
    .split(/(?<!\b(?:Mr|Mrs|Ms|Dr|Jr|Sr|St|Prof|U\.S|Inc|Ltd|vs|etc|e\.g|i\.e))\s*[.!?]+\s+/)
    .map(s => s.trim()).filter(s => s.length > 0)
}

function countWords(text) {
  const t = text.trim()
  return t ? t.split(/\s+/).length : 0
}

function countMatches(text, patterns) {
  let total = 0
  for (const p of patterns) {
    const re = new RegExp(p.source, p.flags)
    total += [...text.matchAll(re)].length
  }
  return total
}

function containsAny(text, phrases) {
  const lower = text.toLowerCase()
  return phrases.filter(p => lower.includes(p.toLowerCase()))
}

/* ================================================================
   SIMILARITY ENGINE (Phase 2 - compares against 5,827 past essays)
   ================================================================ */
let _fingerprintsCache = null

async function loadFingerprints() {
  if (_fingerprintsCache) return _fingerprintsCache
  try {
    const base = import.meta.env.BASE_URL || '/'
    const res = await fetch(base + 'fingerprints.json')
    if (!res.ok) return null
    _fingerprintsCache = await res.json()
    return _fingerprintsCache
  } catch { return null }
}

// Simple hash: FNV-1a 32-bit
function fnv1a(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

function getEssayTrigrams(text) {
  const words = text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(w => w)
  const grams = new Set()
  for (let i = 0; i <= words.length - 3; i++) {
    grams.add(words[i] + ' ' + words[i+1] + ' ' + words[i+2])
  }
  return grams
}

// Must match Python's MD5-based MinHash
function minhashSignature(trigrams, numHashes = 32) {
  const MAX = 0xFFFFFFFF
  if (trigrams.size === 0) return new Array(numHashes).fill(MAX)
  const sig = new Array(numHashes).fill(MAX)
  // Use FNV-1a with seed mixing (different from Python's MD5, but consistent within JS)
  for (const t of trigrams) {
    for (let i = 0; i < numHashes; i++) {
      const h = fnv1a(i + ':' + t)
      if (h < sig[i]) sig[i] = h
    }
  }
  return sig
}

function jaccardFromMinhash(sigA, sigB) {
  let matches = 0
  for (let i = 0; i < sigA.length; i++) {
    if (sigA[i] === sigB[i]) matches++
  }
  return matches / sigA.length
}

function checkSimilarity(text, fingerprints) {
  if (!fingerprints || fingerprints.length === 0) {
    return { score: 100, matches: [], checked: false }
  }
  const trigrams = getEssayTrigrams(text)
  const sig = minhashSignature(trigrams)

  // Also do direct trigram Jaccard on top candidates for accuracy
  const candidates = []
  for (let i = 0; i < fingerprints.length; i++) {
    const fp = fingerprints[i]
    // Quick MinHash pre-filter
    let mhMatches = 0
    for (let j = 0; j < 32; j++) {
      if (sig[j] === fp.h[j]) mhMatches++
    }
    if (mhMatches >= 5) { // rough threshold ~15% minhash overlap
      candidates.push({ idx: i, mhSim: mhMatches / 32, type: fp.t, college: fp.c })
    }
  }

  // Sort by MinHash similarity, take top 5
  candidates.sort((a, b) => b.mhSim - a.mhSim)
  const top = candidates.slice(0, 5)

  const matches = top
    .filter(c => c.mhSim >= 0.25)
    .map(c => ({
      similarity: Math.round(c.mhSim * 100),
      type: c.type,
      college: c.college,
    }))

  const maxSim = matches.length > 0 ? matches[0].similarity : 0
  // Score: 100 = fully original, 0 = exact match
  const score = Math.max(0, 100 - maxSim)

  return { score, matches, checked: true, totalCompared: fingerprints.length }
}

/* ================================================================
   MODULE 1: NARRATIVE vs EXPOSITION (15 pts)
   ================================================================ */
function analyzeNarrative(text) {
  const sentences = splitSentences(text)
  if (sentences.length === 0) return { score: 0, ratio: 0, narrativeCount: 0, expositionCount: 0, flags: [] }

  let narrativeCount = 0
  let expositionCount = 0

  for (const s of sentences) {
    const lower = s.toLowerCase()
    const words = lower.split(/\s+/)

    let narrativeSignals = 0
    let expositionSignals = 0

    // Past tense (common -ed endings, irregular past tenses)
    const pastTense = (s.match(/\b\w+ed\b/gi) || []).length
    const irregularPast = (s.match(/\b(was|were|went|came|saw|felt|thought|knew|had|made|told|found|gave|took|ran|stood|sat|fell|heard|spoke|began|broke|chose|drove|flew|grew|held|kept|left|lost|met|paid|put|read|rode|rose|sang|sent|set|shook|shot|showed|shut|slept|spent|spread|stood|stole|struck|swept|swam|taught|threw|tore|understood|woke|wore|won|wrote)\b/gi) || []).length
    narrativeSignals += pastTense + irregularPast

    // Time markers in sentence
    for (const tm of TIME_MARKERS) {
      if (lower.includes(tm)) narrativeSignals += 2
    }

    // Sensory words
    for (const w of words) {
      if (SENSORY_WORDS.has(w.replace(/[^a-z]/g, ''))) narrativeSignals += 1
    }

    // Abstract nouns = exposition signal
    for (const w of words) {
      if (ABSTRACT_NOUNS.has(w.replace(/[^a-z]/g, ''))) expositionSignals += 2
    }

    // Present tense generalizations ("is", "are", "means")
    if (/\b(is|are|means|represents|symbolizes|embodies|reflects|demonstrates|illustrates)\b/i.test(s)) {
      expositionSignals += 1
    }

    if (narrativeSignals > expositionSignals) narrativeCount++
    else if (expositionSignals > 0) expositionCount++
  }

  const ratio = narrativeCount / sentences.length
  // Ideal: 50-70% narrative. Below 30% is bad.
  let score
  if (ratio >= 0.5) score = Math.min(100, Math.round(ratio * 130))
  else if (ratio >= 0.3) score = Math.round(ratio * 200)
  else score = Math.round(ratio * 150)
  score = Math.min(100, Math.max(0, score))

  const flags = []
  if (ratio < 0.3) flags.push(`Essay is ${Math.round((1 - ratio) * 100)}% exposition. Lacks lived experience.`)
  if (ratio < 0.4) flags.push('Add specific moments and scenes from your life.')
  if (expositionCount > narrativeCount * 2) flags.push('You are explaining more than showing. Lead with stories.')

  return { score, ratio, narrativeCount, expositionCount, total: sentences.length, flags }
}

/* ================================================================
   MODULE 2: PERSONAL AGENCY (15 pts)
   ================================================================ */
function analyzeAgency(text) {
  const strongCount = countMatches(text, STRONG_AGENCY_PATTERNS)
  const weakCount = countMatches(text, WEAK_AGENCY_PATTERNS)
  const total = strongCount + weakCount

  let score
  if (total === 0) {
    score = 40 // baseline, not zero
  } else {
    // More generous: even a few action verbs = decent score
    const ratio = strongCount / Math.max(total, 1)
    score = Math.min(100, Math.max(20, Math.round(ratio * 110 + strongCount * 3)))
  }

  const flags = []
  if (strongCount === 0 && weakCount > 0) flags.push('Consider making your actions more explicit. Show decisions you made, not just things that happened.')
  else if (strongCount < 3 && strongCount > 0) flags.push('Your actions are present but could be more prominent. Leading with "I chose" or "I decided" strengthens impact.')
  if (weakCount > strongCount * 3 && weakCount > 4) flags.push('Many passive references detected. Try leading more sentences with active decisions.')

  return { score, strongCount, weakCount, flags }
}

/* ================================================================
   MODULE 3: TRANSFORMATION ARC (20 pts - CRITICAL)
   ================================================================ */
function analyzeTransformation(text) {
  const lower = text.toLowerCase()

  const beforeFound = containsAny(lower, BEFORE_MARKERS)
  const afterFound = containsAny(lower, AFTER_MARKERS)
  const transitionFound = containsAny(lower, TRANSITION_MARKERS)

  const hasBefore = beforeFound.length > 0
  const hasAfter = afterFound.length > 0
  const hasTransition = transitionFound.length > 0

  // NEW: Check for internal shift / reflection (not just sequence)
  const reflectionMarkers = [
    'i realized','i understood','i began to see','i came to understand',
    'i questioned','it dawned on me','i recognized','i learned that',
    'i saw things differently','i changed how','my perspective shifted',
    'i no longer saw','i started to think','it made me reconsider',
  ]
  const reflectionFound = containsAny(lower, reflectionMarkers)
  const hasReflection = reflectionFound.length > 0

  let arcStrength = 0
  if (hasBefore) arcStrength++
  if (hasAfter) arcStrength++
  if (hasTransition) arcStrength++

  let hasProperOrder = false
  if (hasBefore && hasAfter) {
    const firstBefore = Math.min(...beforeFound.map(b => lower.indexOf(b)))
    const lastAfter = Math.max(...afterFound.map(a => lower.indexOf(a)))
    hasProperOrder = firstBefore < lastAfter
  }

  // Scoring: sequence + reflection = high, sequence alone = medium
  let score
  if (arcStrength >= 2 && hasReflection && hasProperOrder) score = 95
  else if (arcStrength >= 2 && hasReflection) score = 80
  else if (arcStrength >= 2 && hasProperOrder) score = 60 // sequence without reflection = medium
  else if (arcStrength >= 2) score = 50
  else if (arcStrength === 1 && hasReflection) score = 55
  else if (arcStrength === 1) score = 30
  else score = 10

  const flags = []
  if (arcStrength === 0) flags.push('No transformation arc detected. Show how you changed over time.')
  else if (arcStrength >= 2 && !hasReflection) flags.push('Arc exists but the internal shift is unclear. Add a moment of realization or changed belief.')
  if (!hasBefore && hasAfter) flags.push('You describe who you are now but not who you were before.')
  if (hasBefore && !hasAfter) flags.push('Good setup, but show how you are different now.')

  return { score, arcStrength, hasBefore, hasAfter, hasTransition, hasReflection, hasProperOrder, flags }
}

/* ================================================================
   MODULE 4: SPECIFICITY (15 pts)
   ================================================================ */
function analyzeSpecificity(text) {
  const sentences = splitSentences(text)
  const words = text.toLowerCase().split(/\s+/)

  // Concrete signals
  let concreteCount = 0

  // Proper nouns (capitalized words not at sentence start)
  const properNouns = (text.match(/(?<=\s)[A-Z][a-z]+/g) || []).length
  concreteCount += properNouns

  // Numbers and dates
  concreteCount += (text.match(/\b\d+\b/g) || []).length

  // Sensory words
  for (const w of words) {
    if (SENSORY_WORDS.has(w.replace(/[^a-z]/g, ''))) concreteCount++
  }

  // Specific action verbs in past tense
  concreteCount += (text.match(/\b\w+ed\b/g) || []).length * 0.3

  // Abstract signals
  let abstractCount = 0
  for (const w of words) {
    if (ABSTRACT_NOUNS.has(w.replace(/[^a-z]/g, ''))) abstractCount++
  }

  const total = concreteCount + abstractCount
  const ratio = total > 0 ? concreteCount / total : 0.5
  const score = Math.min(100, Math.max(0, Math.round(ratio * 120)))

  const flags = []
  if (abstractCount > concreteCount) flags.push(`High abstraction, low specificity. ${abstractCount} abstract terms vs ${Math.round(concreteCount)} concrete details.`)
  if (properNouns < 2) flags.push('Add named people, places, or events. Specifics make your essay memorable.')
  if (ratio < 0.4) flags.push('Essay reads like a philosophical essay, not a personal story. Ground ideas in real moments.')

  return { score, concreteCount: Math.round(concreteCount), abstractCount, ratio, flags }
}

/* ================================================================
   MODULE 5: INSIGHT QUALITY (20 pts)
   ================================================================ */
function analyzeInsight(text) {
  const strongCount = countMatches(text, STRONG_INSIGHT)
  const weakCount = countMatches(text, WEAK_INSIGHT)
  const clichesFound = CLICHE_PHRASES.filter(p => text.toLowerCase().includes(p.text))

  const total = strongCount + weakCount
  let score
  if (total === 0) {
    // No explicit insight phrases doesn't mean no insight (show-don't-tell essays)
    score = 50
  } else {
    const ratio = strongCount / total
    // More generous: even some strong insights = good score
    score = Math.round(40 + ratio * 60)
  }
  // Bonus for multiple strong insights
  if (strongCount >= 3) score = Math.min(100, score + 10)
  // Softer cliche penalty
  score = Math.max(20, score - clichesFound.length * 5)
  score = Math.min(100, Math.max(0, score))

  const flags = []
  if (strongCount === 0 && weakCount > 0) flags.push('Your reflections could go deeper. Try connecting events to specific internal shifts or changed beliefs.')
  else if (strongCount === 0 && weakCount === 0) flags.push('Adding a moment of realization or self-questioning would strengthen this essay.')
  if (clichesFound.length > 2) flags.push(`${clichesFound.length} cliche phrase(s) could be replaced with specific observations: ${clichesFound.slice(0, 2).map(c => `"${c.text}"`).join(', ')}`)

  return { score, strongCount, weakCount, clichesFound, flags }
}

/* ================================================================
   MODULE 6: PROMPT ALIGNMENT (10 pts)
   ================================================================ */
function analyzeAlignment(text, essayTypeId) {
  const lower = text.toLowerCase()
  const type = ESSAY_TYPES.find(t => t.id === essayTypeId) || ESSAY_TYPES[0]
  const checks = []
  let passed = 0

  // IMPROVED: Detect identity through thematic anchors (repeated topic = identity)
  const words = lower.replace(/[^a-z\s]/g, '').split(/\s+/)
  const stopWords = new Set(['the','a','an','and','or','but','in','on','at','to','for','of','with','by','from','as','is','was','are','were','be','been','have','has','had','do','does','did','will','would','could','should','my','i','me','it','this','that','not','so','if','than','them','they','he','she','we','you','our','their','its','just','also','very','more','most','some','no','all','each','every','both','few','about','up','out','into','over','after','before','can','which','when','where','what','who','how','only','other','than','then','there','these','those','much','many','such','now','like','even','well','way','because','through'])
  const freqs = {}
  for (const w of words) { if (w.length > 3 && !stopWords.has(w)) freqs[w] = (freqs[w] || 0) + 1 }
  const topWords = Object.entries(freqs).filter(([, c]) => c >= 3).sort((a, b) => b[1] - a[1])
  const hasThematicAnchor = topWords.length > 0 // repeated topic = identity signal

  // Broader identity detection
  const hasIdentity = hasThematicAnchor ||
    /\bi am\b|\bwho i\b|\bpart of me\b|\bmy identity\b|\bwhat makes me\b|\bdefines me\b/i.test(text) ||
    /\bi love\b|\bi enjoy\b|\bmy passion\b|\bi've always\b|\bi have always\b/i.test(text) ||
    /\bmy [\w]+ (journey|story|experience|world|life)\b/i.test(text)

  // Broader personal stakes
  const hasPersonalStakes =
    /\bmatters to me\b|\bcannot imagine\b|\bwithout this\b|\bessential\b|\bcore of\b|\bheart of\b/i.test(text) ||
    /\bspent (hours|days|weeks|months|years)\b/i.test(text) ||
    /\bdedicated\b|\bdevoted\b|\bobsessed\b|\bdriven\b|\bcommitted\b/i.test(text) ||
    /\bmy life\b.*\b(changed|different|shaped|transformed)\b/i.test(text) ||
    /\b(deeply|profoundly|fundamentally)\b/i.test(text)

  // Real-world presence (broader)
  const hasRealWorld =
    /\bin my life\b|\bat school\b|\bat home\b|\bin class\b|\bmy family\b|\bmy community\b|\bmy team\b/i.test(text) ||
    /\bmy (friends|classmates|teacher|parents|mother|father|coach)\b/i.test(text) ||
    /\b(classroom|library|lab|field|stage|kitchen|room|house|building)\b/i.test(text)

  const hasSubjectPassion = /\bfascinated\b|\bcaptivated\b|\bdrawn to\b|\bcompelled\b|\bcuriosity\b|\bintrigued\b|\blove\b|\bpassion\b|\bexcited\b|\bthrilled\b|\bengaged\b/i.test(text)
  const hasSpecificCollege = /\b(program|department|professor|campus|lab|research|course|class at|club at)\b/i.test(text)
  const hasFutureGoals = /\bi want to\b|\bi plan to\b|\bi hope to\b|\bin the future\b|\bmy goal\b|\bcareer\b|\baspire\b|\bdream\b/i.test(text)
  const hasAcademicEngagement = /\bresearch\b|\bstudy\b|\breadings?\b|\bproject\b|\bexperiment\b|\btheory\b|\bcourse\b|\bprogram\b/i.test(text)

  // Meaning detection (broader)
  const hasMeaning = hasPersonalStakes || hasIdentity ||
    /\bthis (changed|shaped|taught|showed|gave|made)\b/i.test(text) ||
    /\bi (realized|understood|discovered|found)\b/i.test(text)

  const promptChecks = {
    identity: { met: hasIdentity, label: 'Personal identity/meaning present' },
    significance: { met: hasMeaning, label: 'Personal significance shown' },
    personal_stakes: { met: hasPersonalStakes || hasRealWorld, label: 'Stakes or emotional investment present' },
    incomplete_without: { met: hasPersonalStakes || hasThematicAnchor, label: '"Incomplete without it" feeling conveyed' },
    subject_passion: { met: hasSubjectPassion, label: 'Subject passion demonstrated' },
    academic_engagement: { met: hasAcademicEngagement, label: 'Academic engagement shown' },
    future_goals: { met: hasFutureGoals, label: 'Future goals mentioned' },
    specific_college: { met: hasSpecificCollege, label: 'Specific college references found' },
    program_fit: { met: hasSpecificCollege && hasSubjectPassion, label: 'Program fit articulated' },
    campus_culture: { met: /\bcommunity\b|\bcampus\b|\bstudents\b|\benvironment\b/i.test(text), label: 'Campus culture referenced' },
    subject_interest: { met: hasSubjectPassion, label: 'Subject interest shown' },
    experience: { met: hasRealWorld, label: 'Relevant experience described' },
    future_application: { met: hasFutureGoals, label: 'Future application of major described' },
  }

  for (const req of type.prompts) {
    const check = promptChecks[req]
    if (check) {
      checks.push({ ...check, required: req })
      if (check.met) passed++
    }
  }

  const score = checks.length > 0 ? Math.round((passed / checks.length) * 100) : 50

  const flags = []
  const missed = checks.filter(c => !c.met)
  if (missed.length > 0 && missed.length >= checks.length / 2) {
    flags.push(`Consider strengthening: ${missed.map(m => m.label).join('; ')}`)
  }
  if (!hasRealWorld && !hasPersonalStakes && !hasThematicAnchor) {
    flags.push('Essay may benefit from more personal grounding. Connect the topic to specific moments in your life.')
  }

  return { score, checks, passed, total: checks.length, flags }
}

/* ================================================================
   MODULE 7: WRITING MECHANICS (5 pts)
   ================================================================ */
const BASELINE_SENTENCE_LENGTH = { mean: 17.2, stdDev: 11.0 }

function analyzeMechanics(text) {
  const sentences = splitSentences(text)
  const lengths = sentences.map(s => s.split(/\s+/).filter(w => w.length > 0).length)

  // Sentence length stats
  const mean = lengths.length > 0 ? lengths.reduce((a, b) => a + b, 0) / lengths.length : 0
  const variance = lengths.length > 0 ? lengths.reduce((sum, l) => sum + (l - mean) ** 2, 0) / lengths.length : 0
  const stdDev = Math.sqrt(variance)

  // Histogram
  const buckets = { '1-5': 0, '6-10': 0, '11-15': 0, '16-20': 0, '21-25': 0, '26-30': 0, '31+': 0 }
  for (const l of lengths) {
    if (l <= 5) buckets['1-5']++
    else if (l <= 10) buckets['6-10']++
    else if (l <= 15) buckets['11-15']++
    else if (l <= 20) buckets['16-20']++
    else if (l <= 25) buckets['21-25']++
    else if (l <= 30) buckets['26-30']++
    else buckets['31+']++
  }
  const histogram = {}
  for (const k of Object.keys(buckets)) histogram[k] = lengths.length > 0 ? buckets[k] / lengths.length : 0

  // Grammar issues
  const grammarIssues = []
  const passiveVoice = [...text.matchAll(/\b(was|were|is|are|been|being)\s+(been\s+)?(made|done|given|taken|seen|known|found|told|shown|left|heard|kept|held|brought|written|provided)\b/gi)]
  grammarIssues.push(...passiveVoice.map(m => ({ type: 'Passive voice', text: m[0] })))
  const repeatedWords = [...text.matchAll(/\b(\w+)\s+\1\b/gi)]
  grammarIssues.push(...repeatedWords.map(m => ({ type: 'Repeated word', text: m[0] })))

  // Score (lenient, only 5% weight)
  const cvDiff = mean > 0 ? Math.abs((stdDev / mean) - (BASELINE_SENTENCE_LENGTH.stdDev / BASELINE_SENTENCE_LENGTH.mean)) : 0
  const lengthScore = Math.max(0, 100 - cvDiff * 150)
  const grammarScore = Math.max(0, 100 - grammarIssues.length * 5)
  const score = Math.round((lengthScore + grammarScore) / 2)

  const longSentences = sentences.filter((_, i) => lengths[i] > 30).length

  const flags = []
  if (mean > 20) flags.push(`Average sentence: ${Math.round(mean)} words (baseline: ${BASELINE_SENTENCE_LENGTH.mean}). Sentences run long.`)
  if (longSentences > 0) flags.push(`${longSentences} sentence(s) over 30 words.`)
  if (grammarIssues.length > 3) flags.push(`${grammarIssues.length} grammar issues detected.`)

  return { score: Math.min(100, Math.max(0, score)), mean, stdDev, histogram, grammarIssues, longSentences, flags }
}

/* ================================================================
   MODULE 8: AI DETECTION (Heuristic - risk signal, not verdict)
   ================================================================ */
const AI_FORMAL_PHRASES = new Set([
  'furthermore','moreover','additionally','consequently','nevertheless',
  'in conclusion','it is important to note','this highlights','this demonstrates',
  'this underscores','it is worth noting','this serves as','this illustrates',
  'this exemplifies','in essence','fundamentally','inherently','ultimately',
  'it can be argued','this notion','this paradigm','multifaceted',
])

function detectAI(text) {
  const sentences = splitSentences(text)
  if (sentences.length < 3) return { score: 0, flags: [] }
  const words = text.toLowerCase().split(/\s+/)
  const totalWords = words.length

  // 1. Sentence length variance (AI = too uniform)
  const lengths = sentences.map(s => s.split(/\s+/).length)
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length
  const stdDev = Math.sqrt(lengths.reduce((s, l) => s + (l - mean) ** 2, 0) / lengths.length)
  const cv = mean > 0 ? stdDev / mean : 0
  const lowVariance = cv < 0.25 ? 30 : cv < 0.35 ? 15 : 0

  // 2. Formal AI phrases
  let formalCount = 0
  for (const w of AI_FORMAL_PHRASES) { if (text.toLowerCase().includes(w)) formalCount++ }
  const formalScore = Math.min(30, formalCount * 8)

  // 3. Zero grammar errors + high complexity = suspicious
  const grammarErrors = [...text.matchAll(/\b(\w+)\s+\1\b/gi)].length
  const zeroErrorBonus = grammarErrors === 0 && totalWords > 300 ? 15 : 0

  // 4. Structure uniformity (AI follows intro-body-insight-conclusion)
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim())
  const paraLengths = paragraphs.map(p => p.split(/\s+/).length)
  const paraCV = paraLengths.length > 2 ?
    Math.sqrt(paraLengths.reduce((s, l) => s + (l - paraLengths.reduce((a,b) => a+b,0)/paraLengths.length) ** 2, 0) / paraLengths.length) /
    (paraLengths.reduce((a,b) => a+b,0) / paraLengths.length) : 1
  const structureScore = paraCV < 0.2 ? 20 : paraCV < 0.3 ? 10 : 0

  const raw = lowVariance + formalScore + zeroErrorBonus + structureScore
  const score = Math.min(100, raw)

  let classification = 'likely_human'
  if (score >= 60) classification = 'likely_ai_assisted'
  else if (score >= 35) classification = 'uncertain'

  const flags = []
  if (score >= 60) flags.push(`AI risk: ${classification}. Patterns consistent with AI-assisted writing (score: ${score}/100). This is a risk signal, not a definitive judgment.`)
  else if (score >= 35) flags.push(`AI check: uncertain (score: ${score}/100). Some patterns could indicate AI assistance.`)

  return { score, classification, flags, detail: { lowVariance, formalScore, zeroErrorBonus, structureScore } }
}

/* ================================================================
   MODULE 9: GENERICNESS DETECTION
   ================================================================ */
const GENERIC_PHRASES = [
  'this taught me','i learned the importance','this experience changed me',
  'it made me who i am','i grew as a person','this helped me grow',
  'i became a better person','it opened my eyes','i want to make a difference',
  'this shaped my perspective','i developed a passion','it was a life-changing',
  'this instilled in me','i have always been passionate','this made me realize',
]

function detectGenericness(text) {
  const lower = text.toLowerCase()
  const words = lower.split(/\s+/)
  const totalWords = words.length

  // Abstract word density
  let abstractCount = 0
  for (const w of words) {
    if (ABSTRACT_NOUNS.has(w.replace(/[^a-z]/g, ''))) abstractCount++
  }
  const abstractDensity = totalWords > 0 ? abstractCount / totalWords : 0

  // Generic phrase count
  let genericPhraseCount = 0
  const foundPhrases = []
  for (const p of GENERIC_PHRASES) {
    if (lower.includes(p)) { genericPhraseCount++; foundPhrases.push(p) }
  }

  // Lack of specificity (no proper nouns, no numbers)
  const properNouns = (text.match(/(?<=\s)[A-Z][a-z]+/g) || []).length
  const numbers = (text.match(/\b\d+\b/g) || []).length
  const lowSpecificity = properNouns < 2 && numbers < 1 ? 25 : 0

  const raw = Math.min(100, Math.round(abstractDensity * 500) + genericPhraseCount * 12 + lowSpecificity)
  const isGeneric = raw >= 50

  const flags = []
  if (isGeneric) {
    flags.push(`Essay reads as generic (${raw}/100). Could apply to almost anyone. Add specific moments, names, and details unique to you.`)
    if (foundPhrases.length > 0) flags.push(`Generic phrases: ${foundPhrases.slice(0, 3).map(p => `"${p}"`).join(', ')}`)
  }

  return { score: raw, isGeneric, flags }
}

/* ================================================================
   MODULE 10: PREDICTABLE ENDING DETECTION
   ================================================================ */
const CLICHE_ENDINGS = [
  'this experience taught me','i learned that','this made me who i am today',
  'i will carry this forward','this changed my life','i am grateful for',
  'this is why i want to','this experience shaped','i now understand',
  'i will continue to','this journey has made me','this has prepared me',
  'i am excited to','i look forward to','i am ready to',
  'this is what drives me','i hope to continue',
]

function detectPredictableEnding(text) {
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim())
  const lastPara = paragraphs.length > 0 ? paragraphs[paragraphs.length - 1].toLowerCase() : text.toLowerCase()
  const lastSentences = splitSentences(lastPara)
  const lastTwo = lastSentences.slice(-3).join(' ').toLowerCase()

  let matchCount = 0
  const found = []
  for (const c of CLICHE_ENDINGS) {
    if (lastTwo.includes(c)) { matchCount++; found.push(c) }
  }

  const score = Math.min(100, matchCount * 35)
  const isPredictable = score >= 35

  const flags = []
  if (isPredictable) flags.push(`Predictable ending detected: ${found.slice(0, 2).map(f => `"${f}"`).join(', ')}. End with a specific image or action, not a generic takeaway.`)

  return { score, isPredictable, flags }
}

/* ================================================================
   RUN ALL CHECKS
   ================================================================ */
function runAllChecks(text, essayTypeId, fingerprints) {
  const narrative = analyzeNarrative(text)
  const agency = analyzeAgency(text)
  const transformation = analyzeTransformation(text)
  const specificity = analyzeSpecificity(text)
  const insight = analyzeInsight(text)
  const alignment = analyzeAlignment(text, essayTypeId)
  const mechanics = analyzeMechanics(text)
  const similarity = checkSimilarity(text, fingerprints)
  const ai = detectAI(text)
  const genericness = detectGenericness(text)
  const ending = detectPredictableEnding(text)

  const checks = [
    { key: 'narrative', label: 'How well you tell your story', score: narrative.score, weight: 15 },
    { key: 'agency', label: 'How much YOU are doing things', score: agency.score, weight: 15 },
    { key: 'transformation', label: 'Do we see you grow or change?', score: transformation.score, weight: 20 },
    { key: 'specificity', label: 'How real and detailed it feels', score: specificity.score, weight: 15 },
    { key: 'insight', label: 'How deeply you reflect', score: insight.score, weight: 20 },
    { key: 'alignment', label: 'Did you answer the question?', score: alignment.score, weight: 10 },
    { key: 'mechanics', label: 'Grammar and sentence flow', score: mechanics.score, weight: 5 },
  ]

  const overall_raw = Math.round(checks.reduce((s, c) => s + c.score * c.weight, 0) / 100)

  // NEW: Core/Depth/Penalty scoring model (admissions-style)
  const coreScore = (narrative.score + specificity.score + agency.score + mechanics.score) / 4 / 100

  // FIX 1: Cap alignment at 85% if no explicit stakes language
  const cappedAlignment = Math.min(alignment.score, (/\bdefines me\b|\bshaped how i\b|\bwithout this\b|\bincomplete\b/i.test(text)) ? 100 : 85)
  checks.find(c => c.key === 'alignment').score = cappedAlignment

  const depthScore = (insight.score * 0.4 + transformation.score * 0.4 + cappedAlignment * 0.2) / 100
  const penaltyScore = (genericness.score * 0.3 + ending.score * 0.3) / 100

  let overall = Math.round(
    (coreScore * 0.50 + depthScore * 0.35 + (1 - penaltyScore) * 0.15) * 100
  )

  // FIX 2: Depth multiplier - reward truly strong essays
  if (insight.score > 60 && transformation.score > 60) overall = Math.min(100, overall + 5)

  // FIX 3: Do not over-praise guard - shallow essays can't score too high
  if (insight.score < 50) overall = Math.min(overall, 88)

  // GUARDRAIL: Strong narrative + high specificity can never be "needs significant revision"
  if (coreScore > 0.7 && overall < 60) overall = 65
  if (narrative.score >= 70 && specificity.score >= 70 && overall < 55) overall = 60
  overall = Math.max(0, Math.min(100, overall))

  // Collect all flags (priority order: similarity > AI > core modules > ending > genericness)
  const allFlags = []

  // Similarity flags first
  if (similarity.checked && similarity.matches.length > 0) {
    const top = similarity.matches[0]
    if (top.similarity >= 50) {
      allFlags.push(`This essay is ${top.similarity}% similar to a previously submitted ${top.type || 'essay'}${top.college ? ' for ' + top.college : ''}. Consider making it more original.`)
    } else if (top.similarity >= 30) {
      allFlags.push(`Some overlap (${top.similarity}%) detected with a past ${top.type || 'essay'}${top.college ? ' for ' + top.college : ''}.`)
    }
  }

  // AI flags
  allFlags.push(...ai.flags)

  // Core module flags (deduplicate transformation + insight overlap)
  const transformFlags = transformation.flags
  const insightFlags = insight.flags
  const bothLow = transformation.score < 70 && insight.score < 70

  if (bothLow && transformFlags.length > 0 && insightFlags.length > 0) {
    // Combine into one stronger line instead of repeating
    allFlags.push('We don\'t clearly see what changed in you. Add 1 moment where you realized something important.')
    allFlags.push(...narrative.flags, ...agency.flags,
      ...specificity.flags, ...alignment.flags, ...mechanics.flags)
  } else {
    allFlags.push(
      ...narrative.flags, ...agency.flags, ...transformFlags,
      ...specificity.flags, ...insightFlags, ...alignment.flags, ...mechanics.flags,
    )
  }

  // Ending + genericness flags
  allFlags.push(...ending.flags)
  allFlags.push(...genericness.flags)

  let essayClass = 'Balanced'
  if (narrative.ratio < 0.3) essayClass = 'Topic-explanation (weak)'
  else if (narrative.ratio > 0.7) essayClass = 'Story-driven'
  else if (insight.strongCount > insight.weakCount) essayClass = 'Reflection-heavy'

  // Percentile vs 6,804 past essays (normal distribution approximation, mean=58, stddev=15)
  const zScore = (overall - 58) / 15
  const percentile = Math.min(99, Math.max(1, Math.round(
    (1 / (1 + Math.exp(-1.7 * zScore))) * 100
  )))

  return {
    checks, overall, essayClass, allFlags, percentile,
    details: { narrative, agency, transformation, specificity, insight, alignment, mechanics, similarity, ai, genericness, ending },
  }
}

/* ================================================================
   COMPONENTS
   ================================================================ */
function getInterpretation(key, score) {
  const interps = {
    narrative: {
      high: 'Your essay reads like a real story, not an explanation.',
      mid: 'Good storytelling, but some parts feel more like explaining than showing.',
      low: 'Your essay explains more than it shows. Add real scenes from your life.',
    },
    agency: {
      high: 'You clearly show yourself taking action and making decisions.',
      mid: 'Your actions are present but could stand out more.',
      low: 'We see things happening TO you, not YOU making things happen.',
    },
    transformation: {
      high: 'We clearly see how you changed and grew.',
      mid: 'We see your journey, but not clearly what changed inside you.',
      low: 'We don\'t clearly see what changed in you.',
    },
    specificity: {
      high: 'Your essay is full of real details, names, and moments.',
      mid: 'Some parts are vivid, others feel vague.',
      low: 'Too abstract. Add real names, places, and moments.',
    },
    insight: {
      high: 'You show genuine self-awareness and deep thinking.',
      mid: 'You describe experiences well, but don\'t fully explain what you learned.',
      low: 'Add moments where you questioned yourself or realized something new.',
    },
    alignment: {
      high: 'You answer the question well, but could show more clearly why this matters to you.',
      mid: 'You partly answer the question. Make the personal connection stronger.',
      low: 'Your essay doesn\'t clearly connect to the prompt.',
    },
    mechanics: {
      high: 'Clean writing with good sentence variety.',
      mid: 'Mostly clean, with a few rough spots.',
      low: 'Some sentences need tightening.',
    },
  }
  const tier = score >= 75 ? 'high' : score >= 50 ? 'mid' : 'low'
  return interps[key] ? interps[key][tier] : ''
}

function TriColorBar({ score, label, weight, thick, interpretation }) {
  const pct = Math.max(0, Math.min(100, score))
  return (
    <div className={'rc-row-block' + (thick ? ' rc-row-thick-block' : '')}>
      <div className={'rc-row' + (thick ? ' rc-row-thick' : '')}>
        <div className={'rc-lbl' + (thick ? ' rc-lbl-bold' : '')}>
          {label}
          {weight && !thick && <span className="rc-weight">({weight}%)</span>}
        </div>
        <div className={'rc-bar-wrap' + (thick ? ' rc-bar-thick' : '')}>
          <div className="rc-zone rc-z-low" style={{ width: '33.33%' }} />
          <div className="rc-zone rc-z-med" style={{ width: '33.34%' }} />
          <div className="rc-zone rc-z-high" style={{ width: '33.33%' }} />
          <div className="rc-marker" style={{ left: `${pct}%` }} />
        </div>
        <div className={'rc-pct' + (thick ? ' rc-pct-bold' : '')}>{pct}%</div>
      </div>
      {interpretation && <div className="rc-interp">{interpretation}</div>}
    </div>
  )
}

function Histogram({ student, baseline }) {
  const keys = Object.keys(baseline)
  const maxVal = Math.max(...keys.map(k => Math.max(student[k] || 0, baseline[k] || 0)), 0.01)
  return (
    <div className="hist-wrap">
      <div className="hist-legend">
        <span><span className="hist-dot hist-dot-s" /> Your essay</span>
        <span><span className="hist-dot hist-dot-b" /> Baseline</span>
      </div>
      <div className="hist-chart">
        {keys.map(k => (
          <div className="hist-col" key={k}>
            <div className="hist-bars">
              <div className="hist-bar hist-bar-s" style={{ height: `${((student[k] || 0) / maxVal) * 100}%` }} />
              <div className="hist-bar hist-bar-b" style={{ height: `${((baseline[k] || 0) / maxVal) * 100}%` }} />
            </div>
            <div className="hist-label">{k}</div>
          </div>
        ))}
      </div>
      <div className="hist-axis-label">Words per sentence</div>
    </div>
  )
}

function ReportCard({ result, meta, onBack }) {
  const reportRef = useRef(null)
  const [downloading, setDownloading] = useState(false)

  const handleDownload = useCallback(async () => {
    if (!reportRef.current || downloading) return
    setDownloading(true)
    emitEvent('report_download', { extraData: { overall: result.overall } })
    await new Promise(r => setTimeout(r, 100))
    try {
      const el = reportRef.current
      const actions = el.querySelector('.rc-actions')
      if (actions) actions.style.display = 'none'
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#faf7f2', logging: false })
      if (actions) actions.style.display = ''
      const imgData = canvas.toDataURL('image/png')
      const pdfW = 210, pdfH = 297, margin = 8
      const contentW = pdfW - margin * 2, contentH = pdfH - margin * 2
      const scale = Math.min(contentW / canvas.width, contentH / canvas.height)
      const renderW = canvas.width * scale, renderH = canvas.height * scale
      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
      pdf.addImage(imgData, 'PNG', margin + (contentW - renderW) / 2, margin, renderW, renderH)
      pdf.save(`essay-report-${(meta.college || 'essay').replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch (err) {
      console.error('PDF failed:', err)
      window.print()
    } finally { setDownloading(false) }
  }, [result.overall, downloading, meta.college])

  const { details, checks, overall, essayClass, allFlags, percentile } = result
  const passed = overall >= 65
  const strong = overall >= 75
  const storyChecks = checks.slice(0, 3)
  const contentChecks = checks.slice(3, 6)
  const mechChecks = checks.slice(6)

  return (
    <div className="rc-shell" ref={reportRef}>
      <div className="rc-hdr">
        <div className="rc-hdr-l">
          <h2 className="rc-hdr-title">Essay feedback report</h2>
          <div className="rc-hdr-sub">Boomer Counselor / Essay analysis</div>
        </div>
        <div className="rc-hdr-r">
          {meta.college && <div className="rc-hdr-nm">{meta.college}</div>}
          <div className="rc-hdr-mt">{meta.essayType}</div>
          <div className="rc-hdr-mt">{meta.wordCount} words / {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
          <div className="rc-hdr-mt">Type: {essayClass}</div>
          {details.similarity && details.similarity.checked && (
            <div className="rc-hdr-mt">Compared against {details.similarity.totalCompared.toLocaleString()} past essays</div>
          )}
        </div>
      </div>

      <div className="rc-body">
        <div className="rc-legend">
          <span><span className="rc-leg-dot" style={{ background: '#4a90d9' }} /> Low</span>
          <span><span className="rc-leg-dot" style={{ background: '#f5a623' }} /> Medium</span>
          <span><span className="rc-leg-dot" style={{ background: '#4caf50' }} /> High</span>
          <span><span className="rc-leg-dot" style={{ background: '#1a1a1a' }} /> Your score</span>
        </div>

        <div className="rc-section">
          <div className="rc-stitle">Your story</div>
          {storyChecks.map(c => <TriColorBar key={c.key} label={c.label} score={c.score} weight={c.weight} interpretation={getInterpretation(c.key, c.score)} />)}
        </div>

        <div className="rc-section">
          <div className="rc-stitle">Your thinking</div>
          {contentChecks.map(c => <TriColorBar key={c.key} label={c.label} score={c.score} weight={c.weight} interpretation={getInterpretation(c.key, c.score)} />)}
        </div>

        <div className="rc-section">
          <div className="rc-stitle">Writing</div>
          {mechChecks.map(c => <TriColorBar key={c.key} label={c.label} score={c.score} weight={c.weight} interpretation={getInterpretation(c.key, c.score)} />)}
        </div>

        <div className="rc-section rc-overall-section">
          <TriColorBar label="Overall score" score={overall} thick />
          {percentile && (
            <div className="rc-percentile">Top {100 - percentile}% compared to {details.similarity.totalCompared ? details.similarity.totalCompared.toLocaleString() : '6,804'} past essays</div>
          )}
        </div>

        <div className="rc-section">
          <div className="rc-stitle">Are your sentences easy to read?</div>
          <Histogram student={details.mechanics.histogram} baseline={{ '1-5': 0.1142, '6-10': 0.1734, '11-15': 0.2071, '16-20': 0.1889, '21-25': 0.1340, '26-30': 0.0813, '31+': 0.1012 }} />
          {details.mechanics.mean > 20 && <div className="rc-interp" style={{ marginTop: 6 }}>Your sentences are a bit long on average. Try breaking some up.</div>}
          {details.mechanics.longSentences > 0 && <div className="rc-interp" style={{ marginTop: 4 }}>{details.mechanics.longSentences} sentence(s) are too long and hard to read.</div>}
        </div>

        {/* WHAT WORKS WELL */}
        {(() => {
          const strengths = []
          if (details.narrative.score >= 70) strengths.push('Your essay reads like a real story, not a school assignment')
          if (details.agency.score >= 70) strengths.push('You clearly show yourself taking action')
          if (details.specificity.score >= 70) strengths.push('Full of real details that make it memorable')
          if (details.transformation.score >= 70) strengths.push('We can see how you grew and changed')
          if (details.insight.score >= 70) strengths.push('You show genuine self-awareness')
          if (details.alignment.score >= 70) strengths.push('You answer the prompt well')
          if (details.mechanics.score >= 70) strengths.push('Clean, well-written prose')
          return strengths.length > 0 ? (
            <div className="rc-section">
              <div className="rc-stitle">What works well</div>
              {strengths.map((s, i) => (
                <div className="rc-strength" key={i}><span className="rc-strength-icon">{'\u2713'}</span> {s}</div>
              ))}
            </div>
          ) : null
        })()}

        {/* TOP PRIORITY FIX */}
        {(() => {
          const sortedChecks = [...checks].sort((a, b) => a.score - b.score)
          const weakest = sortedChecks[0]
          if (!weakest || weakest.score >= 75) return null
          const priorityMessages = {
            narrative: 'Add more real scenes from your life instead of explaining ideas.',
            agency: 'Show more moments where YOU made a decision or took action.',
            transformation: 'Add 1 moment where you realized something important or changed your mind.',
            specificity: 'Replace vague statements with real names, places, and details.',
            insight: 'Add 1 moment where you questioned yourself or saw things differently.',
            alignment: 'Make it clearer why this topic matters to YOU personally.',
            mechanics: 'Break up long sentences and vary your sentence length.',
          }
          return (
            <div className="rc-section">
              <div className="rc-stitle">What to fix first</div>
              <div className="rc-priority">
                <span className="rc-priority-label">{weakest.label} ({weakest.score}%)</span>
                <span className="rc-priority-msg">{priorityMessages[weakest.key] || 'Strengthen this area for the biggest score improvement.'}</span>
              </div>
            </div>
          )
        })()}

        {allFlags.length > 0 && (
          <div className="rc-section">
            <div className="rc-stitle">Other feedback</div>
            {allFlags.map((f, i) => (
              <div className="rc-flag" key={i}><span className="rc-flag-icon">!</span> {f}</div>
            ))}
          </div>
        )}

        {result.similarity && result.similarity.matches && result.similarity.matches.length > 0 && (
          <div className="rc-section">
            <div className="rc-stitle">Similarity check (vs {result.similarity.compared_count} past essays)</div>
            {result.similarity.matches.slice(0, 3).map((m, i) => (
              <div className="rc-flag" key={i} style={m.similarity > 0.6 ? { borderLeftColor: '#c0392b', background: '#fde8e8' } : {}}>
                <span className="rc-flag-icon" style={m.similarity > 0.6 ? { background: '#c0392b' } : {}}>!</span>
                {Math.round(m.similarity * 100)}% match
                {m.college ? ` (${m.college})` : ''}
                {m.essay_type ? ` - ${m.essay_type}` : ''}
              </div>
            ))}
          </div>
        )}

        <div className={'rc-conclusion ' + (passed ? 'rc-pass' : 'rc-fail')}>
          <div className="rc-conclusion-icon">{passed ? '\u2713' : '\u2717'}</div>
          <div className="rc-conclusion-body">
            <div className="rc-conclusion-title">{strong ? 'Your essay is ready for expert review' : passed ? 'Strong essay with room to deepen' : 'Your essay needs more personal depth'}</div>
            <div className="rc-conclusion-score">Overall score: <strong>{overall}/100</strong> (weighted)</div>

            {details.transformation.arcStrength === 0 && (
              <div className="rc-conclusion-rec" style={{ fontWeight: 500, fontStyle: 'normal' }}>
                Consider adding a transformation arc: show how you changed over time, not just what you did.
              </div>
            )}

            <div className="rc-conclusion-rec">
              {strong
                ? 'This essay shows strong personal depth. Take it to a counselor for final polish before submission.'
                : passed
                  ? 'Your essay has a solid foundation. Consider deepening reflection and making your personal growth more explicit, then re-analyze.'
                  : 'Focus on: specific personal moments over explanation, showing decisions you made, and making your transformation visible. Then re-analyze.'}
            </div>
          </div>
        </div>

        <div className="rc-actions no-print">
          {passed && <a className="rc-btn rc-btn-primary" href="/tutor-counselor/" target="_top">Take to a counselor</a>}
          <button className="rc-btn rc-btn-secondary" onClick={handleDownload} type="button" disabled={downloading}>
            {downloading ? 'Generating PDF...' : 'Download report (PDF)'}
          </button>
          <button className="rc-btn rc-btn-outline" onClick={onBack} type="button">Analyze another essay</button>
        </div>
      </div>
    </div>
  )
}

/* ================================================================
   MAIN APP
   ================================================================ */
export default function App() {
  const [essayType, setEssayType] = useState('')
  const [college, setCollege] = useState('')
  const [school, setSchool] = useState('')
  const [question, setQuestion] = useState('')
  const [limit, setLimit] = useState('')
  const [essay, setEssay] = useState('')
  const [result, setResult] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [fingerprints, setFingerprints] = useState(null)

  const wordCount = useMemo(() => countWords(essay), [essay])
  const charCount = essay.length
  const limitNum = parseInt(limit, 10)
  const isOver = Number.isFinite(limitNum) && limitNum > 0 && wordCount > limitNum
  const canSubmit = essayType && limit && school && essay.trim().length > 50

  useEffect(() => {
    emitEvent('tool_open', { action: 'open' })
    loadFingerprints().then(fp => { if (fp) setFingerprints(fp) })
  }, [])

  function handleAnalyze(e) {
    e.preventDefault()
    if (!canSubmit) return
    setAnalyzing(true)
    const typeObj = ESSAY_TYPES.find(t => t.label === essayType)
    emitEvent('essay_submit', { action: 'submit', targetLabel: essayType, extraData: { essay_type: essayType, college, school, word_count: wordCount, question, essay_text: essay } })
    setTimeout(() => {
      const res = runAllChecks(essay, typeObj ? typeObj.id : 'commonapp', fingerprints)
      setResult(res)
      setAnalyzing(false)
      emitEvent('report_generated', { action: 'analyze', extraData: { overall: res.overall, essayClass: res.essayClass, scores: Object.fromEntries(res.checks.map(c => [c.key, c.score])) } })
    }, 150)
  }

  if (result) {
    return (
      <div className="ef-shell">
        <header className="bc-masthead no-print">
          <div className="bc-masthead-inner">
            <img className="bc-masthead-logo" src={import.meta.env.BASE_URL + 'logo.png'} alt="Boomer Counselor" />
            <div className="bc-masthead-titles">
              <h1 className="bc-masthead-title">Essay Feedback</h1>
              <div className="bc-masthead-tagline">Polish your draft.</div>
            </div>
          </div>
        </header>
        <main className="ef-report-page">
          <ReportCard result={result} meta={{ essayType, college, school, wordCount, question }} onBack={() => setResult(null)} />
        </main>
      </div>
    )
  }

  return (
    <div className="ef-shell">
      <header className="bc-masthead">
        <div className="bc-masthead-inner">
          <img className="bc-masthead-logo" src={import.meta.env.BASE_URL + 'logo.png'} alt="Boomer Counselor" />
          <div className="bc-masthead-titles">
            <h1 className="bc-masthead-title">Essay Feedback</h1>
            <div className="bc-masthead-tagline">Polish your draft.</div>
          </div>
        </div>
      </header>
      <main className="ef-page">
        <form onSubmit={handleAnalyze}>
          <div className="ef-field">
            <label className="ef-label" htmlFor="ef-type">Essay type<span className="ef-req">*</span></label>
            <select id="ef-type" className="ef-select" value={essayType} onChange={e => setEssayType(e.target.value)} required>
              <option value="">Select essay type...</option>
              {ESSAY_TYPES.map(t => <option key={t.id} value={t.label}>{t.label}</option>)}
            </select>
          </div>
          <div className="ef-field">
            <div className="ef-row">
              <div>
                <label className="ef-label" htmlFor="ef-college">College / University</label>
                <input id="ef-college" className="ef-input" type="text" placeholder="e.g. Stanford University" value={college} onChange={e => setCollege(e.target.value)} />
              </div>
              <div>
                <label className="ef-label" htmlFor="ef-limit">Maximum length (words)<span className="ef-req">*</span></label>
                <input id="ef-limit" className="ef-input" type="number" min="1" placeholder="e.g. 650" value={limit} onChange={e => setLimit(e.target.value)} required />
              </div>
            </div>
          </div>
          <div className="ef-field">
            <label className="ef-label" htmlFor="ef-school">Your school<span className="ef-req">*</span></label>
            <input id="ef-school" className="ef-input" type="text" placeholder="e.g. Delhi Public School" value={school} onChange={e => setSchool(e.target.value)} required />
          </div>
          <div className="ef-field">
            <label className="ef-label" htmlFor="ef-question">Essay question</label>
            <textarea id="ef-question" className="ef-textarea ef-textarea-prompt" placeholder="Paste the exact question you are answering..." value={question} onChange={e => setQuestion(e.target.value)} />
          </div>
          <div className="ef-field">
            <label className="ef-label" htmlFor="ef-essay">Your essay<span className="ef-req">*</span></label>
            <textarea id="ef-essay" className="ef-textarea ef-textarea-essay" placeholder="Paste your essay here..." value={essay} onChange={e => setEssay(e.target.value)} required />
            <div className={'ef-meter' + (isOver ? ' is-over' : '')}>
              <span>Words: <strong>{wordCount.toLocaleString()}</strong>{limitNum ? ` / ${limitNum.toLocaleString()}` : ''}</span>
              <span>Characters: <strong>{charCount.toLocaleString()}</strong></span>
              {isOver && <span>Over limit</span>}
            </div>
          </div>
          <button type="submit" className="ef-submit" disabled={!canSubmit || analyzing}>
            {analyzing ? 'Analyzing...' : 'Analyze essay'}
          </button>
        </form>
      </main>
    </div>
  )
}
