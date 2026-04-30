# Essay Feedback - Phase 1 Analysis Logic

All analysis runs client-side in JavaScript. No AI API calls.

---

## Baseline Data (hardcoded from ~10,000 student essays)

These are the reference numbers to compare against. We will refine them later
with real data from a Google Sheet, but for now use these realistic baselines:

```javascript
const BASELINE = {
  sentenceLength: {
    mean: 15.2,        // average words per sentence
    median: 14,
    stdDev: 6.8,       // standard deviation of words per sentence
    min: 3,            // shortest reasonable sentence
    max: 35,           // longest reasonable sentence
    // distribution buckets (percentage of sentences in each range)
    histogram: {
      '1-5':   0.05,   // 5% of sentences are 1-5 words
      '6-10':  0.18,   // 18%
      '11-15': 0.30,   // 30%
      '16-20': 0.25,   // 25%
      '21-25': 0.13,   // 13%
      '26-30': 0.06,   // 6%
      '31+':   0.03,   // 3%
    },
  },
  essayLength: {
    meanWords: 550,
    meanSentences: 36,
  },
  iCount: {
    per100Words: 4.2,  // average "I" per 100 words in student essays
    maxPer100Words: 7, // above this is too many
  },
  wordRepetition: {
    maxFrequencyPercent: 3.0,  // a non-stop word appearing in >3% of total words is overused
  },
};
```

---

## 1. Sentence Length Analysis (THE KEY FEATURE)

### Step 1: Split essay into sentences
```
Split on: . ! ? (but NOT abbreviations like Mr. Mrs. Dr. U.S. etc.)
Regex: /(?<!\b(?:Mr|Mrs|Ms|Dr|Jr|Sr|St|Prof|Gen|Rep|Sen|U\.S|Inc|Ltd|Corp|vs|etc|e\.g|i\.e))\s*[.!?]+\s+/
Trim each sentence. Remove empty ones.
```

### Step 2: Count words per sentence
```
For each sentence: words = sentence.split(/\s+/).filter(w => w.length > 0).length
Result: array like [12, 8, 22, 15, 6, 18, ...]
```

### Step 3: Calculate statistics
```
studentMean = sum(lengths) / lengths.length
studentMedian = sorted lengths[middle index]
studentStdDev = sqrt(sum((x - mean)^2) / n)
```

### Step 4: Build histogram
```
Bucket each sentence into ranges: 1-5, 6-10, 11-15, 16-20, 21-25, 26-30, 31+
Calculate percentage in each bucket.
```

### Step 5: Compare to baseline
```
meanDiff = studentMean - BASELINE.sentenceLength.mean
stdDevDiff = studentStdDev - BASELINE.sentenceLength.stdDev

// Chi-squared-like comparison between histograms
chiSquared = sum over each bucket of:
  (studentPercent[bucket] - baselinePercent[bucket])^2 / baselinePercent[bucket]
```

### Step 6: Generate feedback
```
if studentMean > baseline.mean + 5:
  "Your average sentence is {studentMean} words. Most students average {baseline.mean}.
   Your sentences tend to be longer than typical essays."

if studentMean < baseline.mean - 5:
  "Your average sentence is {studentMean} words. Most students average {baseline.mean}.
   Your sentences are quite short compared to typical essays."

if studentStdDev > baseline.stdDev + 4:
  "Your sentence lengths vary a lot (std dev: {studentStdDev} vs typical {baseline.stdDev}).
   This makes your essay feel uneven. Try to make sentence lengths more consistent."

if studentStdDev < baseline.stdDev - 3:
  "Your sentences are all very similar in length. This can feel monotonous.
   Try mixing shorter and longer sentences for better rhythm."

// Show visual histogram comparison: student vs baseline
// Use a bar chart with two colors side by side per bucket
```

### Step 7: Readability Evenness Score (0-100)
```
// Coefficient of Variation = stdDev / mean
studentCV = studentStdDev / studentMean
baselineCV = baseline.stdDev / baseline.mean

// Score: how close student CV is to baseline CV
// Perfect = 100, very different = 0
cvDiff = abs(studentCV - baselineCV)
evennessScore = max(0, 100 - (cvDiff * 200))
```

---

## 2. Spelling Check

Use the `typo-js` library (Hunspell dictionaries in JavaScript).

```
npm install typo-js
```

