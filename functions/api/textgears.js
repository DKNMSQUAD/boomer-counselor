// Cloudflare Pages Function: /api/textgears
// Proxies TextGears API — keeps the key server-side, never exposed to browser

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
  const url = new URL(request.url)
  const debug = url.searchParams.get('debug') === '1'

  if (!text || text.trim().length < 5) {
    return jsonResponse({ spelling: [], grammar: [], ok: true })
  }

  const formData = new URLSearchParams()
  formData.append('text', text.slice(0, 3000))
  formData.append('language', language)

  let tgData
  let tgStatus
  let rawText
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
    tgStatus = tgRes.status
    rawText = await tgRes.text()
    try {
      tgData = JSON.parse(rawText)
    } catch {
      tgData = null
    }
  } catch (err) {
    return jsonResponse({ error: 'TextGears request failed', detail: String(err) }, 502)
  }

  const spelling = []
  const grammar = []

  if (tgData && tgData.response && Array.isArray(tgData.response.errors)) {
    for (const err of tgData.response.errors) {
      const item = {
        bad: err.bad || '',
        suggestion: Array.isArray(err.better) && err.better.length > 0 ? err.better[0] : '',
        description: err.description || '',
      }
      if (err.type === 'spelling') {
        spelling.push(item)
      } else {
        grammar.push(item)
      }
    }
  }

  const result = {
    spelling,
    grammar,
    ok: tgData?.response?.result ?? true,
  }

  if (debug) {
    result._debug = {
      tgStatus,
      tgRaw: rawText?.slice(0, 800),
      tgParsed: tgData,
    }
  }

  return jsonResponse(result)
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

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
