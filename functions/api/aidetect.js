// Cloudflare Pages Function: /api/aidetect
// Proxies the AI Content Detector API on RapidAPI.
// Keeps the key server-side, never exposed to the browser.

export async function onRequestPost(context) {
  const { request, env } = context

  // Reuse the same RapidAPI key as TextGears (single secret in CF env)
  const apiKey = env.TEXTGEARS_KEY
  if (!apiKey) {
    return jsonResponse({ error: 'TEXTGEARS_KEY not set in Pages environment variables' }, 500)
  }

  let body
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  const { text } = body
  if (!text || typeof text !== 'string' || text.trim().length < 30) {
    // Too short to detect meaningfully. Return null result so UI can hide section.
    return jsonResponse({ available: false, reason: 'too_short' })
  }

  // The API has a free-tier rate limit. Trim very long essays so a single
  // request stays well under any payload limit.
  const payload = { text: text.slice(0, 5000) }

  let apiData
  try {
    const apiRes = await fetch('https://ai-content-detector-ai-gpt.p.rapidapi.com/api/detectText/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-host': 'ai-content-detector-ai-gpt.p.rapidapi.com',
        'x-rapidapi-key': apiKey,
      },
      body: JSON.stringify(payload),
    })
    if (!apiRes.ok) {
      return jsonResponse({ available: false, reason: 'api_error', status: apiRes.status })
    }
    apiData = await apiRes.json()
  } catch (err) {
    return jsonResponse({ available: false, reason: 'fetch_failed', detail: String(err) })
  }

  // Map response to a clean shape the UI can render
  const fakePct = clampNum(apiData?.fakePercentage)
  const aiWords = numOrNull(apiData?.aiWords)
  const totalWords = numOrNull(apiData?.textWords)
  const flaggedSentences = Array.isArray(apiData?.sentences) ? apiData.sentences.slice(0, 5) : []

  return jsonResponse({
    available: true,
    aiPercent: Math.round(fakePct),
    humanPercent: Math.round(100 - fakePct),
    aiWords,
    totalWords,
    flaggedSentences,
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

function clampNum(n) {
  if (typeof n !== 'number' || isNaN(n)) return 0
  if (n < 0) return 0
  if (n > 100) return 100
  return n
}
function numOrNull(n) {
  return typeof n === 'number' && !isNaN(n) ? n : null
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
