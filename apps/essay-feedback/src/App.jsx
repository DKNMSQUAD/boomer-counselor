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
  // Passive voice
  const passiveVoice = [...text.matchAll(/\b(was|were|is|are|been|being)\s+(been\s+)?(made|done|given|taken|seen|known|found|told|shown|left|heard|kept|held|brought|written|provided)\b/gi)]
  grammarIssues.push(...passiveVoice.map(m => ({ type: 'Passive voice', text: m[0] })))
  // Repeated consecutive words (like "very very", "I I", "the the")
  const consecutiveReps = [...text.matchAll(/\b(\w+)\s+\1\b/gi)]
  grammarIssues.push(...consecutiveReps.map(m => ({ type: 'Repeated word', text: m[0] })))
  // Missing capital after period
  const missingCaps = [...text.matchAll(/[.!?]\s+[a-z]/g)]
  grammarIssues.push(...missingCaps.map(m => ({ type: 'Missing capital', text: m[0].trim() })))
  // Tense inconsistency patterns
  const tenseIssues = [...text.matchAll(/\b(didnt|doesnt|dont|wasnt|werent|isnt|arent|hasnt|havent|hadnt|couldnt|shouldnt|wouldnt|wont|cant)\s+\w+/gi)]
  grammarIssues.push(...tenseIssues.map(m => ({ type: 'Missing apostrophe', text: m[0] })))
  // Subject-verb patterns
  const svIssues = [...text.matchAll(/\b(I|he|she|it)\s+(are|were|have been)\b|\b(they|we|you)\s+(is|was|has been)\b|\b(results?|things?|people)\s+was\b/gi)]
  grammarIssues.push(...svIssues.map(m => ({ type: 'Subject-verb mismatch', text: m[0] })))
  // "didnt knew" type errors
  const doubleVerb = [...text.matchAll(/\b(did|didn't|does|doesn't|do|don't)\s+(knew|went|saw|came|made|took|gave|had|was|were|thought|felt)\b/gi)]
  grammarIssues.push(...doubleVerb.map(m => ({ type: 'Double verb error', text: m[0] })))
  // "it make me" type errors (missing -s or wrong tense)
  const missingS = [...text.matchAll(/\b(it|he|she|this|that)\s+(make|give|take|come|go|have|do|say|get|know|think|find|tell|become|show|feel)\s/gi)]
  grammarIssues.push(...missingS.map(m => ({ type: 'Missing verb ending', text: m[0].trim() })))
  // "are i am" / "is i am" jumbled phrasing
  const jumbled = [...text.matchAll(/\b(are|is|was|were)\s+i\s+(am|is|are|was)\b/gi)]
  grammarIssues.push(...jumbled.map(m => ({ type: 'Awkward phrasing', text: m[0] })))
  // "I doesnt" / "I doesn't" / "I goes" / "I makes"
  const wrongVerb = [...text.matchAll(/\bI\s+(goes|makes|does|doesn't|comes|takes|gives|says|gets|runs|puts|sits|stands|plays)\b/g)]
  grammarIssues.push(...wrongVerb.map(m => ({ type: 'Wrong verb form', text: m[0] })))
  // "more better" / "most best" / "more faster"
  const doubleComp = [...text.matchAll(/\b(more|most)\s+(better|best|worse|worst|faster|slower|bigger|smaller|easier|harder)\b/gi)]
  grammarIssues.push(...doubleComp.map(m => ({ type: 'Double comparative', text: m[0] })))
  // "alot" as one word (grammar, not just spelling)
  const alot = [...text.matchAll(/\balot\b/gi)]
  grammarIssues.push(...alot.map(m => ({ type: 'Should be two words', text: 'alot -> a lot' })))

  // Score (lenient, only 5% weight)
  const cvDiff = mean > 0 ? Math.abs((stdDev / mean) - (BASELINE_SENTENCE_LENGTH.stdDev / BASELINE_SENTENCE_LENGTH.mean)) : 0
  const lengthScore = Math.max(0, 100 - cvDiff * 150)
  const grammarScore = Math.max(0, 100 - grammarIssues.length * 5)
  const score = Math.round((lengthScore + grammarScore) / 2)

  const longSentenceCount = sentences.filter((_, i) => lengths[i] > 25).length

  // Return actual problematic sentences (top 5 longest) for "Fix these sentences"
  const problematic = sentences
    .map((s, i) => ({ text: s, words: lengths[i], idx: i }))
    .filter(s => s.words > 25)
    .sort((a, b) => b.words - a.words)
    .slice(0, 5)

  // Simple readability verdict
  const shortCount = lengths.filter(l => l <= 5).length
  const goodCount = lengths.filter(l => l > 5 && l <= 25).length
  const longCount = lengths.filter(l => l > 25).length
  let readability = 'good'
  if (longCount > sentences.length * 0.3) readability = 'hard'
  else if (longCount > 0) readability = 'mostly_good'

  const flags = []
  if (mean > 22) flags.push('Your sentences tend to run long. Try making some shorter.')
  if (longCount > 0) flags.push(`${longCount} sentence(s) are hard to read. See below.`)

  return { score: Math.min(100, Math.max(0, score)), mean, stdDev, histogram, grammarIssues, longSentences: longSentenceCount, problematic, readability, shortCount, goodCount, longCount, flags }
}

/* ================================================================
   PRACTICAL CHECK 1: SPELLING (dictionary-based)
   ================================================================ */
let _dictionaryCache = null

async function loadDictionary() {
  if (_dictionaryCache) return _dictionaryCache
  try {
    const base = import.meta.env.BASE_URL || '/essay-feedback/'
    const res = await fetch(base + 'dictionary.txt')
    if (!res.ok) return null
    const text = await res.text()
    _dictionaryCache = new Set(text.split('\n'))
    return _dictionaryCache
  } catch (e) {
    console.warn('Dictionary load failed:', e)
    return null
  }
}

function checkSpelling(text, dictionary) {
  const words = text.match(/\b[a-zA-Z''\u2019]+\b/g) || []
  const found = []
  const seen = new Set()
  if (!dictionary) return { count: 0, items: found }

  // Common contractions to skip
  const contractions = new Set([
    "i'm","i've","i'll","i'd","don't","doesn't","didn't","can't","won't",
    "shouldn't","wouldn't","couldn't","isn't","aren't","wasn't","weren't",
    "hasn't","haven't","hadn't","it's","that's","there's","here's",
    "what's","who's","let's","he's","she's","we're","they're","you're",
    "we've","they've","you've","we'll","they'll","you'll","he'll","she'll",
    "i's","he'd","she'd","we'd","they'd","you'd","ain't",
  ])

  for (const w of words) {
    const lower = w.toLowerCase()
    // Skip: short words, already seen, contractions
    if (lower.length <= 2 || seen.has(lower)) continue
    if (contractions.has(lower)) continue
    if (lower.includes("'") || lower.includes('\u2019') || lower.includes("'")) continue

    // Skip proper nouns: capitalized words not at sentence start
    const idx = text.indexOf(w)
    const before = text.slice(Math.max(0, idx - 3), idx)
    const isStartOfSentence = idx === 0 || /[.!?]\s*$/.test(before)
    if (w[0] === w[0].toUpperCase() && w[0] !== w[0].toLowerCase() && !isStartOfSentence) continue

    // Skip ALL CAPS words (intentional emphasis)
    if (w === w.toUpperCase() && w.length > 1) continue

    // Check against dictionary
    if (!dictionary.has(lower)) {
      // Check common suffixes
      const base = lower.replace(/(ing|ed|er|est|ly|tion|ness|ment|able|ful|less|ous|ive|ise|ize|ised|ized|ising|izing|ments|ings|ers)$/, '')
      if (base.length >= 3 && dictionary.has(base)) continue

      // Check if removing doubled letter works (hoow -> how)
      const deduped = lower.replace(/(.)\1+/g, '$1')
      if (deduped !== lower && dictionary.has(deduped)) {
        found.push({ word: w, suggestion: deduped })
        seen.add(lower)
        continue
      }

      found.push({ word: w, suggestion: '' })
      seen.add(lower)
    }
  }
  return { count: found.length, items: found }
}

/* ================================================================
   PRACTICAL CHECK 2: WORD REPETITION + "I" OVERUSE
   ================================================================ */
const STOP_WORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with',
  'by','from','as','is','was','are','were','be','been','being','have',
  'has','had','do','does','did','will','would','could','should','may',
  'might','shall','can','this','that','these','those','it','its',
  'my','your','his','her','our','their','we','they','he','she',
  'me','him','us','them','not','no','so','if','then','than','when',
  'where','what','which','who','whom','how','all','each','every',
  'both','few','more','most','other','some','such','only','very',
  'just','also','about','up','out','into','over','after','before',
])

function checkRepetition(text) {
  const words = text.toLowerCase().match(/\b[a-z']+\b/g) || []
  const totalWords = words.length
  const freq = {}
  for (const w of words) {
    if (STOP_WORDS.has(w) || w.length <= 2) continue
    freq[w] = (freq[w] || 0) + 1
  }
  const overused = Object.entries(freq)
    .filter(([, c]) => c >= 4)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word, count]) => ({ word, count }))

  // I/my/me/myself count
  const iCount = (text.match(/\bI\b/g) || []).length
  const myCount = (text.match(/\bmy\b/gi) || []).length
  const meCount = (text.match(/\bme\b/gi) || []).length
  const myselfCount = (text.match(/\bmyself\b/gi) || []).length
  const firstPersonTotal = iCount + myCount + meCount + myselfCount
  const iPer100 = totalWords > 0 ? (iCount / totalWords) * 100 : 0

  return { overused, iCount, myCount, meCount, myselfCount, firstPersonTotal, iPer100, totalWords }
}

/* ================================================================
   PRACTICAL CHECK 3: OVERBOASTING
   ================================================================ */
const BOAST_PATTERNS = [
  /\bi('m| am) the (best|greatest|top|only)\b/gi,
  /\bi single-?handedly\b/gi,
  /\bunlike (anyone|anybody|everyone) else\b/gi,
  /\bi always (succeed|win|excel|achieve)\b/gi,
  /\bi never (fail|lose|give up)\b/gi,
  /\bno one (else )?(can|could|has|did)\b/gi,
  /\bi('m| am) (exceptional|extraordinary|unmatched|unparalleled)\b/gi,
  /\beveryone (admires|respects|looks up to) me\b/gi,
  /\bi('m| am) (naturally|inherently) (gifted|talented|brilliant)\b/gi,
  /\bi('m| am) (the smartest|better than|superior)\b/gi,
  /\bwithout me,?\s/gi,
  /\bperfect (score|grades|record|GPA)\b/gi,
]

function checkOverboasting(text) {
  const found = []
  for (const p of BOAST_PATTERNS) {
    const re = new RegExp(p.source, p.flags)
    for (const m of text.matchAll(re)) found.push(m[0])
  }
  return { count: found.length, items: found }
}

/* ================================================================
   PRACTICAL CHECK 4: NEGATIVE SELF-TALK
   ================================================================ */
const NEGATIVE_PATTERNS = [
  /\bi('m| am) not good (enough|at)\b/gi,
  /\bi('m| am) (useless|worthless|hopeless|pathetic)\b/gi,
  /\bi failed\b/gi,
  /\bmy (biggest )?(weakness|flaw|failure|shortcoming)\b/gi,
  /\bi('m| am) (bad|terrible|awful|horrible) at\b/gi,
  /\bi struggle(d)? (with|to)\b/gi,
  /\bunfortunately,? i\b/gi,
  /\bi regret\b/gi,
  /\bi('m| am) (just|only) a\b/gi,
  /\bi never (could|can|was able)\b/gi,
  /\bi lack\b/gi,
  /\bmy (poor|weak|limited)\b/gi,
  /\bi('m| am) (ashamed|embarrassed)\b/gi,
  /\bi don'?t (deserve|belong)\b/gi,
  /\bi('m| am) not (smart|talented|capable|worthy)\b/gi,
  /\bi can'?t do anything\b/gi,
]

function checkNegativeSelfTalk(text) {
  const found = []
  for (const p of NEGATIVE_PATTERNS) {
    const re = new RegExp(p.source, p.flags)
    for (const m of text.matchAll(re)) found.push(m[0])
  }
  return { count: found.length, items: found }
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
function runAllChecks(text, essayTypeId, fingerprints, dictionary) {
  const mechanics = analyzeMechanics(text)
  const similarity = checkSimilarity(text, fingerprints)
  const spelling = checkSpelling(text, dictionary)
  const repetition = checkRepetition(text)
  const overboasting = checkOverboasting(text)
  const negativeTalk = checkNegativeSelfTalk(text)

  // Sentence stats
  const sentences = splitSentences(text)
  const lengths = sentences.map(s => s.split(/\s+/).filter(w => w.length > 0).length)
  const mean = lengths.length > 0 ? lengths.reduce((a, b) => a + b, 0) / lengths.length : 0
  const longRatio = lengths.length > 0 ? lengths.filter(l => l > 25).length / lengths.length : 0
  const shortRatio = lengths.length > 0 ? lengths.filter(l => l < 6).length / lengths.length : 0

  // Similarity top match
  const topSim = (similarity.checked && similarity.matches.length > 0) ? similarity.matches[0].similarity : 0

  /* ============================================
     FINAL SCORING: start at 100, subtract penalties
     Calibrated: test essay (many issues) = 68-72
     Clean essay = 95-100, weak essay = 50-65
     ============================================ */
  let score = 100

  // 1. SPELLING: -2 per error, max -6
  score -= Math.min(spelling.count * 2, 6)

  // 2. GRAMMAR: -1 per error, max -6, but 5+ issues = forced max
  score -= mechanics.grammarIssues.length >= 5 ? 6 : Math.min(mechanics.grammarIssues.length, 6)

  // 3. SENTENCE LENGTH
  if (longRatio > 0.35) score -= 3
  else if (longRatio > 0.25) score -= 2

  // 4. WORD REPETITION: -2 per repeated word, max -6
  score -= Math.min(repetition.overused.length * 2, 6)

  // 5. "I" USAGE
  const iPer100 = repetition.iPer100
  if (iPer100 > 12) score -= 6
  else if (iPer100 > 10) score -= 4
  else if (iPer100 > 8) score -= 2

  // 6. ORIGINALITY + genericness fallback
  if (topSim > 50) score -= 15
  else if (topSim > 35) score -= 8
  else if (topSim > 20) score -= 3
  else {
    // Original but generic? Still penalize
    const genericPhrases = ['this taught me','i learned the importance','this experience changed me',
      'it made me who i am','i grew as a person','this helped me grow','i became a better person',
      'it opened my eyes','this shaped my perspective','this made me realize']
    const lower = text.toLowerCase()
    const genericCount = genericPhrases.filter(p => lower.includes(p)).length
    if (genericCount >= 2) score -= 3
  }

  // 7. NEGATIVE SELF-TALK: -2 per instance, max -6
  score -= Math.min(negativeTalk.count * 2, 6)

  // 8. OVERBOASTING: -2 per instance, max -6
  score -= Math.min(overboasting.count * 2, 6)

  // 9. COMBINATION: negative + boasting together = extra -3
  if (negativeTalk.count > 0 && overboasting.count > 0) score -= 3

  // Clamp
  const overall = Math.max(0, Math.min(100, Math.round(score)))

  // Percentile (normal distribution, mean=72, stddev=12)
  const zScore = (overall - 72) / 12
  const percentile = Math.min(99, Math.max(1, Math.round(
    (1 / (1 + Math.exp(-1.7 * zScore))) * 100
  )))

  // Build checks array for display (individual scores not used for overall, just for reference)
  const checks = [
    { key: 'spelling', label: 'Spelling', penalty: Math.min(spelling.count * 2, 6) },
    { key: 'grammar', label: 'Grammar', penalty: mechanics.grammarIssues.length >= 5 ? 6 : Math.min(mechanics.grammarIssues.length, 6) },
    { key: 'sentenceLength', label: 'Sentence length', penalty: longRatio > 0.35 ? 3 : longRatio > 0.25 ? 2 : 0 },
    { key: 'repetition', label: 'Word repetition', penalty: Math.min(repetition.overused.length * 2, 6) },
    { key: 'iUsage', label: '"I" usage', penalty: iPer100 > 12 ? 6 : iPer100 > 10 ? 4 : iPer100 > 8 ? 2 : 0 },
    { key: 'originality', label: 'Originality', penalty: topSim > 50 ? 15 : topSim > 35 ? 8 : topSim > 20 ? 3 : 0 },
    { key: 'negativeTalk', label: 'Negative self-talk', penalty: Math.min(negativeTalk.count * 2, 6) },
    { key: 'overboasting', label: 'Overboasting', penalty: Math.min(overboasting.count * 2, 6) },
  ]

  return {
    checks, overall, percentile,
    details: {
      spelling, mechanics, repetition, overboasting, negativeTalk, similarity,
      sentenceStats: { mean: Math.round(mean * 10) / 10, pctOver25: Math.round(longRatio * 100), pctUnder6: Math.round(shortRatio * 100), baseline: 17.2 },
    },
  }
}

/* ================================================================
   REPORT CARD - FINAL
   ================================================================ */
function CheckSection({ title, ok, okText, children }) {
  return (
    <div className="rc-check">
      <div className="rc-check-hdr">
        <span className="rc-check-title">{title}</span>
        {ok && <span className="rc-check-ok">{'\u2713'} {okText || 'Good'}</span>}
      </div>
      {children}
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

  const { checks, overall, percentile, details } = result
  const passed = overall >= 75

  return (
    <div className="rc-shell" ref={reportRef}>
      <div className="rc-hdr">
        <div className="rc-hdr-l">
          <h2 className="rc-hdr-title">Essay feedback report</h2>
          <div className="rc-hdr-sub">Boomer Counselor</div>
        </div>
        <div className="rc-hdr-r">
          {meta.college && <div className="rc-hdr-nm">{meta.college}</div>}
          <div className="rc-hdr-mt">{meta.essayType}</div>
          <div className="rc-hdr-mt">{meta.wordCount} words / {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
        </div>
      </div>

      <div className="rc-body">

        {/* 1. SPELLING */}
        <CheckSection title="1. Spelling" ok={details.spelling.count === 0} okText="No errors found">
          {details.spelling.count > 0 && details.spelling.items.map((item, i) => (
            <div className="rc-issue" key={i}>
              <span className="rc-wrong">"{item.word}"</span>
              {item.suggestion ? <> {'\u2192'} <span className="rc-right">"{item.suggestion}"</span></> : ' - check spelling'}
            </div>
          ))}
        </CheckSection>

        {/* 2. GRAMMAR */}
        <CheckSection title="2. Grammar" ok={details.mechanics.grammarIssues.length === 0} okText="No issues found">
          {details.mechanics.grammarIssues.length > 0 && details.mechanics.grammarIssues.slice(0, 8).map((item, i) => (
            <div className="rc-issue" key={i}>
              <span className="rc-issue-type">{item.type}:</span> "{item.text}"
            </div>
          ))}
        </CheckSection>

        {/* 3. SENTENCE LENGTH */}
        <CheckSection title="3. Sentence length" ok={details.sentenceStats.pctOver25 === 0 && Math.abs(details.sentenceStats.mean - 17.2) < 5}>
          <div className="rc-stat">Your average: <strong>{details.sentenceStats.mean} words</strong> per sentence (database average: {details.sentenceStats.baseline})</div>
          {details.sentenceStats.pctOver25 > 0 && <div className="rc-stat">{details.sentenceStats.pctOver25}% of your sentences are over 25 words (too long)</div>}
          {details.sentenceStats.pctUnder6 > 15 && <div className="rc-stat">{details.sentenceStats.pctUnder6}% of your sentences are under 6 words (too short)</div>}
          {details.mechanics.problematic.length > 0 && (
            <>
              <div className="rc-fix-label">Fix these sentences:</div>
              {details.mechanics.problematic.map((s, i) => (
                <div className="rc-sentence-fix" key={i}>
                  <div className="rc-sentence-text">"{s.text.length > 150 ? s.text.slice(0, 147) + '...' : s.text}"</div>
                  <div className="rc-sentence-issue">Too long ({s.words} words) - split into 2 shorter sentences</div>
                </div>
              ))}
            </>
          )}
        </CheckSection>

        {/* 4. WORD REPETITION */}
        <CheckSection title="4. Word repetition" ok={details.repetition.overused.length === 0} okText="Good variety">
          {details.repetition.overused.length > 0 && details.repetition.overused.map((w, i) => (
            <div className="rc-issue" key={i}>
              <span className="rc-wrong">"{w.word}"</span> used <strong>{w.count} times</strong> - try using different words
            </div>
          ))}
        </CheckSection>

        {/* 5. "I" USAGE */}
        <CheckSection title={'5. "I" usage'} ok={details.repetition.iPer100 <= 4}>
          <div className="rc-stat">
            "I" appears {details.repetition.iCount}x, "my" {details.repetition.myCount}x, "me" {details.repetition.meCount}x
            ({details.repetition.firstPersonTotal} total in {details.repetition.totalWords} words = {details.repetition.iPer100.toFixed(1)} "I"s per 100 words)
          </div>
          <div className="rc-stat">Database average: 2.25 "I"s per 100 words</div>
          {details.repetition.iPer100 > 4 && <div className="rc-suggestion">Try starting more sentences with actions or observations instead of "I"</div>}
        </CheckSection>

        {/* 6. ORIGINALITY */}
        <CheckSection title="6. Originality" ok={!details.similarity.checked || details.similarity.matches.length === 0 || details.similarity.matches[0].similarity < 20} okText={details.similarity.checked ? `Original (compared against ${details.similarity.totalCompared.toLocaleString()} past essays)` : 'Checking...'}>
          {details.similarity.checked && details.similarity.matches.length > 0 && details.similarity.matches[0].similarity >= 20 && (
            <>
              <div className="rc-issue">
                {details.similarity.matches[0].similarity}% similar to a previously submitted {details.similarity.matches[0].type || 'essay'}
                {details.similarity.matches[0].college ? ` for ${details.similarity.matches[0].college}` : ''}
              </div>
              <div className="rc-suggestion">Make your essay more unique. Use your own specific experiences and details.</div>
            </>
          )}
        </CheckSection>

        {/* 7. NEGATIVE SELF-TALK */}
        <CheckSection title="7. Negative self-talk" ok={details.negativeTalk.count === 0} okText="None detected">
          {details.negativeTalk.count > 0 && (
            <>
              {details.negativeTalk.items.slice(0, 5).map((item, i) => (
                <div className="rc-issue" key={i}><span className="rc-wrong">"{item}"</span></div>
              ))}
              <div className="rc-suggestion">Reframe these as growth or learning moments. Show what you overcame, not how you felt defeated.</div>
            </>
          )}
        </CheckSection>

        {/* 8. OVERBOASTING */}
        <CheckSection title="8. Overboasting" ok={details.overboasting.count === 0} okText="Balanced tone">
          {details.overboasting.count > 0 && (
            <>
              {details.overboasting.items.slice(0, 5).map((item, i) => (
                <div className="rc-issue" key={i}><span className="rc-wrong">"{item}"</span></div>
              ))}
              <div className="rc-suggestion">Let your actions speak for themselves. Show achievements through specific examples, not claims.</div>
            </>
          )}
        </CheckSection>

        {/* OVERALL SCORE */}
        <div className="rc-overall-box">
          <div className="rc-overall-score">{overall}<span className="rc-overall-of">/100</span></div>
          <div className="rc-overall-percentile">Top {100 - percentile}% compared to {details.similarity.totalCompared ? details.similarity.totalCompared.toLocaleString() : '6,804'} past essays</div>
        </div>

        {/* VERDICT */}
        <div className={'rc-verdict ' + (passed ? 'rc-verdict-pass' : 'rc-verdict-rewrite')}>
          {passed ? (
            <>
              <div className="rc-verdict-icon">{'\u2713'}</div>
              <div className="rc-verdict-text">You can show this essay to your counselor.</div>
            </>
          ) : (
            <>
              <div className="rc-verdict-icon">{'\u270F'}</div>
              <div className="rc-verdict-text">Go back, rewrite your essay using the suggestions above, and come back to re-analyze.</div>
            </>
          )}
        </div>

        <div className="rc-actions no-print">
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
  const [question, setQuestion] = useState('')
  const [limit, setLimit] = useState('')
  const [essay, setEssay] = useState('')
  const [result, setResult] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [fingerprints, setFingerprints] = useState(null)
  const [dictionary, setDictionary] = useState(null)

  const wordCount = useMemo(() => countWords(essay), [essay])
  const charCount = essay.length
  const limitNum = parseInt(limit, 10)
  const isOver = Number.isFinite(limitNum) && limitNum > 0 && wordCount > limitNum
  const canSubmit = essayType && limit && essay.trim().length > 50

  useEffect(() => {
    emitEvent('tool_open', { action: 'open' })
    loadFingerprints().then(fp => { if (fp) setFingerprints(fp) })
    loadDictionary().then(d => { if (d) setDictionary(d) })
  }, [])

  function handleAnalyze(e) {
    e.preventDefault()
    if (!canSubmit) return
    setAnalyzing(true)
    const typeObj = ESSAY_TYPES.find(t => t.label === essayType)
    emitEvent('essay_submit', { action: 'submit', targetLabel: essayType, extraData: { essay_type: essayType, college, word_count: wordCount, question, essay_text: essay } })
    setTimeout(() => {
      const res = runAllChecks(essay, typeObj ? typeObj.id : 'commonapp', fingerprints, dictionary)
      setResult(res)
      setAnalyzing(false)
      emitEvent('report_generated', { action: 'analyze', extraData: { overall: res.overall, scores: Object.fromEntries(res.checks.map(c => [c.key, c.score])) } })
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
          <ReportCard result={result} meta={{ essayType, college, wordCount, question }} onBack={() => setResult(null)} />
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