```javascript
import Typo from 'typo-js';
const dictionary = new Typo('en_US');

function checkSpelling(text) {
  const words = text.match(/\b[a-zA-Z']+\b/g) || [];
  const misspelled = [];
  const skipWords = new Set([
    // common proper nouns, abbreviations, etc.
    'etc', 'vs', 'ie', 'eg',
  ]);

  for (const word of words) {
    if (skipWords.has(word.toLowerCase())) continue;
    if (word.length <= 2) continue; // skip very short words
    if (word[0] === word[0].toUpperCase()) continue; // skip capitalized (proper nouns)
    if (!dictionary.check(word)) {
      const suggestions = dictionary.suggest(word).slice(0, 3);
      misspelled.push({ word, suggestions });
    }
  }
  return misspelled;
}
```

If typo-js is too heavy (it loads ~3MB dictionary), use a simpler approach:
- Ship a list of ~5000 most common misspellings
- Check each word against that list
- Flag obvious errors

---

## 3. Grammar Check (Basic Patterns)

No NLP library needed. Pattern matching for common errors:

```javascript
const GRAMMAR_RULES = [
  {
    name: 'Double space',
    regex: /  +/g,
    message: 'Extra spaces found',
  },
  {
    name: 'Missing capital after period',
    regex: /[.!?]\s+[a-z]/g,
    message: 'Sentence should start with a capital letter',
  },
  {
    name: 'Repeated word',
    regex: /\b(\w+)\s+\1\b/gi,
    message: 'Word repeated: "$1"',
  },
  {
    name: 'Missing comma before conjunction in compound sentence',
    regex: /[a-z]\s+(and|but|or|so|yet)\s+[A-Z]/g,
    message: 'Consider a comma before "$1"',
  },
  {
    name: 'its vs it\'s',
    regex: /\bit's\s+(own|way|place|time|best|worst)/gi,
    message: '"its" (possessive) might be correct here instead of "it\'s" (it is)',
  },
  {
    name: 'their/there/they\'re common confusion',
    regex: /\b(their|there|they're)\b/gi,
    // just flag for awareness, can't auto-correct without context
    message: 'Check usage of "their/there/they\'re"',
    flagOnly: true, // don't auto-flag, just count
  },
  {
    name: 'Passive voice',
    regex: /\b(was|were|is|are|been|being)\s+(been\s+)?(made|done|given|taken|seen|known|found|told|shown|left|heard|kept|held|brought|written|provided|set|paid|met|run)\b/gi,
    message: 'Passive voice detected. Consider active voice.',
  },
  {
    name: 'Very + adjective (weak phrasing)',
    regex: /\bvery\s+\w+/gi,
    message: '"Very" is a weak intensifier. Use a stronger word.',
  },
];

function checkGrammar(text) {
  const issues = [];
  for (const rule of GRAMMAR_RULES) {
    const matches = [...text.matchAll(rule.regex)];
    for (const match of matches) {
      issues.push({
        rule: rule.name,
        message: rule.message,
        position: match.index,
        matched: match[0],
      });
    }
  }
  return issues;
}
```

---

## 4. Word Repetition Analysis

```javascript
// Stop words to ignore
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
]);

function analyzeWordRepetition(text) {
  const words = text.toLowerCase().match(/\b[a-z']+\b/g) || [];
  const totalWords = words.length;
  const freq = {};

  for (const w of words) {
    if (STOP_WORDS.has(w)) continue;
    if (w.length <= 2) continue;
    freq[w] = (freq[w] || 0) + 1;
  }

  // Find overused words (appearing more than 3% of total words)
  const threshold = totalWords * (BASELINE.wordRepetition.maxFrequencyPercent / 100);
  const overused = Object.entries(freq)
    .filter(([word, count]) => count > threshold && count >= 3)
    .sort((a, b) => b[1] - a[1])
    .map(([word, count]) => ({
      word,
      count,
      percent: ((count / totalWords) * 100).toFixed(1),
    }));

  return { totalWords, uniqueNonStopWords: Object.keys(freq).length, overused };
}
```

---

## 5. "I" Count

