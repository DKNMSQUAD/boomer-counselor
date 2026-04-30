import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { emitEvent } from './bcEvents'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import './index.css'

/* ================================================================
   BASELINE DATA (from ~10,000 student essays)
   ================================================================ */
const BASELINE = {
  sentenceLength: {
    mean: 15.2,
    stdDev: 6.8,
    histogram: {
      '1-5': 0.05, '6-10': 0.18, '11-15': 0.30,
      '16-20': 0.25, '21-25': 0.13, '26-30': 0.06, '31+': 0.03,
    },
  },
  iCount: { per100Words: 4.2, maxPer100Words: 7 },
  wordRepetition: { maxFrequencyPercent: 3.0 },
}

const ESSAY_TYPES = [
  'CommonApp (main essay)',
  'UCAS Personal Statement',
  'Why This College Essay',
  'Why This Major Essay',
  'Personal Essay',
]

/* ================================================================
   STOP WORDS
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

/* ================================================================
   COMMON MISSPELLINGS
   ================================================================ */
const MISSPELLINGS = {
  'acheive':'achieve','acheiving':'achieving','accomodate':'accommodate',
  'accross':'across','agressive':'aggressive','apparantly':'apparently',
  'arguement':'argument','basicly':'basically','begining':'beginning',
  'beleive':'believe','benifit':'benefit','buisness':'business',
  'calender':'calendar','catagory':'category','cemetary':'cemetery',
  'charachter':'character','comming':'coming','commited':'committed',
  'comparision':'comparison','competance':'competence','completly':'completely',
  'concious':'conscious','consistant':'consistent','convienient':'convenient',
  'definately':'definitely','dependant':'dependent','desparate':'desperate',
  'developement':'development','diffrence':'difference','dilema':'dilemma',
  'disapear':'disappear','disapoint':'disappoint','ecstacy':'ecstasy',
  'embarass':'embarrass','enviroment':'environment','exagerate':'exaggerate',
  'excercise':'exercise','existance':'existence','experiance':'experience',
  'familar':'familiar','fasinate':'fascinate','finaly':'finally',
  'foriegn':'foreign','fourty':'forty','freind':'friend',
  'fulfil':'fulfill','goverment':'government','grammer':'grammar',
  'gaurd':'guard','happend':'happened','harrass':'harass',
  'hieght':'height','humourous':'humorous',
  'immediatly':'immediately','independant':'independent','indispensible':'indispensable',
  'innoculate':'inoculate','intellegent':'intelligent','intresting':'interesting',
  'irresistable':'irresistible','knowlege':'knowledge','liase':'liaise',
  'libary':'library','liesure':'leisure','maintainance':'maintenance',
  'millenium':'millennium','mischievious':'mischievous','necesary':'necessary',
  'neccessary':'necessary','noticable':'noticeable','occassion':'occasion',
  'occured':'occurred','occurence':'occurrence','oppurtunity':'opportunity',
  'parliment':'parliament','persistant':'persistent','peice':'piece',
  'posession':'possession','potatos':'potatoes','preceed':'precede',
  'privelege':'privilege','proffesional':'professional','pronounciation':'pronunciation',
  'publically':'publicly','realy':'really','recieve':'receive',
  'reccomend':'recommend','refered':'referred','relevent':'relevant',
  'religous':'religious','remeber':'remember','repitition':'repetition',
  'resistence':'resistance','sence':'sense','seperate':'separate',
  'seige':'siege','similer':'similar','sinceerly':'sincerely',
  'speach':'speech','strenght':'strength','succesful':'successful',
  'suprise':'surprise','tendancy':'tendency','therefor':'therefore',
  'threshhold':'threshold','tommorow':'tomorrow','tounge':'tongue',
  'truely':'truly','tyrany':'tyranny','underate':'underrate',
  'untill':'until','upholstry':'upholstery','useable':'usable',
  'vaccuum':'vacuum','vegitable':'vegetable','vetrinary':'veterinary',
  'visious':'vicious','wether':'whether','wierd':'weird',
  'writting':'writing','wellfare':'welfare',
  'alot':'a lot','aswell':'as well','infact':'in fact',
  'inspite':'in spite','infront':'in front','thankyou':'thank you',
  'ofcourse':'of course','eventhough':'even though',
  'teh':'the','hte':'the','adn':'and','taht':'that','waht':'what',
  'jsut':'just','thier':'their','recieved':'received','wich':'which',
  'becuase':'because','diffrent':'different','enviorment':'environment',
  'occassionally':'occasionally','neccessity':'necessity','accomodation':'accommodation',
  'posess':'possess','comittee':'committee','occuring':'occurring',
  'supercede':'supersede','managment':'management',
  'priviledge':'privilege','persistance':'persistence','occurrance':'occurrence',
  'dissappoint':'disappoint','dissapear':'disappear',
}

