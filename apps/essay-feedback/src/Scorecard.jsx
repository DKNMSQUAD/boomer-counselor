import React, { useState, useEffect } from 'react'
import { jsPDF } from 'jspdf'

// === Marker positions on Low/Med/High track (0-100) ===
const spellingPos = (n) => n <= 1 ? 92 : n <= 3 ? 75 : n <= 6 ? 50 : n <= 10 ? 25 : 8
const grammarPos = (n) => n === 0 ? 95 : n <= 2 ? 78 : n <= 5 ? 50 : n <= 9 ? 25 : 8
const sentencePos = (m) => m < 12 ? 22 : m < 16 ? 40 : m <= 20 ? 75 : m <= 24 ? 55 : 25
const iUsagePos = (p) => p <= 2 ? 88 : p <= 4 ? 65 : p <= 6 ? 42 : p <= 9 ? 22 : 8
const uniquenessPos = (s) => s < 30 ? 92 : s < 45 ? 75 : s < 60 ? 50 : s < 75 ? 25 : 8
const promptFitPos = (s) => s == null ? 50 : s >= 85 ? 92 : s >= 70 ? 75 : s >= 55 ? 50 : s >= 40 ? 25 : 8

const bandFromPos = (p) => p < 33 ? 'low' : p < 67 ? 'med' : 'high'

const statusLabel = (key, pos, raw) => {
  const b = bandFromPos(pos)
  if (key === 'spelling')   return b === 'high' ? 'Good' : b === 'med' ? 'A few errors' : 'Many errors'
  if (key === 'grammar')    return b === 'high' ? 'Good' : b === 'med' ? 'Some issues' : 'Many issues'
  if (key === 'sentence') {
    if (raw < 12) return 'Shorter than others'
    if (raw > 24) return 'Much longer'
    if (raw >= 14 && raw <= 22) return 'Just right'
    return 'A little off'
  }
  if (key === 'i-usage')    return b === 'high' ? 'Balanced' : b === 'med' ? 'A bit much' : 'More than others'
  if (key === 'uniqueness') return b === 'high' ? 'More unique' : b === 'med' ? 'Some overlap' : 'Sounds generic'
  if (key === 'prompt')     return b === 'high' ? 'Strong fit' : b === 'med' ? 'Partial fit' : 'Off prompt'
  return ''
}

const wcInfo = (wc, limit) => {
  if (!limit) return { tone: 'nolimit', text: 'No limit set' }
  const pct = wc / limit
  if (pct > 1) return { tone: 'over', text: 'Over the limit' }
  if (pct < 0.85) return { tone: 'short', text: 'Under target' }
  return { tone: 'ok', text: 'Within range' }
}

// Highlight a bad word in a sentence using simple case-insensitive indexOf (no regex, no backslashes)
const highlight = (sentence, bad) => {
  if (!sentence || !bad) return sentence || ''
  const lower = sentence.toLowerCase()
  const bLower = String(bad).toLowerCase()
  const idx = lower.indexOf(bLower)
  if (idx < 0) return sentence
  const e = idx + bLower.length
  return (
    <>
      {sentence.slice(0, idx)}
      <mark className="sc-mark">{sentence.slice(idx, e)}</mark>
      {sentence.slice(e)}
    </>
  )
}

function DrawerSpelling({ result }) {
  const items = result.details.spelling.items || []
  const count = result.details.spelling.count || 0
  if (count === 0) return <p className="sc-good-text">No spelling issues. Nice work.</p>
  return (
    <>
      <p>You have {count} spelling {count === 1 ? 'issue' : 'issues'}. The wrong word is highlighted in each sentence below.</p>
      <ul className="sc-mistake-list">
        {items.slice(0, 12).map((it, i) => (
          <li key={i} className="sc-mistake-item">
            <div className="sc-mistake-sentence">{highlight(it.sentence, it.word)}</div>
            <div className="sc-mistake-fix">
              <span className="sc-bad">{it.word}</span>
              <span className="sc-arrow">to</span>
              <span className="sc-good">{it.suggestion || 'check spelling'}</span>
            </div>
          </li>
        ))}
      </ul>
      <p className="sc-tip">Tip: Read your essay out loud once. Your ear catches typos your eye misses.</p>
    </>
  )
}

