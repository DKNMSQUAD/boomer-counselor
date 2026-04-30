# Essay Feedback - Report Card UI & Reporting Logic

## Performance Target
Report generation should take under 3 seconds for a 650-word essay.
All analysis runs client-side in JavaScript. No API calls needed.
The only potentially slow part is spell checking (dictionary load).
Pre-load the dictionary on page load so it's ready when the student clicks Analyze.

---

## Page Layout (Two-Panel Design)

```
+------------------------------------------------------------------+
|  MASTHEAD: Essay Feedback | "Get your essay reviewed."           |
|  [Logo]                                    X Essays | Y Analyzed |
+------------------------------------------------------------------+

+---------------------------+--------------------------------------+
|                           |                                      |
|   LEFT PANEL (Input)      |   RIGHT PANEL (Report Card)          |
|   40% width               |   60% width                          |
|                           |                                      |
|   Student Name: [____]    |   (appears after clicking Analyze)   |
|   Target College: [____]  |                                      |
|   Essay Type: [dropdown]  |                                      |
|                           |                                      |
|   +---------------------+ |                                      |
|   |                     | |                                      |
|   |   Paste your essay  | |                                      |
|   |   here...           | |                                      |
|   |                     | |                                      |
|   |   (textarea)        | |                                      |
|   |   min 150 words     | |                                      |
|   |                     | |                                      |
|   +---------------------+ |                                      |
|                           |                                      |
|   Word count: 0           |                                      |
|   [  Analyze Essay  ]     |                                      |
|                           |                                      |
+---------------------------+--------------------------------------+
```

### Left Panel Fields
- **Student Name** (text input, required)
- **Target College** (text input, optional, e.g. "MIT", "Stanford")
- **Essay Type** (dropdown):
  - Common App Personal Statement
  - Supplemental Essay
  - Why This College
  - Activity / Extracurricular
  - Short Answer
- **Essay Text** (textarea, min 150 words, max 5000 words)
- **Live word count** (updates as student types)
- **Analyze Essay** button (disabled until 150+ words entered)

---

## Right Panel: Report Card (appears after analysis)

### Header Section
```
+------------------------------------------------------+
|  ESSAY REPORT CARD                                    |
|  Student: Rahul Sharma                                |
|  College: MIT | Essay Type: Common App                |
|  Words: 547 | Sentences: 36 | Analyzed: Apr 22, 2026  |
|                                                       |
|         OVERALL SCORE: 72 / 100                       |
|         [======== colored progress bar ========]      |
|         Rating: GOOD - NEEDS MINOR REVISIONS          |
+------------------------------------------------------+
```

