// Cloudflare Pages Function: /api/insights
// Calls Google Gemini 2.5 Flash to extract:
//   1. Topics/themes the essay is actually about
//   2. Prompt-fit score (how well it answers the asked question)
// Both in one round-trip to conserve free-tier quota.

export async function onRequestPost(context) {
  const { request, env } = context

  if (!env.GEMINI_KEY) {
    return jsonResponse({ available: false, reason: 'no_key' })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ available: false, reason: 'bad_request' })
  }

  const { essay, prompt } = body
  if (!essay || typeof essay !== 'string' || essay.trim().length < 80) {
    return jsonResponse({ available: false, reason: 'too_short' })
  }

  const trimmedEssay = essay.slice(0, 6000)
  const trimmedPrompt = (prompt && typeof prompt === 'string') ? prompt.slice(0, 1000).trim() : ''

  // Build the LLM prompt. Keep instructions tight and force JSON output.
  const systemInstruction = [
    'You are an experienced college admissions counselor analyzing a draft personal essay.',
    'Be concise, honest, and specific. No platitudes.',
  ].join(' ')

  let userText
  if (trimmedPrompt) {
    userText = [
      'PROMPT (what the essay was supposed to answer):',
      trimmedPrompt,
      '',
      'STUDENT ESSAY:',
      trimmedEssay,
      '',
      'Analyze the essay and return ONLY this JSON shape, nothing else, no markdown fences:',
      '{',
      '  "topics": [3 to 5 short topic phrases the essay is actually about, 1-3 words each],',
      '  "promptFitScore": integer 0 to 100 of how directly the essay answers the prompt,',
      '  "promptFitReasoning": one sentence explaining the score,',
      '  "missed": one sentence on what the prompt asked but the essay did not address (or empty string if fully covered)',
      '}',
    ].join('\n')
  } else {
    // No prompt provided - skip prompt-fit, just do topics
    userText = [
      'STUDENT ESSAY:',
      trimmedEssay,
      '',
      'Return ONLY this JSON shape, nothing else, no markdown fences:',
      '{',
      '  "topics": [3 to 5 short topic phrases the essay is actually about, 1-3 words each],',
      '  "promptFitScore": null,',
      '  "promptFitReasoning": "",',
      '  "missed": ""',
      '}',
    ].join('\n')
  }

  const geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + encodeURIComponent(env.GEMINI_KEY)

  const reqBody = {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents: [{ role: 'user', parts: [{ text: userText }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 2000,
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingBudget: 0 },
    },
  }

  let geminiData
  try {
    const res = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody),
    })
    if (!res.ok) {
      const errText = await res.text()
      return jsonResponse({ available: false, reason: 'api_error', status: res.status, detail: errText.slice(0, 300) })
    }
    geminiData = await res.json()
  } catch (err) {
    return jsonResponse({ available: false, reason: 'fetch_failed', detail: String(err) })
  }

  // Extract text from response
  const candidate = geminiData?.candidates?.[0]
  const rawText = candidate?.content?.parts?.[0]?.text || ''
  if (!rawText) {
    return jsonResponse({ available: false, reason: 'empty_response' })
  }

  // Parse JSON - the model should return clean JSON since we set responseMimeType
  let parsed
  try {
    parsed = JSON.parse(rawText)
  } catch {
    // Try stripping markdown fences if present
    const cleaned = rawText.replace(/^```(?:json)?\s*|\s*```$/g, '').trim()
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      return jsonResponse({ available: false, reason: 'parse_failed', raw: rawText.slice(0, 300) })
    }
  }

  return jsonResponse({
    available: true,
    topics: Array.isArray(parsed.topics) ? parsed.topics.slice(0, 5).filter(t => typeof t === 'string') : [],
    promptFitScore: typeof parsed.promptFitScore === 'number' ? clampPct(parsed.promptFitScore) : null,
    promptFitReasoning: typeof parsed.promptFitReasoning === 'string' ? parsed.promptFitReasoning : '',
    missed: typeof parsed.missed === 'string' ? parsed.missed : '',
    hasPrompt: trimmedPrompt.length > 0,
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

function clampPct(n) {
  if (typeof n !== 'number' || isNaN(n)) return 0
  if (n < 0) return 0
  if (n > 100) return 100
  return Math.round(n)
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