function DrawerGrammar({ result }) {
  const items = result.details.mechanics.grammarIssues || []
  if (items.length === 0) return <p className="sc-good-text">No grammar issues found. Nice work.</p>
  const rich = items.filter(it => it && it.bad && it.suggestion)
  const textOnly = items.filter(it => it && !(it.bad && it.suggestion) && (it.text || it.type))
  return (
    <>
      <p>You have {items.length} grammar {items.length === 1 ? 'issue' : 'issues'}.</p>
      {rich.length > 0 && (
        <ul className="sc-mistake-list">
          {rich.slice(0, 12).map((it, i) => (
            <li key={'r' + i} className="sc-mistake-item">
              <div className="sc-mistake-sentence">{it.sentence ? highlight(it.sentence, it.bad) : <em>{it.bad}</em>}</div>
              <div className="sc-mistake-fix">
                <span className="sc-bad">{it.bad}</span>
                <span className="sc-arrow">to</span>
                <span className="sc-good">{it.suggestion}</span>
              </div>
              {it.type && <div className="sc-meta">{it.type}</div>}
            </li>
          ))}
        </ul>
      )}
      {textOnly.length > 0 && (
        <>
          <p className="sc-section-label">Other patterns to review</p>
          <ul className="sc-mistake-list">
            {textOnly.slice(0, 8).map((it, i) => (
              <li key={'t' + i} className="sc-mistake-item">
                <div className="sc-mistake-sentence">{it.text ? <em>{it.text}</em> : null}</div>
                <div className="sc-meta">{it.type || 'Phrasing'}</div>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}

function DrawerSentence({ result }) {
  const mean = Math.round(result.details.sentenceStats.mean || 0)
  const pctLong = Math.round(result.details.sentenceStats.pctOver25 || 0)
  const problematic = result.details.mechanics.problematic || []
  return (
    <>
      <p>Your sentences are <strong>{mean} words</strong> long on average. Strong essays usually sit between 14 and 20 words.</p>
      {mean < 12 && <p className="sc-tip">Your sentences are short. Combining a few related ideas adds rhythm and helps thoughts flow.</p>}
      {mean >= 12 && mean <= 22 && <p className="sc-good-text">Your sentence length is in a healthy range.</p>}
      {mean > 22 && <p className="sc-tip">Your sentences run long. Try breaking the longest ones into two so each idea lands harder.</p>}
      {pctLong > 20 && <p>About {pctLong}% of your sentences run past 25 words, which can lose the reader.</p>}
      {problematic.length > 0 && (
        <>
          <p className="sc-section-label">Sentences worth shortening</p>
          <ul className="sc-mistake-list">
            {problematic.slice(0, 4).map((p, i) => (
              <li key={i} className="sc-mistake-item">
                <div className="sc-mistake-sentence">{p.text}</div>
                <div className="sc-meta">{p.length} words</div>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}

function DrawerIUsage({ result }) {
  const per = Math.round(result.details.repetition.iPer100 || 0)
  const total = result.details.repetition.totalIUsage || 0
  return (
    <>
      <p>You used the word "I" <strong>{total} times</strong>, which works out to {per} times per 100 words.</p>
      {per > 6 && <p className="sc-tip">That is more than most students. Try opening some sentences with what you did, what you saw, or what mattered, instead of "I". For example, "Watching the sun set over the lake" sounds stronger than "I watched the sun set over the lake".</p>}
      {per >= 3 && per <= 6 && <p className="sc-tip">A bit on the high side. Mix in a few sentences that lead with a thought, image, or action instead of "I".</p>}
      {per < 3 && <p className="sc-good-text">Balanced. You are talking about yourself without overdoing it.</p>}
    </>
  )
}

function DrawerUniqueness({ result }) {
  const sim = Math.round((result.details.similarity && result.details.similarity.matches && result.details.similarity.matches[0] && result.details.similarity.matches[0].similarity) || 0)
  const compared = (result.details.similarity && result.details.similarity.totalCompared) || 0
  return (
    <>
      <p>We compared your essay against {compared.toLocaleString()} past essays. The closest one was <strong>{sim}% similar</strong>.</p>
      {sim >= 70 && <p className="sc-tip sc-warn">Your essay sounds a lot like ones we have seen before. Cut common openings, generic adjectives, and clichés. Lead with something only you would write.</p>}
      {sim >= 45 && sim < 70 && <p className="sc-tip">Some overlap with common essay patterns. Add specific details, names, sensory moments. The more specific, the more unique.</p>}
      {sim < 45 && <p className="sc-good-text">Your essay reads as your own. Keep that voice.</p>}
    </>
  )
}

function DrawerPrompt({ result }) {
  const insights = result.insights
  if (!insights || !insights.available) return <p>Prompt fit check is not available for this essay.</p>
  const score = Math.round(insights.promptFitScore || 0)
  const reasoning = insights.promptFitReasoning || ''
  const missed = insights.missed
  const missedItems = Array.isArray(missed) ? missed : (missed ? [missed] : [])
  const topics = insights.topics || []
  return (
    <>
      <p>Prompt fit score: <strong>{score} out of 100</strong></p>
      {reasoning && <p>{reasoning}</p>}
      {missedItems.length > 0 && (
        <>
          <p className="sc-section-label">What you missed from the prompt</p>
          <ul className="sc-bullet-list">
            {missedItems.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        </>
      )}
      {topics.length > 0 && (
        <>
          <p className="sc-section-label">Topics you covered</p>
          <div className="sc-chip-row">
            {topics.map((t, i) => <span key={i} className="sc-chip-soft">{t}</span>)}
          </div>
        </>
      )}
    </>
  )
}

function exportPdf({ result, meta, bars, wcStatus, wc, limit, repeated, verdict, verdictDesc }) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const M = 36

  pdf.setFillColor(20, 20, 20)
  pdf.roundedRect(M, M, pageW - 2 * M, 90, 14, 14, 'F')
  pdf.setTextColor(245, 240, 220)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(20)
  pdf.text('Your Feedback from Boomer Counselor', M + 24, M + 36)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.text((meta.essayType || 'Essay') + (meta.college ? ' - ' + meta.college : ''), M + 24, M + 60)
  pdf.text(wc + ' words   ' + new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }), M + 24, M + 76)

  let y = M + 90 + 32
  pdf.setTextColor(20, 20, 20)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(13)
  pdf.text('How your essay scores', M, y)
  y += 22

  const rowH = 56
  bars.forEach((b) => {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(11)
    pdf.setTextColor(30, 30, 30)
    pdf.text(b.label, M, y + 26)

    const trackX = M + 200
    const trackW = pageW - M - trackX - 140
    const trackY = y + 26

    pdf.setDrawColor(210, 210, 210)
    pdf.setLineWidth(1.5)
    pdf.line(trackX, trackY, trackX + trackW, trackY)

    pdf.setDrawColor(170, 170, 170)
    pdf.setLineWidth(0.7)
    const ticks = [0, 1/3, 2/3, 1]
    ticks.forEach(t => {
      pdf.line(trackX + t * trackW, trackY - 3, trackX + t * trackW, trackY + 3)
    })

    pdf.setFontSize(7.5)
    pdf.setTextColor(160, 160, 160)
    pdf.text('LOW', trackX + trackW * (1/6) - 6, trackY + 14)
    pdf.text('MED', trackX + trackW * (3/6) - 6, trackY + 14)
    pdf.text('HIGH', trackX + trackW * (5/6) - 8, trackY + 14)

    const mx = trackX + (b.pos / 100) * trackW
    const col = b.pos < 33 ? [194, 71, 71] : b.pos < 67 ? [217, 154, 56] : [88, 158, 92]
    pdf.setFillColor(col[0], col[1], col[2])
    pdf.circle(mx, trackY, 4.5, 'F')
    pdf.setDrawColor(255, 255, 255)
    pdf.setLineWidth(1)
    pdf.circle(mx, trackY, 4.5, 'S')

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(11)
    pdf.setTextColor(col[0], col[1], col[2])
    pdf.text(b.status, trackX + trackW + 18, y + 30)

    y += rowH
  })

  const cy = y + 16
  const cH = 130
  const gap = 14
  const cW = (pageW - 2 * M - 2 * gap) / 3

  pdf.setFillColor(245, 240, 230)
  pdf.roundedRect(M, cy, cW, cH, 12, 12, 'F')
  pdf.setTextColor(120, 100, 70)
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'bold')
  pdf.text('MOST REPEATED WORDS', M + 14, cy + 22)
  pdf.setTextColor(20, 20, 20)
  pdf.setFontSize(13)
  pdf.setFont('helvetica', 'normal')
  const repWrap = pdf.splitTextToSize(repeated.text, cW - 28)
  pdf.text(repWrap, M + 14, cy + 50)

  const wcX = M + cW + gap
  pdf.setFillColor(225, 240, 255)
  pdf.roundedRect(wcX, cy, cW, cH, 12, 12, 'F')
  pdf.setTextColor(50, 90, 160)
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'bold')
  pdf.text('WORD COUNT', wcX + 14, cy + 22)
  pdf.setTextColor(20, 20, 20)
  pdf.setFontSize(30)
  pdf.text(String(wc), wcX + 14, cy + 62)
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(80, 80, 80)
  pdf.text('of ' + (limit || '-') + ' allowed', wcX + 14, cy + 82)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(20, 20, 20)
  pdf.setFontSize(11)
  pdf.text(wcStatus.text, wcX + 14, cy + 105)

  const osX = M + 2 * (cW + gap)
  pdf.setFillColor(255, 248, 220)
  pdf.roundedRect(osX, cy, cW, cH, 12, 12, 'F')
  pdf.setTextColor(140, 110, 60)
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'bold')
  pdf.text('OVERALL SCORE', osX + 14, cy + 22)
  pdf.setTextColor(20, 20, 20)
  pdf.setFontSize(40)
  pdf.text(String(Math.round(result.overall)), osX + 14, cy + 70)
  pdf.setFontSize(11)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(120, 120, 120)
  pdf.text('/100', osX + 70, cy + 70)
  pdf.setFontSize(10)
  pdf.setTextColor(80, 80, 80)
  pdf.text('Better than ' + Math.round(result.percentile || 50) + '%', osX + 14, cy + 92)
  pdf.text('of past essays', osX + 14, cy + 106)

  const vy = cy + cH + 20
  let bg = [232, 247, 232], fg = [30, 110, 50]
  if (verdict === 'Almost there') { bg = [255, 245, 220]; fg = [140, 100, 30] }
  if (verdict === 'Needs revision') { bg = [255, 235, 220]; fg = [180, 80, 30] }
  if (verdict === 'Major rewrite needed') { bg = [255, 225, 225]; fg = [170, 40, 40] }
  pdf.setFillColor(bg[0], bg[1], bg[2])
  pdf.roundedRect(M, vy, pageW - 2 * M, 80, 12, 12, 'F')
  pdf.setTextColor(fg[0], fg[1], fg[2])
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(16)
  pdf.text(verdict, M + 18, vy + 28)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(11)
  pdf.setTextColor(50, 50, 50)
  const vdWrap = pdf.splitTextToSize(verdictDesc, pageW - 2 * M - 36)
  pdf.text(vdWrap, M + 18, vy + 50)

  pdf.addPage()
  let py = M + 10
  pdf.setTextColor(20, 20, 20)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(20)
  pdf.text('Detailed feedback', M, py + 24)
  py += 56

  const drawSection = (title, lines) => {
    if (py > pageH - 80) return
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(13)
    pdf.setTextColor(20, 20, 20)
    pdf.text(title, M, py)
    py += 20
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10.5)
    pdf.setTextColor(50, 50, 50)
    lines.forEach(line => {
      const wrapped = pdf.splitTextToSize(line, pageW - 2 * M)
      pdf.text(wrapped, M, py)
      py += wrapped.length * 14 + 4
    })
    py += 18
  }

  const sc = result.details.spelling.count || 0
  const spItems = sc > 0
    ? (result.details.spelling.items || [])
        .filter(it => it && it.word)
        .slice(0, 10)
        .map(it => '  ' + it.word + (it.suggestion ? ' should be ' + it.suggestion : ''))
    : []
  drawSection('Spelling', sc === 0 ? ['No spelling issues found.'] : ['Found ' + sc + ' spelling ' + (sc === 1 ? 'issue' : 'issues') + ':', ...spItems])

  const gIs = result.details.mechanics.grammarIssues || []
  const gItems = gIs
    .filter(it => it && (it.bad || it.text))
    .slice(0, 10)
    .map(it => {
      if (it.bad && it.suggestion) return '  ' + it.bad + ' should be ' + it.suggestion + (it.type ? '   (' + it.type + ')' : '')
      if (it.text) return '  ' + (it.type ? it.type + ': ' : '') + it.text
      return ''
    })
    .filter(line => line.length > 0)
  drawSection('Grammar', gIs.length === 0 ? ['No grammar issues found.'] : ['Found ' + gIs.length + ' grammar ' + (gIs.length === 1 ? 'issue' : 'issues') + ':', ...gItems])

  const sm = Math.round(result.details.sentenceStats.mean || 0)
  drawSection('Sentence length', [
    'Your sentences average ' + sm + ' words. Strong essays usually sit between 14 and 20 words.',
    sm < 12 ? 'Combining related ideas adds rhythm.' : sm > 22 ? 'Break the longest ones into two for stronger impact.' : 'Length is in a healthy range.'
  ])

  const ip = Math.round(result.details.repetition.iPer100 || 0)
  const iTotal = result.details.repetition.totalIUsage || 0
  drawSection('I usage', [
    'You used the word I ' + iTotal + ' times, which is ' + ip + ' times per 100 words.',
    ip > 6 ? 'More than most students. Open some sentences with action or thought instead.' : ip < 3 ? 'Balanced. You are talking about yourself without overdoing it.' : 'Slightly high. Mix in some sentences that do not start with I.'
  ])

  const sim = Math.round((result.details.similarity && result.details.similarity.matches && result.details.similarity.matches[0] && result.details.similarity.matches[0].similarity) || 0)
  const compared = (result.details.similarity && result.details.similarity.totalCompared) || 0
  drawSection('Uniqueness', [
    'Compared against ' + compared.toLocaleString() + ' past essays. Closest match was ' + sim + '% similar.',
    sim >= 70 ? 'Sounds like essays we have seen before. Cut clichés and lead with specifics.' : sim >= 45 ? 'Some overlap. Add specific details and sensory moments.' : 'Reads as your own. Keep that voice.'
  ])

  if (result.insights && result.insights.available && result.insights.hasPrompt) {
    const sc2 = Math.round(result.insights.promptFitScore || 0)
    const pLines = ['Prompt fit: ' + sc2 + ' out of 100.']
    if (result.insights.promptFitReasoning) pLines.push(result.insights.promptFitReasoning)
    if (result.insights.missed) {
      const missArr = Array.isArray(result.insights.missed) ? result.insights.missed : [result.insights.missed]
      missArr.slice(0, 3).forEach(m => pLines.push('  Missed: ' + m))
    }
    drawSection('Prompt fit', pLines)
  }

  pdf.save('essay-feedback-' + Date.now() + '.pdf')
}

export default function Scorecard({ result, meta, onBack }) {
  const [openMetric, setOpenMetric] = useState(null)

  useEffect(() => {
    document.body.style.overflow = openMetric ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [openMetric])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setOpenMetric(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const sCount = result.details.spelling.count || 0
  const gCount = (result.details.mechanics.grammarIssues || []).length
  const sentMean = result.details.sentenceStats.mean || 0
  const iPer = result.details.repetition.iPer100 || 0
  const simPct = (result.details.similarity && result.details.similarity.matches && result.details.similarity.matches[0] && result.details.similarity.matches[0].similarity) || 0
  const promptScore = result.insights && result.insights.promptFitScore

  const sPos = spellingPos(sCount)
  const gPos = grammarPos(gCount)
  const senPos = sentencePos(sentMean)
  const iPos = iUsagePos(iPer)
  const uPos = uniquenessPos(simPct)
  const pPos = promptFitPos(promptScore)

  const wc = meta.wordCount || 0
  const limit = meta.limit || 0
  const wcStatus = wcInfo(wc, limit)

  const bars = [
    { key: 'spelling', label: 'Spelling', pos: sPos, status: statusLabel('spelling', sPos) },
    { key: 'grammar', label: 'Grammatical mistakes', pos: gPos, status: statusLabel('grammar', gPos) },
    { key: 'sentence', label: 'Sentence length', pos: senPos, status: statusLabel('sentence', senPos, sentMean) },
    { key: 'i-usage', label: '"I" usage', pos: iPos, status: statusLabel('i-usage', iPos) },
    { key: 'uniqueness', label: 'Uniqueness', pos: uPos, status: statusLabel('uniqueness', uPos) },
    { key: 'prompt', label: 'Does it answer the prompt', pos: pPos, status: statusLabel('prompt', pPos) },
  ]

  const overused = result.details.repetition.overused || []
  const repeated = overused.length === 0
    ? { text: 'Good variety', tone: 'good' }
    : { text: overused.length + ' word' + (overused.length > 1 ? 's' : '') + ' repeat too often', tone: overused.length > 3 ? 'bad' : 'warn' }

  const overall = Math.round(result.overall || 0)
  const verdict = overall >= 80 ? 'Looks ready' : overall >= 65 ? 'Almost there' : overall >= 50 ? 'Needs revision' : 'Major rewrite needed'
  const verdictDesc = verdict === 'Looks ready'
    ? 'Your essay is in solid shape. Polish the small stuff and submit with confidence.'
    : verdict === 'Almost there'
    ? 'You are close. Fix the flagged items and read once aloud before submitting.'
    : verdict === 'Needs revision'
    ? 'Several things need work before this essay is ready. Use the suggestions on each metric.'
    : 'This essay needs a meaningful rewrite. Focus on the prompt and your unique angle.'

  const openLabel = openMetric ? bars.find(b => b.key === openMetric).label : ''

  return (
    <div className="sc-page">
      <header className="sc-header">
        <div className="sc-header-left">
          <h1>Your Feedback from Boomer Counselor</h1>
          <div className="sc-subhead">BOOMER COUNSELOR</div>
        </div>
        <div className="sc-header-right">
          <div>{meta.essayType || 'Essay'}{meta.college ? ' - ' + meta.college : ''}</div>
          <div>{wc} words</div>
          <div>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
        </div>
      </header>

      <div className="sc-hint">
        <span className="sc-hint-icon">i</span>
        <span>Tap any metric below to see what it means and how to fix it</span>
      </div>

      <section className="sc-bars-card">
        {bars.map(b => (
          <button key={b.key} type="button" className="sc-bar-row" onClick={() => setOpenMetric(b.key)}>
            <div className="sc-bar-label">{b.label}</div>
            <div className="sc-bar-track">
              <div className="sc-bar-zone sc-zone-low">LOW</div>
              <div className="sc-bar-zone sc-zone-med">MED</div>
              <div className="sc-bar-zone sc-zone-high">HIGH</div>
              <div className="sc-bar-marker" style={{ left: b.pos + '%' }} />
            </div>
            <div className="sc-bar-status">{b.status}</div>
            <div className="sc-bar-chev">›</div>
          </button>
        ))}
      </section>

      <section className="sc-cards-row">
        <div className="sc-card sc-card-repeated">
          <div className="sc-card-label">Most repeated words</div>
          <div className={'sc-card-body sc-tone-' + repeated.tone}>{repeated.text}</div>
          {overused.length > 0 && (
            <div className="sc-chip-row">
              {overused.slice(0, 6).map((w, i) => (
                <span key={i} className="sc-chip">{w.word || w}</span>
              ))}
            </div>
          )}
        </div>

        <div className={'sc-card sc-card-wordcount sc-wc-' + wcStatus.tone}>
          <div className="sc-card-label">Word count</div>
          <div className="sc-wc-numbers">
            <div className="sc-wc-cell">
              <div className="sc-wc-num">{wc}</div>
              <div className="sc-wc-sub">Yours</div>
            </div>
            <div className="sc-wc-divider" />
            <div className="sc-wc-cell">
              <div className="sc-wc-num">{limit || '-'}</div>
              <div className="sc-wc-sub">Allowed</div>
            </div>
          </div>
          <div className="sc-wc-status">{wcStatus.text}</div>
        </div>

        <div className="sc-card sc-card-overall">
          <div className="sc-card-label">Overall score</div>
          <div className="sc-overall-row">
            <div className="sc-overall-num">{overall}</div>
            <div className="sc-overall-denom">/100</div>
          </div>
          <div className="sc-overall-pct">Better than {Math.round(result.percentile || 50)}% of past essays</div>
          {result.aiDetect && result.aiDetect.available && (
            <div className={'sc-ai-badge sc-ai-' + (result.aiDetect.aiPercent > 60 ? 'high' : result.aiDetect.aiPercent > 30 ? 'med' : 'low')}>
              AI likelihood: {Math.round(result.aiDetect.aiPercent)}%
            </div>
          )}
        </div>
      </section>

      <section className={'sc-verdict sc-verdict-' + (overall >= 80 ? 'good' : overall >= 65 ? 'ok' : overall >= 50 ? 'low' : 'bad')}>
        <h2>{verdict}</h2>
        <p>{verdictDesc}</p>
      </section>

      <div className="sc-actions">
        <button type="button" className="sc-btn-secondary" onClick={onBack}>Back to chat</button>
        <button type="button" className="sc-btn-primary" onClick={() => exportPdf({ result, meta, bars, wcStatus, wc, limit, repeated, verdict, verdictDesc })}>Download PDF</button>
      </div>

      {openMetric && (
        <>
          <div className="sc-backdrop" onClick={() => setOpenMetric(null)} />
          <aside className="sc-drawer" role="dialog" aria-modal="true">
            <div className="sc-drawer-head">
              <h3>{openLabel}</h3>
              <button type="button" className="sc-drawer-close" onClick={() => setOpenMetric(null)} aria-label="Close">×</button>
            </div>
            <div className="sc-drawer-body">
              {openMetric === 'spelling' && <DrawerSpelling result={result} />}
              {openMetric === 'grammar' && <DrawerGrammar result={result} />}
              {openMetric === 'sentence' && <DrawerSentence result={result} />}
              {openMetric === 'i-usage' && <DrawerIUsage result={result} />}
              {openMetric === 'uniqueness' && <DrawerUniqueness result={result} />}
              {openMetric === 'prompt' && <DrawerPrompt result={result} />}
            </div>
          </aside>
        </>
      )}
    </div>
  )
}
