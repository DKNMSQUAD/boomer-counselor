// Cloudflare Pages Function: /api/sentiment
// Proxies TextGears /sentiment endpoint. Returns tone polarity and confidence.

export async function onRequestPost(context) {
  const { request, env } = context

  if (!env.TEXTGEARS_KEY) {
    return jsonResponse({ available: false, reason: 'no_key' })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ available: false, reason: 'bad_request' })
  }

  const { text } = body
  if (!text || typeof text !== 'string' || text.trim().length < 30) {
    return jsonResponse({ available: false, reason: 'too_short' })
  }

  const formData = new URLSearchParams()
  formData.append('text', text.slice(0, 5000))

  let tgData
  try {
    const tgRes = await fetch('https://textgears-textgears-v1.p.rapidapi.com/sentiment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-rapidapi-host': 'textgears-textgears-v1.p.rapidapi.com',
        'x-rapidapi-key': env.TEXTGEARS_KEY,
      },
      body: formData.toString(),
    })
    if (!tgRes.ok) {
      return jsonResponse({ available: false, reason: 'api_error', status: tgRes.status })
    }
    tgData = await tgRes.json()
  } catch (err) {
    return jsonResponse({ available: false, reason: 'fetch_failed' })
  }

  // TextGears returns: response: { mode, polarity (-1..1), neutrality, confidence }
  // Some plans return per-sentence array, some return a single object.
  const r = tgData?.response
  if (!r) return jsonResponse({ available: false, reason: 'empty_response' })

  // Handle both shapes: array of sentence objects, or single object
  let polarity = 0
  let neutrality = 0
  let confidence = 0
  if (Array.isArray(r) && r.length > 0) {
    polarity = avg(r.map(x => num(x?.polarity)))
    neutrality = avg(r.map(x => num(x?.neutrality)))
    confidence = avg(r.map(x => num(x?.confidence)))
  } else if (typeof r === 'object') {
    polarity = num(r?.polarity)
    neutrality = num(r?.neutrality)
    confidence = num(r?.confidence)
  }

  // Map polarity -1..1 to a friendly label
  let tone
  if (neutrality > 0.6) tone = 'detached'
  else if (polarity > 0.4) tone = 'positive'
  else if (polarity > 0.1) tone = 'mostly_positive'
  else if (polarity > -0.1) tone = 'balanced'
  else if (polarity > -0.4) tone = 'mostly_negative'
  else tone = 'negative'

  return jsonResponse({
    available: true,
    polarity: Math.round(polarity * 100) / 100,
    neutrality: Math.round(neutrality * 100) / 100,
    confidence: Math.round(confidence * 100) / 100,
    tone,
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

function num(x) { return typeof x === 'number' && !isNaN(x) ? x : 0 }
function avg(arr) {
  if (!arr.length) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
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
