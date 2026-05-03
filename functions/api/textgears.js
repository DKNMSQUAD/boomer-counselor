// Cloudflare Pages Function: /api/textgears
// Proxies TextGears API. Keeps the key server-side, never exposed to browser.
// Filters false positives (proper nouns, identity suggestions, abbreviations)
// and attaches the surrounding sentence for each error so the UI can show
// the user where it occurred.

export async function onRequestPost(context) {
  const { request, env } = context

  if (!env.TEXTGEARS_KEY) {
    return jsonResponse({ error: 'TEXTGEARS_KEY not set in Pages environment variables' }, 500)
  }

  let body
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  const { text, language = 'en-US' } = body

  if (!text || text.trim().length < 5) {
    return jsonResponse({ spelling: [], grammar: [], ok: true })
  }

  const fullText = text.slice(0, 3000)
  const formData = new URLSearchParams()
  formData.append('text', fullText)
  formData.append('language', language)

  let tgData
  try {
    const tgRes = await fetch('https://textgears-textgears-v1.p.rapidapi.com/grammar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-rapidapi-host': 'textgears-textgears-v1.p.rapidapi.com',
        'x-rapidapi-key': env.TEXTGEARS_KEY,
      },
      body: formData.toString(),
    })
    if (!tgRes.ok) {
      return jsonResponse({ spelling: [], grammar: [], ok: false, error: `TextGears returned ${tgRes.status}` })
    }
    tgData = await tgRes.json()
  } catch (err) {
    return jsonResponse({ error: 'TextGears request failed', detail: String(err) }, 502)
  }

  const spelling = []
  const grammar = []

  if (tgData && tgData.response && Array.isArray(tgData.response.errors)) {
    for (const err of tgData.response.errors) {
      const bad = err.bad || ''
      const suggestion = Array.isArray(err.better) && err.better.length > 0 ? err.better[0] : ''
      const description = extractDescription(err.description)
      const offset = typeof err.offset === 'number' ? err.offset : -1

      // Filter 1: drop identity suggestions (Uncle to Uncle)
      if (suggestion && suggestion.toLowerCase() === bad.toLowerCase()) continue

      // Filter 2 (spelling only): drop likely proper nouns and abbreviations
      if (err.type === 'spelling') {
        if (looksLikeProperNoun(bad, fullText, offset)) continue
        if (looksLikeAbbreviation(bad)) continue
      }

      const sentence = extractSentence(fullText, offset, bad)

      const item = { bad, suggestion, description, sentence }
      if (err.type === 'spelling') spelling.push(item)
      else grammar.push(item)
    }
  }

  return jsonResponse({
    spelling,
    grammar,
    ok: tgData?.response?.result ?? true,
  })
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

// A capitalized word that is NOT at the start of a sentence is almost
// always a proper noun (name, place, brand). TextGears does not know
// these, so it offers a generic dictionary word as a suggestion. Skip them.
function looksLikeProperNoun(word, text, offset) {
  if (!word || word.length === 0) return false
  if (word[0] !== word[0].toUpperCase() || word[0] === word[0].toLowerCase()) return false
  if (offset < 0) {
    // No offset, fall back to: capitalized words are likely names if the rest is lowercase
    return /^[A-Z][a-z]+$/.test(word)
  }
  // Walk backwards to find the previous non-whitespace character
  let i = offset - 1
  while (i >= 0 && /\s/.test(text[i])) i--
  if (i < 0) return false // start of text, could legitimately be sentence start
  const prevChar = text[i]
  // If the previous non-space char is sentence-ending, this IS sentence start, do NOT skip
  if (prevChar === '.' || prevChar === '!' || prevChar === '?') return false
  // Otherwise it is mid-sentence, so a capitalized word is a proper noun
  return true
}

// Skip likely abbreviations and acronyms: short all-lowercase tokens with
// few vowels (amd, btw, idk) or short all-caps tokens
function looksLikeAbbreviation(word) {
  if (!word || word.length === 0) return false
  if (word.length <= 2) return true
  const lower = word.toLowerCase()
  if (word.length === 3) {
    const vowels = (lower.match(/[aeiou]/g) || []).length
    if (vowels === 0) return true
  }
  // Short all-caps (3-5 chars): acronym
  if (word.length <= 5 && word === word.toUpperCase() && /^[A-Z]+$/.test(word)) return true
  return false
}

// Pull the sentence containing the error so the user can locate it.
// Trim to ~140 chars max so very long sentences do not bloat the report.
function extractSentence(text, offset, bad) {
  if (offset < 0 || offset >= text.length) {
    // No offset: try to find the bad word ourselves
    if (!bad) return ''
    const idx = text.indexOf(bad)
    if (idx < 0) return ''
    offset = idx
  }
  // Find sentence boundaries around the offset
  let start = offset
  while (start > 0) {
    const c = text[start - 1]
    if (c === '.' || c === '!' || c === '?' || c === '\n') break
    start--
  }
  let end = offset
  while (end < text.length) {
    const c = text[end]
    if (c === '.' || c === '!' || c === '?' || c === '\n') {
      end++
      break
    }
    end++
  }
  let sentence = text.slice(start, end).trim()
  // Truncate around the bad word if very long
  const MAX = 140
  if (sentence.length > MAX) {
    const localOffset = offset - start
    const half = Math.floor(MAX / 2)
    let s = Math.max(0, localOffset - half)
    let e = Math.min(sentence.length, localOffset + half)
    let truncated = sentence.slice(s, e)
    if (s > 0) truncated = '...' + truncated
    if (e < sentence.length) truncated = truncated + '...'
    sentence = truncated
  }
  return sentence
}

function extractDescription(desc) {
  if (!desc) return ''
  if (typeof desc === 'string') return desc
  if (typeof desc === 'object') return desc.en || desc.value || Object.values(desc)[0] || ''
  return String(desc)
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