/* ================================================================
   CLICHE PHRASES
   ================================================================ */
const CLICHE_PHRASES = [
  { text: 'ever since i was a child', fix: 'Start with a specific moment instead' },
  { text: 'from a young age', fix: 'Name the exact age or event' },
  { text: 'i have always been passionate', fix: 'Show the passion through a specific story' },
  { text: 'changed my life forever', fix: 'Describe exactly what changed and how' },
  { text: 'opened my eyes to', fix: 'Describe what you saw differently' },
  { text: 'taught me the importance of', fix: 'Show the lesson through action, not telling' },
  { text: 'i learned that hard work', fix: 'Replace with a specific example of effort' },
  { text: 'a defining moment in my life', fix: 'Just describe the moment directly' },
  { text: 'i want to make a difference', fix: 'Name the specific difference you want to make' },
  { text: 'this experience shaped who i am', fix: 'Show, don\'t tell, how you changed' },
  { text: 'pushed me out of my comfort zone', fix: 'Describe the discomfort specifically' },
  { text: 'my passion for', fix: 'Demonstrate the passion through actions' },
  { text: 'i have always dreamed of', fix: 'Describe a specific moment the dream took shape' },
  { text: 'growing up in', fix: 'Start with a vivid scene from your childhood' },
  { text: 'it was then that i realized', fix: 'State the realization directly' },
  { text: 'looking back i realize', fix: 'State the insight without the preamble' },
  { text: 'this taught me that', fix: 'Show the lesson through the story' },
  { text: 'i am grateful for', fix: 'Show gratitude through specific actions' },
  { text: 'i am determined to', fix: 'Describe what you are already doing' },
  { text: 'the world needs', fix: 'Be specific about the problem you see' },
]

/* ================================================================
   GRAMMAR RULES
   ================================================================ */
const GRAMMAR_RULES = [
  { name: 'Repeated word', re: /\b(\w+)\s+\1\b/gi, msg: 'Repeated word' },
  { name: 'Missing capital', re: /[.!?]\s+[a-z]/g, msg: 'Start with a capital letter' },
  { name: 'Passive voice', re: /\b(was|were|is|are|been|being)\s+(been\s+)?(made|done|given|taken|seen|known|found|told|shown|left|heard|kept|held|brought|written|provided|set|paid|met|run)\b/gi, msg: 'Consider active voice' },
  { name: 'Weak intensifier', re: /\bvery\s+\w+/gi, msg: '"Very" is weak. Use a stronger word.' },
  { name: 'Double space', re: /  +/g, msg: 'Extra spaces' },
]

/* ================================================================
   TONE PATTERNS
   ================================================================ */