```javascript
function countFirstPerson(text) {
  const totalWords = text.split(/\s+/).filter(w => w.length > 0).length;
  // Count standalone "I" (not inside words like "India")
  const iMatches = text.match(/\bI\b/g) || [];
  const iCount = iMatches.length;

  // Also count "my", "me", "myself"
  const myCount = (text.match(/\bmy\b/gi) || []).length;
  const meCount = (text.match(/\bme\b/gi) || []).length;
  const myselfCount = (text.match(/\bmyself\b/gi) || []).length;

  const totalFirstPerson = iCount + myCount + meCount + myselfCount;
  const per100 = (iCount / totalWords) * 100;
  const baselinePer100 = BASELINE.iCount.per100Words;

  let feedback = '';
  if (per100 > BASELINE.iCount.maxPer100Words) {
    feedback = `You use "I" ${iCount} times (${per100.toFixed(1)} per 100 words). `
      + `Most essays use about ${baselinePer100} per 100 words. `
      + `Try varying your sentence structure to reduce first-person pronouns.`;
  } else if (per100 < 1.0 && totalWords > 200) {
    feedback = `You barely use "I" (${iCount} times). For a personal essay, `
      + `this might make it feel impersonal.`;
  }

  return { iCount, myCount, meCount, myselfCount, totalFirstPerson, per100, feedback };
}
```

---

## 6. Originality / Similarity Check

For Phase 1, use n-gram overlap with a small set of common essay topics/phrases.

```javascript
// Generate 3-grams (trigrams) from text
function getNGrams(text, n = 3) {
  const words = text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/);
  const grams = new Set();
  for (let i = 0; i <= words.length - n; i++) {
    grams.add(words.slice(i, i + n).join(' '));
  }
  return grams;
}

// Jaccard similarity between two sets
function jaccardSimilarity(setA, setB) {
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

// Common cliche phrases in college essays
const CLICHE_PHRASES = [
  'ever since i was a child',
  'from a young age',
  'i have always been passionate',
  'changed my life forever',
  'opened my eyes to',
  'taught me the importance of',
  'i learned that hard work',
  'a defining moment in my life',
  'i want to make a difference',
  'this experience shaped who i am',
  'pushed me out of my comfort zone',
  'i realized that',
  'my passion for',
  'i am determined to',
  'i have always dreamed of',
  'growing up in',
  'it was then that i realized',
  'looking back i realize',
  'this taught me that',
  'i am grateful for',
];

function checkOriginality(text) {
  const lower = text.toLowerCase();
  const clichesFound = CLICHE_PHRASES.filter(p => lower.includes(p));

  // For Phase 1: check against common cliche phrases
  // Phase 2: compare against stored essays in Google Sheet
  return {
    clicheCount: clichesFound.length,
    clichesFound,
    feedback: clichesFound.length > 3
      ? `Your essay contains ${clichesFound.length} commonly overused phrases. `
        + `Try to find more original ways to express your ideas.`
      : clichesFound.length > 0
        ? `Found ${clichesFound.length} common phrase(s). Consider rewording for originality.`
        : 'No common cliche phrases detected. Nice!',
  };
}
```

---

## 7. Negative Self-Talk Detection

```javascript
const NEGATIVE_PATTERNS = [
  { regex: /\bi('m| am) not good (enough|at)\b/gi, severity: 'high' },
  { regex: /\bi failed\b/gi, severity: 'high' },
  { regex: /\bi couldn'?t\b/gi, severity: 'medium' },
  { regex: /\bmy (biggest )?(weakness|flaw|failure|shortcoming)\b/gi, severity: 'high' },
  { regex: /\bi('m| am) (bad|terrible|awful|horrible) at\b/gi, severity: 'high' },
  { regex: /\bi struggle(d)? (with|to)\b/gi, severity: 'medium' },
  { regex: /\bunfortunately,? i\b/gi, severity: 'medium' },
  { regex: /\bi regret\b/gi, severity: 'medium' },
  { regex: /\bi('m| am) (just|only) a\b/gi, severity: 'high' },
  { regex: /\bi never (could|can|was able)\b/gi, severity: 'high' },
  { regex: /\bi('m| am) afraid\b/gi, severity: 'low' },
  { regex: /\bi lack\b/gi, severity: 'medium' },
  { regex: /\bmy (poor|weak|limited)\b/gi, severity: 'medium' },
  { regex: /\bi('m| am) (ashamed|embarrassed)\b/gi, severity: 'high' },
  { regex: /\bi don'?t (deserve|belong)\b/gi, severity: 'high' },
];

function detectNegativeSelfTalk(text) {
  const found = [];
  for (const pattern of NEGATIVE_PATTERNS) {
    const matches = [...text.matchAll(pattern.regex)];
    for (const match of matches) {
      found.push({
        phrase: match[0],
        severity: pattern.severity,
        position: match.index,
      });
    }
  }
  return {
    count: found.length,
    items: found,
    feedback: found.length > 2
      ? `Found ${found.length} instances of negative self-talk. `
        + `Admissions essays should show growth and resilience, not self-deprecation. `
        + `Reframe challenges as learning experiences.`
      : found.length > 0
        ? `Found ${found.length} instance(s) of potentially negative phrasing. Review and consider reframing.`
        : 'No negative self-talk detected.',
  };
}
```

