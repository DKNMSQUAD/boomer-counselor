# Essay Feedback Tool - Requirements

## Overview
Two-phase approach:
- **Phase 1 (NOW)**: Built-in analysis logic (no AI API calls). All checks run client-side in the browser.
- **Phase 2 (LATER)**: Claude AI integration for deeper feedback.

## Phase 1 Analysis Checks

### 1. Spelling Check
- Detect misspelled words in the essay
- Highlight them in the feedback
- Suggest corrections where possible

### 2. Grammar Check
- Detect grammatical errors
- Flag common issues: subject-verb agreement, tense consistency, article usage, etc.

### 3. Sentence Length Analysis (KEY FEATURE)
Compare the student's sentence length distribution against a baseline built from 10,000+ past student essays.

**How it works:**
- Calculate the word count of each sentence in the essay
- Build a histogram of sentence lengths
- Compare against the baseline distribution
- Flag issues like:
  - "Your sentences are longer than most students' essays"
  - "Your essay has too many very short sentences"
  - "Your essay has too many very long sentences"
  - "Your sentence lengths are uneven, which hurts readability"
- Show the student's histogram vs the baseline histogram
- Calculate a "readability evenness" score
- Example: If the essay has sentences of 10, 6, 7, 8 words, show that curve and compare it to the ideal curve
- Mathematically: calculate standard deviation of sentence lengths, compare to baseline std dev

### 4. Word Repetition Analysis
- Count frequency of each word (excluding common stop words)
- Flag words that appear too frequently relative to essay length
- Use sentence length logic to weight the analysis
- Show which words are overused and how many times they appear

### 5. First-Person Pronoun Count ("I" count)
- Count the number of times "I" appears in the essay
- Compare against baseline (what's typical for the essay length)
- Flag if too many "I"s: "Your essay uses 'I' 47 times. Most essays of this length use it 15-20 times."

### 6. Originality / Similarity Check
- Compare the submitted essay against previously submitted essays in the database
- Flag if the essay is very similar to a past submission
- If a match is found: "This essay appears similar to one previously submitted for [College Name]"
- Store essays in a Google Sheet or database for comparison
- Use simple text similarity (cosine similarity, Jaccard index, or n-gram overlap)

### 7. Negative Self-Talk Detection
- Scan for phrases indicating negative self-talk
- Examples: "I failed", "I'm not good enough", "I couldn't", "my weakness", "I struggle with", "unfortunately I", "I regret"
- Flag these and suggest more positive reframing
- Admissions essays should show growth, not self-deprecation

### 8. Overboasting Detection
- Scan for phrases indicating excessive self-praise
- Examples: "I'm the best", "I single-handedly", "I'm exceptional", "unlike anyone else", "I always succeed", "I never fail", "the greatest"
- Flag these and suggest more balanced phrasing
- Admissions essays should show achievement without arrogance

## UI/UX
- Same design system as all other Boomer Counselor tools (Playfair Display + IBM Plex Mono, #eee8d9 background)
- Student pastes their essay into a text area
- Selects essay type (Common App, Supplemental, Why This College, etc.)
- Optionally enters target college name
- Clicks "Analyze Essay"
- Results shown as a report card with sections for each check
- Visual histogram for sentence length distribution
- Color-coded severity (green = good, yellow = warning, red = issue)

## Data Storage
- Past essays stored in a Google Sheet for the similarity check (Phase 1 can start with a static baseline)
- Analytics events sent via bcEvents.js (tool name: "essay-feedback")

## Technical Notes
- Phase 1 runs entirely client-side (no API calls except Google Sheets for baseline data)
- Use a dictionary library or word list for spell checking
- Sentence splitting: split on . ! ? (handling abbreviations like Mr. Mrs. Dr. etc.)
- Stop words list for word frequency analysis
- The baseline sentence length data can be hardcoded initially, then loaded from a sheet later