const NEGATIVE_PATTERNS = [
  /\bi('m| am) not good (enough|at)\b/gi,
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
]

const BOASTING_PATTERNS = [
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

/* ================================================================
   SYNONYM SUGGESTIONS
   ================================================================ */
const SYNONYMS = {
  experience: ['journey', 'encounter', 'involvement', 'exposure'],
  passion: ['dedication', 'commitment', 'enthusiasm', 'drive'],
  passionate: ['dedicated', 'committed', 'enthusiastic', 'driven'],
  important: ['significant', 'crucial', 'essential', 'vital'],
  interesting: ['compelling', 'engaging', 'fascinating', 'intriguing'],
  good: ['effective', 'strong', 'valuable', 'beneficial'],
  great: ['remarkable', 'outstanding', 'exceptional', 'superb'],
  help: ['support', 'assist', 'contribute to', 'enable'],
  helped: ['supported', 'enabled', 'contributed to', 'guided'],
  learn: ['discover', 'uncover', 'grasp', 'absorb'],
  learned: ['discovered', 'uncovered', 'grasped', 'absorbed'],
  think: ['believe', 'consider', 'recognize', 'understand'],
  want: ['aspire', 'aim', 'seek', 'intend'],
  really: ['genuinely', 'profoundly', 'deeply'],
  thing: ['aspect', 'element', 'factor', 'dimension'],
  things: ['aspects', 'elements', 'factors', 'dimensions'],
  make: ['create', 'build', 'establish', 'develop'],
  change: ['transform', 'shift', 'reshape', 'evolve'],
  people: ['individuals', 'peers', 'community', 'society'],
  world: ['community', 'field', 'society', 'landscape'],
}

/* ================================================================
   ANALYSIS FUNCTIONS
   ================================================================ */

function splitSentences(text) {
  return text
    .split(/(?<!\b(?:Mr|Mrs|Ms|Dr|Jr|Sr|St|Prof|Gen|Rep|Sen|U\.S|Inc|Ltd|Corp|vs|etc|e\.g|i\.e))\s*[.!?]+\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
}

function countWords(text) {
  const t = text.trim()
  if (!t) return 0
  return t.split(/\s+/).length
}

function analyzeSentenceLength(text) {
  const sentences = splitSentences(text)
  if (sentences.length === 0) return { score: 50, lengths: [], mean: 0, stdDev: 0, histogram: {}, feedback: [], longSentences: [] }
  const lengths = sentences.map(s => s.split(/\s+/).filter(w => w.length > 0).length)
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length
  const variance = lengths.reduce((sum, l) => sum + (l - mean) ** 2, 0) / lengths.length
  const stdDev = Math.sqrt(variance)
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
  for (const k of Object.keys(buckets)) histogram[k] = buckets[k] / lengths.length
  const studentCV = mean > 0 ? stdDev / mean : 0
  const baselineCV = BASELINE.sentenceLength.stdDev / BASELINE.sentenceLength.mean
  const cvDiff = Math.abs(studentCV - baselineCV)
  const score = Math.max(0, Math.min(100, Math.round(100 - cvDiff * 200)))
  const feedback = []
  if (mean > BASELINE.sentenceLength.mean + 5)
    feedback.push(`Average sentence is ${Math.round(mean)} words (baseline: ${BASELINE.sentenceLength.mean}). Your sentences run long.`)
  if (mean < BASELINE.sentenceLength.mean - 5)
    feedback.push(`Average sentence is ${Math.round(mean)} words (baseline: ${BASELINE.sentenceLength.mean}). Your sentences are quite short.`)
  if (stdDev > BASELINE.sentenceLength.stdDev + 4)
    feedback.push(`High variation in sentence length (std dev: ${stdDev.toFixed(1)} vs typical ${BASELINE.sentenceLength.stdDev}). Essay feels uneven.`)
  if (stdDev < BASELINE.sentenceLength.stdDev - 3)
    feedback.push(`Very uniform sentence lengths. Mix shorter and longer for better rhythm.`)
  const longSentences = sentences.filter((_, i) => lengths[i] > 30).slice(0, 3)
  if (longSentences.length > 0)
    feedback.push(`${longSentences.length} sentence(s) over 30 words. Consider splitting.`)
  return { score, lengths, mean, stdDev, histogram, feedback, longSentences }
}

function checkSpelling(text) {
  const words = text.match(/\b[a-zA-Z']+\b/g) || []
  const found = []
  const seen = new Set()
  for (const w of words) {
    const lower = w.toLowerCase()
    if (lower.length <= 2 || seen.has(lower)) continue
    if (w[0] === w[0].toUpperCase() && w[0] !== w[0].toLowerCase()) continue
    if (MISSPELLINGS[lower]) {
      found.push({ word: w, suggestion: MISSPELLINGS[lower] })
      seen.add(lower)
    }
  }
  return { score: Math.max(0, Math.round(100 - found.length * 8)), items: found }
}

function checkGrammar(text) {
  const issues = []
  for (const rule of GRAMMAR_RULES) {
    const re = new RegExp(rule.re.source, rule.re.flags)
    for (const m of text.matchAll(re)) {
      issues.push({ rule: rule.name, msg: rule.msg, matched: m[0] })
    }
  }
  return { score: Math.max(0, Math.round(100 - issues.length * 4)), items: issues }
}

function analyzeWordRepetition(text) {
  const words = text.toLowerCase().match(/\b[a-z']+\b/g) || []
  const total = words.length
  const freq = {}
  for (const w of words) {
    if (STOP_WORDS.has(w) || w.length <= 2) continue
    freq[w] = (freq[w] || 0) + 1
  }
  const threshold = total * (BASELINE.wordRepetition.maxFrequencyPercent / 100)
  const overused = Object.entries(freq)
    .filter(([, c]) => c > threshold && c >= 3)
    .sort((a, b) => b[1] - a[1])
    .map(([word, count]) => ({
      word, count, pct: ((count / total) * 100).toFixed(1),
      synonyms: SYNONYMS[word] || null,
    }))
  return { score: Math.max(0, Math.round(100 - overused.length * 12)), overused }
}

function countFirstPerson(text) {
  const totalWords = countWords(text)
  if (totalWords === 0) return { score: 100, iCount: 0, per100: 0, myCount: 0, meCount: 0, myselfCount: 0, total: 0 }
  const iCount = (text.match(/\bI\b/g) || []).length
  const myCount = (text.match(/\bmy\b/gi) || []).length
  const meCount = (text.match(/\bme\b/gi) || []).length
  const myselfCount = (text.match(/\bmyself\b/gi) || []).length
  const total = iCount + myCount + meCount + myselfCount
  const per100 = (iCount / totalWords) * 100
  let score = 100
  if (per100 > BASELINE.iCount.maxPer100Words)
    score = Math.max(0, Math.round(100 - (per100 - BASELINE.iCount.maxPer100Words) * 15))
  else if (per100 < 1.0 && totalWords > 200) score = 60
  return { score, iCount, myCount, meCount, myselfCount, total, per100 }
}

function checkOriginality(text) {
  const lower = text.toLowerCase()
  const found = CLICHE_PHRASES.filter(p => lower.includes(p.text))
  return { score: Math.max(0, Math.round(100 - found.length * 12)), items: found }
}

function matchPatterns(text, patterns) {
  const found = []
  for (const p of patterns) {
    const re = new RegExp(p.source, p.flags)
    for (const m of text.matchAll(re)) found.push(m[0])
  }
  return found
}

function detectNegativeSelfTalk(text) {
  const items = matchPatterns(text, NEGATIVE_PATTERNS)
  return { score: Math.max(0, Math.round(100 - items.length * 15)), items }
}

function detectOverboasting(text) {
  const items = matchPatterns(text, BOASTING_PATTERNS)
  return { score: Math.max(0, Math.round(100 - items.length * 15)), items }
}

function runAllChecks(text) {
  const sl = analyzeSentenceLength(text)
  const sp = checkSpelling(text)
  const gr = checkGrammar(text)
  const wr = analyzeWordRepetition(text)
  const fp = countFirstPerson(text)
  const or_ = checkOriginality(text)
  const ns = detectNegativeSelfTalk(text)
  const ob = detectOverboasting(text)

  const checks = [
    { key: 'sentenceLength', label: 'Sentence structure', score: sl.score },
    { key: 'spelling', label: 'Spelling', score: sp.score },
    { key: 'grammar', label: 'Grammar', score: gr.score },
    { key: 'wordRepetition', label: 'Word variety', score: wr.score },
    { key: 'firstPerson', label: 'First-person balance', score: fp.score },
    { key: 'originality', label: 'Originality', score: or_.score },
    { key: 'negativeSelfTalk', label: 'Negative self-talk', score: ns.score },
    { key: 'overboasting', label: 'Overboasting', score: ob.score },
  ]
  const overall = Math.round(checks.reduce((s, c) => s + c.score, 0) / checks.length)
  return {
    checks, overall,
    details: { sentenceLength: sl, spelling: sp, grammar: gr, wordRepetition: wr, firstPerson: fp, originality: or_, negativeSelfTalk: ns, overboasting: ob },
  }
}

/* ================================================================
   COMPONENTS
   ================================================================ */

function TriColorBar({ score, label, thick }) {
  const pct = Math.max(0, Math.min(100, score))
  return (
    <div className={'rc-row' + (thick ? ' rc-row-thick' : '')}>
      <div className={'rc-lbl' + (thick ? ' rc-lbl-bold' : '')}>{label}</div>
      <div className={'rc-bar-wrap' + (thick ? ' rc-bar-thick' : '')}>
        <div className="rc-zone rc-z-low" style={{ width: '33.33%' }} />
        <div className="rc-zone rc-z-med" style={{ width: '33.34%' }} />
        <div className="rc-zone rc-z-high" style={{ width: '33.33%' }} />
        <div className="rc-marker" style={{ left: `${pct}%` }} />
      </div>
      <div className={'rc-pct' + (thick ? ' rc-pct-bold' : '')}>{pct}%</div>
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

function DetailSection({ title, children, forceOpen }) {
  const [open, setOpen] = useState(false)
  const isOpen = open || forceOpen
  return (
    <div className="detail-section">
      <button className="detail-toggle" onClick={() => setOpen(!open)} type="button">
        {isOpen ? '\u25BC' : '\u25B6'} {title}
      </button>
      {isOpen && <div className="detail-body">{children}</div>}
    </div>
  )
}

function ReportCard({ result, meta, onBack }) {
  const reportRef = useRef(null)
  const [downloading, setDownloading] = useState(false)
  const [forceOpen, setForceOpen] = useState(false)

  const handleDownload = useCallback(async () => {
    if (!reportRef.current || downloading) return
    setDownloading(true)
    setForceOpen(true)
    emitEvent('report_download', { extraData: { overall: result.overall } })

    // Wait for React to render expanded sections
    await new Promise(r => setTimeout(r, 300))

    try {
      const el = reportRef.current
      // Hide action buttons during capture
      const actions = el.querySelector('.rc-actions')
      if (actions) actions.style.display = 'none'

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#faf7f2',
        logging: false,
      })

      if (actions) actions.style.display = ''

      const imgData = canvas.toDataURL('image/png')
      const imgW = canvas.width
      const imgH = canvas.height

      const pdfW = 210
      const pdfH = 297
      const margin = 8
      const contentW = pdfW - margin * 2
      const contentH = pdfH - margin * 2

      // Scale to fit entire report on one page
      const scaleByW = contentW / imgW
      const scaleByH = contentH / imgH
      const scale = Math.min(scaleByW, scaleByH)

      const renderW = imgW * scale
      const renderH = imgH * scale

      // Center on page
      const offsetX = margin + (contentW - renderW) / 2
      const offsetY = margin + (contentH - renderH) / 2

      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
      pdf.addImage(imgData, 'PNG', offsetX, offsetY, renderW, renderH)

      const filename = `essay-report-${(meta.college || 'essay').replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`
      pdf.save(filename)
    } catch (err) {
      console.error('PDF generation failed:', err)
      window.print()
    } finally {
      setForceOpen(false)
      setDownloading(false)
    }
  }, [result.overall, downloading, meta.college])

  const { details, checks, overall } = result
  const passed = overall >= 70
  const writingChecks = checks.slice(0, 5)
  const toneChecks = checks.slice(5)

  const priorityFixes = []
  if (details.firstPerson.per100 > BASELINE.iCount.maxPer100Words)
    priorityFixes.push(`Too many "I/my/me" (${details.firstPerson.iCount} "I"s = ${details.firstPerson.per100.toFixed(1)} per 100 words, baseline: ${BASELINE.iCount.per100Words}). Lead sentences with actions instead.`)
  if (details.wordRepetition.overused.length > 0)
    priorityFixes.push(`Overused words: ${details.wordRepetition.overused.map(w => `"${w.word}" (${w.count}x)`).join(', ')}. Use synonyms.`)
  if (details.originality.items.length > 0)
    priorityFixes.push(`${details.originality.items.length} cliche phrase(s). Replace with specific details.`)
  if (details.spelling.items.length > 0)
    priorityFixes.push(`${details.spelling.items.length} spelling error(s): ${details.spelling.items.map(i => `"${i.word}" \u2192 "${i.suggestion}"`).join(', ')}.`)
  if (details.sentenceLength.longSentences && details.sentenceLength.longSentences.length > 0)
    priorityFixes.push(`${details.sentenceLength.longSentences.length} sentence(s) over 30 words. Split for readability.`)
  if (details.negativeSelfTalk.items.length > 0)
    priorityFixes.push(`Negative self-talk: ${details.negativeSelfTalk.items.slice(0, 3).map(i => `"${i}"`).join(', ')}. Reframe as growth.`)
  if (details.overboasting.items.length > 0)
    priorityFixes.push(`Overboasting: ${details.overboasting.items.slice(0, 3).map(i => `"${i}"`).join(', ')}. Show achievements through actions.`)

  return (
    <div className="rc-shell" ref={reportRef}>
      <div className="rc-hdr">
        <div className="rc-hdr-l">
          <h2 className="rc-hdr-title">Essay feedback report</h2>
          <div className="rc-hdr-sub">Boomer Counselor / Phase 1 analysis</div>
        </div>
        <div className="rc-hdr-r">
          {meta.college && <div className="rc-hdr-nm">{meta.college}</div>}
          <div className="rc-hdr-mt">{meta.essayType}</div>
          <div className="rc-hdr-mt">{meta.wordCount} words / {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
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
          <div className="rc-stitle">Writing quality</div>
          {writingChecks.map(c => <TriColorBar key={c.key} label={c.label} score={c.score} />)}
        </div>

        <div className="rc-section">
          <div className="rc-stitle">Content and tone</div>
          {toneChecks.map(c => <TriColorBar key={c.key} label={c.label} score={c.score} />)}
        </div>

        <div className="rc-section rc-overall-section">
          <TriColorBar label="Overall score" score={overall} thick />
        </div>

        <div className="rc-section">
          <div className="rc-stitle">Sentence length distribution</div>
          <Histogram student={details.sentenceLength.histogram} baseline={BASELINE.sentenceLength.histogram} />
          {details.sentenceLength.feedback.map((f, i) => (
            <div className="rc-detail-note" key={i}>{f}</div>
          ))}
        </div>

        {details.spelling.items.length > 0 && (
          <DetailSection forceOpen={forceOpen} title={`Spelling errors (${details.spelling.items.length})`}>
            {details.spelling.items.map((item, i) => (
              <div className="detail-item" key={i}><span className="detail-wrong">{item.word}</span> {'\u2192'} <span className="detail-right">{item.suggestion}</span></div>
            ))}
          </DetailSection>
        )}

        {details.grammar.items.length > 0 && (
          <DetailSection forceOpen={forceOpen} title={`Grammar issues (${details.grammar.items.length})`}>
            {details.grammar.items.slice(0, 15).map((item, i) => (
              <div className="detail-item" key={i}><span className="detail-rule">{item.rule}:</span> "{item.matched}"</div>
            ))}
          </DetailSection>
        )}

        {details.wordRepetition.overused.length > 0 && (
          <DetailSection forceOpen={forceOpen} title={`Overused words (${details.wordRepetition.overused.length})`}>
            {details.wordRepetition.overused.map((item, i) => (
              <div className="detail-item" key={i}>
                <span className="detail-wrong">"{item.word}"</span> used {item.count}x ({item.pct}%)
                {item.synonyms && <span className="detail-synonyms"> Try: {item.synonyms.join(', ')}</span>}
              </div>
            ))}
          </DetailSection>
        )}

        {details.originality.items.length > 0 && (
          <DetailSection forceOpen={forceOpen} title={`Cliche phrases (${details.originality.items.length})`}>
            {details.originality.items.map((item, i) => (
              <div className="detail-item" key={i}>
                <span className="detail-wrong">"{item.text}"</span>
                <span className="detail-fix">{item.fix}</span>
              </div>
            ))}
          </DetailSection>
        )}

        {details.firstPerson.iCount > 0 && (
          <DetailSection forceOpen={forceOpen} title="First-person pronoun usage">
            <div className="detail-item">"I" appears {details.firstPerson.iCount} times ({details.firstPerson.per100.toFixed(1)} per 100 words, baseline: {BASELINE.iCount.per100Words})</div>
            <div className="detail-item">"my" {details.firstPerson.myCount}x / "me" {details.firstPerson.meCount}x / "myself" {details.firstPerson.myselfCount}x / Total: {details.firstPerson.total}</div>
          </DetailSection>
        )}

        <div className={'rc-conclusion ' + (passed ? 'rc-pass' : 'rc-fail')}>
          <div className="rc-conclusion-icon">{passed ? '\u2713' : '\u2717'}</div>
          <div className="rc-conclusion-body">
            <div className="rc-conclusion-title">{passed ? 'Your essay is ready for expert review' : 'Your essay needs revision'}</div>
            <div className="rc-conclusion-score">Overall score: <strong>{overall}/100</strong></div>
            {priorityFixes.length > 0 && (
              <div className="rc-fixes">
                <div className="rc-fixes-title">Priority fixes:</div>
                <ol className="rc-fixes-list">
                  {priorityFixes.slice(0, 5).map((f, i) => <li key={i}>{f}</li>)}
                </ol>
              </div>
            )}
            <div className="rc-conclusion-rec">
              {passed
                ? 'Make the minor revisions above, then take this essay to a counselor for final review before submission.'
                : 'Rewrite your essay addressing the priority fixes above, then re-analyze. Once you hit 70+, take it to a counselor.'}
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
  const [question, setQuestion] = useState('')
  const [limit, setLimit] = useState('')
  const [essay, setEssay] = useState('')
  const [result, setResult] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)

  const wordCount = useMemo(() => countWords(essay), [essay])
  const charCount = essay.length
  const limitNum = parseInt(limit, 10)
  const isOver = Number.isFinite(limitNum) && limitNum > 0 && wordCount > limitNum
  const canSubmit = essayType && limit && essay.trim().length > 50

  useEffect(() => { emitEvent('tool_open', { action: 'open' }) }, [])

  function handleAnalyze(e) {
    e.preventDefault()
    if (!canSubmit) return
    setAnalyzing(true)
    emitEvent('essay_submit', {
      action: 'submit', targetLabel: essayType,
      extraData: { essay_type: essayType, college, word_count: wordCount },
    })
    setTimeout(() => {
      const res = runAllChecks(essay)
      setResult(res)
      setAnalyzing(false)
      emitEvent('report_generated', {
        action: 'analyze',
        extraData: { overall: res.overall, scores: Object.fromEntries(res.checks.map(c => [c.key, c.score])) },
      })
    }, 100)
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
              {ESSAY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
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