---

## 8. Overboasting Detection

```javascript
const BOASTING_PATTERNS = [
  { regex: /\bi('m| am) the (best|greatest|top|only)\b/gi, severity: 'high' },
  { regex: /\bi single-?handedly\b/gi, severity: 'high' },
  { regex: /\bunlike (anyone|anybody|everyone) else\b/gi, severity: 'high' },
  { regex: /\bi always (succeed|win|excel|achieve)\b/gi, severity: 'medium' },
  { regex: /\bi never (fail|lose|give up)\b/gi, severity: 'medium' },
  { regex: /\bthe greatest (achievement|accomplishment|moment)\b/gi, severity: 'medium' },
  { regex: /\bno one (else )?(can|could|has|did)\b/gi, severity: 'medium' },
  { regex: /\bi('m| am) (exceptional|extraordinary|unmatched|unparalleled)\b/gi, severity: 'high' },
  { regex: /\beveryone (admires|respects|looks up to) me\b/gi, severity: 'high' },
  { regex: /\bi('m| am) (naturally|inherently) (gifted|talented|brilliant)\b/gi, severity: 'medium' },
  { regex: /\bi('m| am) (the smartest|better than|superior)\b/gi, severity: 'high' },
  { regex: /\bwithout me,?\s/gi, severity: 'medium' },
  { regex: /\bi was the first (person |one )?(to|who)\b/gi, severity: 'low' },
  { regex: /\bperfect (score|grades|record|GPA)\b/gi, severity: 'low' },
];

function detectOverboasting(text) {
  const found = [];
  for (const pattern of BOASTING_PATTERNS) {
    const matches = [...text.matchAll(pattern.regex)];
    for (const match of matches) {
      found.push({
        phrase: match[0],
        severity: pattern.severity,
        position: match.index,
      });
    }
  }
  return {
    count: found.length,
    items: found,
    feedback: found.length > 2
      ? `Found ${found.length} instances of potentially boastful language. `
        + `Confidence is good, but admissions readers prefer humility and self-awareness. `
        + `Show achievements through actions, not superlatives.`
      : found.length > 0
        ? `Found ${found.length} instance(s) of strong self-praise. Consider toning down.`
        : 'No overboasting detected. Good balance.',
  };
}
```

---

## Overall Score Card

Combine all checks into a single score:

```javascript
function calculateOverallScore(results) {
  const scores = {
    sentenceLength: results.sentenceLength.evennessScore,  // 0-100
    spelling: Math.max(0, 100 - (results.spelling.count * 5)),  // -5 per misspelling
    grammar: Math.max(0, 100 - (results.grammar.count * 3)),  // -3 per issue
    wordRepetition: Math.max(0, 100 - (results.wordRepetition.overused.length * 10)),
    iCount: results.iCount.per100 <= BASELINE.iCount.maxPer100Words ? 100 : Math.max(0, 100 - ((results.iCount.per100 - BASELINE.iCount.maxPer100Words) * 15)),
    originality: Math.max(0, 100 - (results.originality.clicheCount * 12)),
    negativeSelfTalk: Math.max(0, 100 - (results.negativeSelfTalk.count * 15)),
    overboasting: Math.max(0, 100 - (results.overboasting.count * 15)),
  };

  const overall = Math.round(
    Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length
  );

  return { scores, overall };
}
```

Display as a report card with:
- Overall score (0-100) with color (green >75, yellow 50-75, red <50)
- Individual scores per category
- Sentence length histogram (student vs baseline, two-color bar chart)
- List of specific issues found with locations in the text