Overall score color:
- 85-100: Green (#16a34a) - "EXCELLENT - READY FOR REVIEW"
- 70-84: Blue (#2563eb) - "GOOD - NEEDS MINOR REVISIONS"
- 50-69: Orange (#d97706) - "FAIR - NEEDS SIGNIFICANT WORK"
- 0-49: Red (#dc2626) - "NEEDS REWRITING"

---

### Section 1: Sentence Length Analysis (with histogram)

```
+------------------------------------------------------+
|  1. SENTENCE STRUCTURE                    Score: 78   |
|  --------------------------------------------------- |
|  Your avg: 18.3 words/sentence                       |
|  Baseline: 15.2 words/sentence                       |
|  Your std dev: 8.1 | Baseline: 6.8                   |
|                                                       |
|  [HISTOGRAM - vertical bar chart]                    |
|                                                       |
|   30%|  ██                                           |
|   25%|  ██ ██                                        |
|   20%|  ██ ██                                        |
|   15%|  ██ ██ ██                                     |
|   10%|  ██ ██ ██ ██                                  |
|    5%|██ ██ ██ ██ ██ ██                              |
|      +--+--+--+--+--+--+--                           |
|       1  6  11 16 21 26 31+                           |
|       -  -  -  -  -  -                                |
|       5  10 15 20 25 30                               |
|                                                       |
|   [Blue bars] = Your essay                           |
|   [Gray outline] = Baseline (10,000+ essays)         |
|                                                       |
|  FEEDBACK:                                           |
|  "Your sentences average 18.3 words, slightly longer  |
|   than typical essays (15.2). Your sentence length    |
|   variation (std dev 8.1) suggests uneven rhythm.     |
|   Consider breaking up sentences over 25 words."      |
|                                                       |
|  SPECIFIC EXAMPLES:                                  |
|  - Sentence 5 (32 words): "Although I had never..."  |
|    -> Try splitting: "I had never considered..."      |
|  - Sentence 12 (3 words): "I was devastated."        |
|    -> Consider expanding for context                  |
+------------------------------------------------------+
```

**Histogram logic:**
- Two overlaid bar charts (student = solid blue, baseline = gray outline)
- X-axis: word count ranges (1-5, 6-10, 11-15, 16-20, 21-25, 26-30, 31+)
- Y-axis: percentage of sentences in each range
- Use CSS or SVG to render (no external charting library needed)

**Score calculation:**
```javascript
// Evenness score based on coefficient of variation
const studentCV = studentStdDev / studentMean;
const baselineCV = 6.8 / 15.2; // = 0.447
const cvDiff = Math.abs(studentCV - baselineCV);
const evennessScore = Math.max(0, Math.round(100 - (cvDiff * 200)));

// Mean deviation penalty
const meanDiff = Math.abs(studentMean - 15.2);
const meanPenalty = Math.min(20, meanDiff * 2);

// Final score
const sentenceScore = Math.max(0, Math.min(100, evennessScore - meanPenalty));
```

---

### Section 2: Spelling

```
+------------------------------------------------------+
|  2. SPELLING                              Score: 90   |
|  --------------------------------------------------- |
|  [GREEN DOT] 2 misspelled words found                |
|                                                       |
|  - "acheive" -> Did you mean "achieve"?              |
|  - "occured" -> Did you mean "occurred"?             |
+------------------------------------------------------+
```

Score: `100 - (misspelledCount * 5)`, min 0

---

### Section 3: Grammar

```
+------------------------------------------------------+
|  3. GRAMMAR                               Score: 82   |
|  --------------------------------------------------- |
|  [YELLOW DOT] 6 issues detected                      |
|                                                       |
|  - Line 3: Missing capital after period               |
|  - Line 7: Passive voice "was given"                  |
|  - Line 12: "Very" is a weak intensifier              |
|    -> Instead of "very happy", try "elated"           |
+------------------------------------------------------+
```

Score: `100 - (issueCount * 3)`, min 0

---

### Section 4: Word Repetition

```
+------------------------------------------------------+
|  4. WORD VARIETY                          Score: 75   |
|  --------------------------------------------------- |
|  [YELLOW DOT] 3 overused words                       |
|                                                       |
|  - "experience" appears 8 times (3.2%)               |
|    -> Try: journey, encounter, involvement            |
|  - "opportunity" appears 6 times (2.4%)              |
|    -> Try: chance, opening, prospect                  |
|  - "passionate" appears 5 times (2.0%)               |
|    -> Try: dedicated, enthusiastic, driven            |
+------------------------------------------------------+
```

Score: `100 - (overusedCount * 10)`, min 0

**Synonym suggestions** (hardcoded map for common essay words):
```javascript
const SYNONYMS = {
  'experience': ['journey', 'encounter', 'involvement', 'exposure'],
  'opportunity': ['chance', 'opening', 'prospect', 'possibility'],
  'passionate': ['dedicated', 'enthusiastic', 'driven', 'committed'],
  'important': ['significant', 'crucial', 'vital', 'meaningful'],
  'interesting': ['compelling', 'engaging', 'fascinating', 'intriguing'],
  'helped': ['assisted', 'supported', 'guided', 'enabled'],
  'learned': ['discovered', 'realized', 'understood', 'recognized'],
  'different': ['distinct', 'unique', 'diverse', 'varied'],
  'community': ['network', 'group', 'society', 'collective'],
  'impact': ['influence', 'effect', 'contribution', 'difference'],
  'challenge': ['obstacle', 'difficulty', 'hurdle', 'adversity'],
  'growth': ['development', 'progress', 'evolution', 'transformation'],
  'leader': ['mentor', 'guide', 'pioneer', 'catalyst'],
  'team': ['group', 'collective', 'crew', 'collaborators'],
  'goal': ['objective', 'aspiration', 'ambition', 'aim'],
};
```

---

### Section 5: First-Person Usage

```
+------------------------------------------------------+
|  5. FIRST-PERSON BALANCE                  Score: 65   |
|  --------------------------------------------------- |
|  [RED DOT] "I" appears 42 times                      |
|  That is 7.7 per 100 words (typical: 4.2)            |
|                                                       |
|  Your essay feels very self-focused. Try restructuring|
|  some sentences to reduce "I" usage:                  |
|                                                       |
|  BEFORE: "I organized a fundraiser and I raised $500" |
|  AFTER:  "The fundraiser I organized raised $500"     |
+------------------------------------------------------+
```

Score:
```javascript
if (per100 <= 7) score = 100;
else score = Math.max(0, 100 - ((per100 - 7) * 15));
```

---

### Section 6: Originality

```
+------------------------------------------------------+
|  6. ORIGINALITY                           Score: 70   |
|  --------------------------------------------------- |
|  [YELLOW DOT] 4 cliche phrases detected              |
|                                                       |
|  - "ever since I was a child" (line 1)               |
|    -> Try a specific moment: "In third grade, when..."|
|  - "changed my life forever" (line 8)                |
|    -> Show, don't tell: describe the actual change    |
|  - "taught me the importance of" (line 15)           |
|    -> Be specific: what exactly did you learn?        |
|  - "pushed me out of my comfort zone" (line 22)      |
|    -> Describe the specific discomfort                |
+------------------------------------------------------+
```

Score: `100 - (clicheCount * 12)`, min 0

**Rewrite suggestions** (hardcoded for each cliche):
```javascript
const CLICHE_REWRITES = {
  'ever since i was a child': 'Start with a specific moment instead of a general statement. E.g., "In third grade, when..."',
  'changed my life forever': 'Show the change through specific actions or feelings rather than declaring it.',
  'from a young age': 'Replace with a specific age or moment: "At seven years old..." or "The summer before middle school..."',
  'taught me the importance of': 'Instead of telling, show what you learned through a specific example.',
  'i have always been passionate': 'Describe a specific moment that ignited this passion.',
  'opened my eyes to': 'Describe what you specifically saw or realized, not just that your eyes were opened.',
  'pushed me out of my comfort zone': 'Describe the specific discomfort and how you navigated it.',
  'i want to make a difference': 'Specify exactly what difference and how you plan to achieve it.',
  'this experience shaped who i am': 'Show who you became through actions, not declarations.',
  'i realized that': 'Show the realization through a scene or moment, not a summary statement.',
};
```

---

### Section 7: Negative Self-Talk

```
+------------------------------------------------------+
|  7. TONE: SELF-TALK                       Score: 85   |
|  --------------------------------------------------- |
|  [GREEN DOT] 1 instance of negative self-talk        |
|                                                       |
|  - "I struggled to keep up" (line 9, medium severity)|
|    -> Reframe: "I developed strategies to manage my   |
|       workload" shows growth instead of struggle      |
+------------------------------------------------------+
```

Score: `100 - (count * 15)`, min 0

---

### Section 8: Overboasting

```
+------------------------------------------------------+
|  8. TONE: CONFIDENCE BALANCE              Score: 100  |
|  --------------------------------------------------- |
|  [GREEN DOT] No overboasting detected                |
|  Your tone strikes a good balance between confidence  |
|  and humility.                                        |
+------------------------------------------------------+
```

Score: `100 - (count * 15)`, min 0

---

### Conclusion Section (BOTTOM OF REPORT)

Two possible outcomes based on overall score:

**If overall >= 70 (PASS):**
```
+------------------------------------------------------+
|  CONCLUSION                                           |
|  ===================================================  |
|                                                       |
|  [GREEN CHECKMARK ICON]                               |
|                                                       |
|  Your essay scores 78/100 - GOOD                      |
|                                                       |
|  This essay is ready for expert review. We recommend   |
|  taking this essay to a counselor for final feedback   |
|  before submission.                                   |
|                                                       |
|  KEY STRENGTHS:                                       |
|  + Good sentence variety                              |
|  + No spelling errors                                 |
|  + Original content                                   |
|                                                       |
|  AREAS TO IMPROVE:                                    |
|  - Reduce "I" usage (currently 7.7 per 100 words)    |
|  - Watch for overused words like "experience"         |
|                                                       |
|  [  Take to a Counselor  ] (link to tutor-counselor)  |
+------------------------------------------------------+
```

**If overall < 70 (NEEDS WORK):**
```
+------------------------------------------------------+
|  CONCLUSION                                           |
|  ===================================================  |
|                                                       |
|  [ORANGE WARNING ICON]                                |
|                                                       |
|  Your essay scores 52/100 - NEEDS WORK                |
|                                                       |
|  We recommend rewriting your essay with the feedback   |
|  above before submitting. Focus on these areas:       |
|                                                       |
|  PRIORITY FIXES:                                      |
|  1. Break up long sentences (avg 22 words vs ideal 15)|
|  2. Fix 5 spelling errors                             |
|  3. Remove 6 cliche phrases                           |
|  4. Reduce first-person pronoun usage                 |
|                                                       |
|  REWRITE SUGGESTIONS:                                 |
|                                                       |
|  Your sentence (line 3, 38 words):                    |
|  "Although I had always been interested in science    |
|   and I wanted to pursue a career in medicine because |
|   my grandmother was sick and I felt helpless."       |
|                                                       |
|  Suggested rewrite:                                   |
|  "My grandmother's illness left me feeling helpless.  |
|   That helplessness sparked my interest in medicine." |
|   (Split into 2 sentences, removed "I" repetition)   |
|                                                       |
|  [  Rewrite & Re-analyze  ] (clears report, keeps    |
|                               essay for editing)      |
+------------------------------------------------------+
```

---

## Rewrite Suggestions Logic

For sentences flagged as too long (>25 words), generate a suggestion:

```javascript
function suggestRewrite(sentence) {
  const words = sentence.split(/\s+/);
  if (words.length <= 25) return null;

  // Find natural split points: conjunctions, relative pronouns
  const splitWords = ['and', 'but', 'because', 'although', 'however',
                      'which', 'where', 'while', 'since', 'when'];

  let bestSplit = -1;
  let bestDistance = Infinity;
  const midpoint = Math.floor(words.length / 2);

  for (let i = 3; i < words.length - 3; i++) {
    if (splitWords.includes(words[i].toLowerCase())) {
      const distance = Math.abs(i - midpoint);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestSplit = i;
      }
    }
  }

  if (bestSplit === -1) return null;

  const part1 = words.slice(0, bestSplit).join(' ') + '.';
  const part2 = words[bestSplit].charAt(0).toUpperCase()
    + words[bestSplit].slice(1) + ' '
    + words.slice(bestSplit + 1).join(' ');

  return { original: sentence, suggested: part1 + ' ' + part2, splitAt: bestSplit };
}
```

---

## Visual Design Notes

### Color Scale for Each Check
- Score 85-100: Green dot (#16a34a), green left border
- Score 60-84: Yellow/amber dot (#d97706), yellow left border
- Score 0-59: Red dot (#dc2626), red left border

### Each Check Card
```css
.check-card {
  background: #faf7f2;
  border: 1px solid #c8bfa8;
  border-left: 4px solid; /* color based on score */
  border-radius: 3px;
  padding: 16px 20px;
  margin-bottom: 12px;
  font-family: 'IBM Plex Mono', monospace;
}
.check-header {
  display: flex;
  justify-content: space-between;
  font-family: 'Playfair Display', serif;
  font-weight: 700;
  font-size: 14px;
}
.check-score {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 12px;
  font-weight: 700;
}
```

### Histogram (CSS-based, no charting library)
```css
.histogram {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  height: 120px;
  padding: 0 8px;
  border-bottom: 1px solid #1a1a1a;
  border-left: 1px solid #1a1a1a;
}
.histogram-bar-group {
  display: flex;
  gap: 2px;
  align-items: flex-end;
  flex: 1;
}
.histogram-bar {
  flex: 1;
  min-width: 12px;
  transition: height 0.3s;
}
.histogram-bar.student { background: #2563eb; }
.histogram-bar.baseline { background: transparent; border: 1px dashed #999; }
```

---

## Analytics Events

Tool name in bcEvents.js: `"essay-feedback"`

Events to track:
- `tool_open` (when page loads inside hub iframe)
- `essay_submit` with extraData: `{ wordCount, essayType, college }`
- `report_generated` with extraData: `{ overallScore, checkScores }`
- `link_click` if they click "Take to a Counselor"
- `tool_close` (when they leave)
