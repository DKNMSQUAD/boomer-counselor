import { useState, useRef, useEffect, useCallback } from 'react'
import { jsPDF } from 'jspdf'

/* ========================================================
   Scorecard view of the essay feedback report.
   Each metric is shown as a Low / Med / High bar with a
   black marker where this essay falls. Click any bar to
   open a right-side details drawer.
   ======================================================== */

// Convert raw value to a 0-100 position on a Low|Med|High bar.
// We want LOW = bad, HIGH = good for ALL bars (so a higher position is better).
function spellingPosition(perHundred) {
  // 0 errors per 100 = 100%, 5+ = 0%
  if (perHundred <= 0) return 100
  if (perHundred >= 5) return 0
  return Math.round(100 - perHundred * 20)
}

function grammarPosition(perHundred) {
  // 0 errors per 100 = 100%, 8+ = 0%
  if (perHundred <= 0) return 100
  if (perHundred >= 8) return 0
  return Math.round(100 - perHundred * 12.5)
}

function sentenceLengthPosition(mean) {
  // 17.2 is ideal. Distance from 17.2 maps to a position.
  const dev = Math.abs(mean - 17.2)
  if (dev >= 12) return 0
  if (dev <= 1) return 100
  return Math.round(100 - (dev / 12) * 100)
}

function iUsagePosition(perHundred) {
  // 2.25 is database average. 0-3 per 100 = HIGH, 3-5 = MED, 5+ = LOW.
  if (perHundred <= 2.25) return 100
  if (perHundred >= 8) return 0
  return Math.round(100 - ((perHundred - 2.25) / 5.75) * 100)
}

function uniquenessPosition(similarityPct) {
  return Math.max(0, Math.min(100, 100 - similarityPct))
}

function promptFitPosition(score) {
  return Math.max(0, Math.min(100, score))
}

function wordCountPosition(words, limit) {
  if (!limit) return 50
  const ratio = words / limit
  if (ratio < 0.25) return 10
  if (ratio < 0.5) return 40
  if (ratio <= 1.0) return 95
  if (ratio <= 1.05) return 65
  if (ratio <= 1.15) return 30
  return 5
}

function bandFromPosition(pos) {
  if (pos < 33) return 'Low'
  if (pos < 67) return 'Med'
  return 'High'
}

function bandLabelForMetric(metricKey, pos, extra) {
  const band = bandFromPosition(pos)
  switch (metricKey) {
    case 'spelling':
    case 'grammar':
      return band === 'High' ? 'Good' : band === 'Med' ? 'Average' : 'Poor'
    case 'sentenceLength': {
      const m = extra.mean
      if (Math.abs(m - 17.2) <= 1) return 'Like most people'
      return m > 17.2 ? 'Longer than others' : 'Shorter than others'
    }
    case 'iUsage': {
      const p = extra.perHundred
      if (Math.abs(p - 2.25) <= 1) return 'Like most people'
      return p > 2.25 ? 'More than others' : 'Less than others'
    }
    case 'uniqueness': {
      if (pos >= 80) return 'More unique'
      if (pos >= 40) return 'Like most essays'
      return 'Less unique'
    }
    case 'promptFit':
      return band === 'High' ? 'Strong fit' : band === 'Med' ? 'Partial fit' : 'Weak fit'
    case 'wordCount': {
      const w = extra.words, l = extra.limit
      if (!l) return `${w} words`
      if (w > l) return `${w} / ${l} (over)`
      return `${w} / ${l}`
    }
    default:
      return band
  }
}

export function buildScorecard(result, meta) {
  const { details } = result
  const totalWords = meta.wordCount || 1

  const spellCount = details.spelling.count
  const spellPer100 = (spellCount / totalWords) * 100
  const grammarCount = (details.mechanics.grammarIssues || []).length
  const grammarPer100 = (grammarCount / totalWords) * 100
  const sentMean = details.sentenceStats.mean
  const iPer100 = details.repetition.iPer100
  const topSim = (details.similarity && details.similarity.matches && details.similarity.matches.length > 0)
    ? details.similarity.matches[0].similarity : 0
  const promptFitScore = (result.insights && result.insights.available && typeof result.insights.promptFitScore === 'number')
    ? result.insights.promptFitScore : null
  const limit = meta.limit ? parseInt(meta.limit, 10) : null

  const mostRepeated = (details.repetition.overused || []).slice(0, 5)

  const bars = [
    {
      key: 'spelling',
      label: 'Spelling',
      position: spellingPosition(spellPer100),
      band: null,
      raw: { count: spellCount, perHundred: Math.round(spellPer100 * 10) / 10, items: details.spelling.items || [] },
    },
    {
      key: 'grammar',
      label: 'Grammatical mistakes',
      position: grammarPosition(grammarPer100),
      band: null,
      raw: { count: grammarCount, perHundred: Math.round(grammarPer100 * 10) / 10, items: details.mechanics.grammarIssues || [] },
    },
    {
      key: 'sentenceLength',
      label: 'Sentence length',
      position: sentenceLengthPosition(sentMean),
      band: null,
      raw: { mean: sentMean, baseline: 17.2, pctOver25: details.sentenceStats.pctOver25, problematic: details.mechanics.problematic || [] },
    },
    {
      key: 'iUsage',
      label: '"I" usage',
      position: iUsagePosition(iPer100),
      band: null,
      raw: { perHundred: iPer100, baseline: 2.25, totalI: details.repetition.totalIUsage || 0 },
    },
    {
      key: 'uniqueness',
      label: 'Uniqueness',
      position: uniquenessPosition(topSim),
      band: null,
      raw: { topSim, totalCompared: details.similarity.totalCompared || 6804, matches: details.similarity.matches || [] },
    },
  ]

  if (promptFitScore !== null) {
    bars.push({
      key: 'promptFit',
      label: 'Does it answer the prompt',
      position: promptFitPosition(promptFitScore),
      band: null,
      raw: {
        score: promptFitScore,
        reasoning: result.insights.promptFitReasoning || '',
        missed: result.insights.missed || '',
        topics: result.insights.topics || [],
      },
    })
  }

  bars.push({
    key: 'wordCount',
    label: 'Word count',
    position: wordCountPosition(totalWords, limit),
    band: null,
    raw: { words: totalWords, limit, isOver: limit ? totalWords > limit : false },
  })

  for (const b of bars) {
    b.band = bandLabelForMetric(b.key, b.position, b.raw)
  }

  return {
    bars,
    mostRepeated,
    overall: result.overall,
    percentile: result.percentile,
    aiDetect: result.aiDetect,
  }
}

function ScoreBar({ label, position, band, onClick }) {
  const markerLeft = Math.max(2, Math.min(98, position))
  return (
    <button className="sc-bar-row" onClick={onClick} aria-label={`${label}: ${band}. Click for details.`}>
      <div className="sc-bar-label">{label}</div>
      <div className="sc-bar-track">
        <div className="sc-bar-zone sc-zone-low">Low</div>
        <div className="sc-bar-zone sc-zone-med">Med</div>
        <div className="sc-bar-zone sc-zone-high">High</div>
        <div className="sc-bar-marker" style={{ left: `${markerLeft}%` }} aria-hidden="true" />
      </div>
      <div className="sc-bar-band">{band}</div>
    </button>
  )
}

function DrawerSpelling({ raw }) {
  if (raw.count === 0) return <p className="sc-drawer-good">No spelling errors detected.</p>
  return (
    <>
      <p className="sc-drawer-stat">{raw.count} spelling {raw.count === 1 ? 'error' : 'errors'} ({raw.perHundred} per 100 words)</p>
      <ul className="sc-drawer-list">
        {raw.items.slice(0, 12).map((it, i) => (
          <li key={i}>
            <span className="sc-wrong">"{it.word}"</span>
            {it.suggestion ? <> {'\u2192'} <span className="sc-right">"{it.suggestion}"</span></> : null}
            {it.sentence && <div className="sc-context">{it.sentence}</div>}
          </li>
        ))}
        {raw.items.length > 12 && <li className="sc-more">{raw.items.length - 12} more</li>}
      </ul>
    </>
  )
}

function DrawerGrammar({ raw }) {
  if (raw.count === 0) return <p className="sc-drawer-good">No grammar issues detected.</p>
  return (
    <>
      <p className="sc-drawer-stat">{raw.count} grammar {raw.count === 1 ? 'issue' : 'issues'} ({raw.perHundred} per 100 words)</p>
      <ul className="sc-drawer-list">
        {raw.items.slice(0, 12).map((it, i) => (
          <li key={i}>
            <span className="sc-issue-type">{it.type || 'Grammar'}:</span>{' '}
            {it.bad ? (
              <>
                <span className="sc-wrong">"{it.bad}"</span>
                {it.suggestion ? <> {'\u2192'} <span className="sc-right">"{it.suggestion}"</span></> : null}
              </>
            ) : (
              <>"{it.text}"</>
            )}
            {it.sentence && <div className="sc-context">{it.sentence}</div>}
          </li>
        ))}
      </ul>
    </>
  )
}

function DrawerSentenceLength({ raw }) {
  return (
    <>
      <p className="sc-drawer-stat">Your average: <strong>{raw.mean} words</strong> per sentence</p>
      <p className="sc-drawer-stat">Database average: {raw.baseline} words</p>
      {raw.pctOver25 > 0 && <p className="sc-drawer-stat">{raw.pctOver25}% of your sentences are over 25 words</p>}
      {raw.problematic && raw.problematic.length > 0 && (
        <>
          <p className="sc-drawer-section-title">Long sentences to fix:</p>
          <ul className="sc-drawer-list">
            {raw.problematic.slice(0, 4).map((p, i) => (
              <li key={i}>
                <em>"{p.text || p}"</em>
                {p.length && <div className="sc-meta">Too long ({p.length} words)</div>}
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}

function DrawerIUsage({ raw }) {
  return (
    <>
      <p className="sc-drawer-stat">Your "I" usage: <strong>{raw.perHundred}</strong> per 100 words</p>
      <p className="sc-drawer-stat">Database average: {raw.baseline} per 100 words</p>
      <p className="sc-drawer-tip">
        {raw.perHundred > raw.baseline + 2
          ? 'You\u2019re leaning heavy on "I". Try starting sentences with actions, observations, or other people.'
          : raw.perHundred < raw.baseline - 1
          ? 'You barely use "I". For a personal essay, more first-person voice usually feels more authentic.'
          : 'Your "I" usage is balanced for a personal essay.'}
      </p>
    </>
  )
}

function DrawerUniqueness({ raw }) {
  if (raw.topSim >= 70) {
    return (
      <div className="sc-critical">
        <div className="sc-critical-headline">Possible plagiarism / direct copy</div>
        <p className="sc-critical-body">
          This essay is {raw.topSim}% identical to a previously submitted essay in our database of {raw.totalCompared.toLocaleString()} essays.
          Submitting copied work to a college is a serious integrity violation.
        </p>
      </div>
    )
  }
  return (
    <>
      <p className="sc-drawer-stat">Compared against <strong>{raw.totalCompared.toLocaleString()}</strong> past essays.</p>
      <p className="sc-drawer-stat">Top similarity: <strong>{raw.topSim}%</strong></p>
      <p className="sc-drawer-tip">
        {raw.topSim < 20
          ? 'Your essay reads as original. Specific personal details and unique vocabulary are working in your favor.'
          : raw.topSim < 50
          ? 'Some overlap with common essay patterns. Add more details that are uniquely yours.'
          : 'Significant overlap with existing essays. Reframe the story with specifics no one else could write.'}
      </p>
    </>
  )
}

function DrawerPromptFit({ raw }) {
  return (
    <>
      <p className="sc-drawer-stat">Prompt fit score: <strong>{raw.score}/100</strong></p>
      {raw.reasoning && <p className="sc-drawer-tip"><em>{raw.reasoning}</em></p>}
      {raw.missed && (
        <>
          <p className="sc-drawer-section-title">Not addressed:</p>
          <p className="sc-drawer-tip">{raw.missed}</p>
        </>
      )}
      {raw.topics && raw.topics.length > 0 && (
        <>
          <p className="sc-drawer-section-title">Your essay is about:</p>
          <div className="sc-topic-pills">
            {raw.topics.map((t, i) => <span key={i} className="sc-topic-pill">{t}</span>)}
          </div>
        </>
      )}
    </>
  )
}

function DrawerWordCount({ raw }) {
  if (!raw.limit) {
    return <p className="sc-drawer-stat">{raw.words} words. No limit was set.</p>
  }
  return (
    <>
      <div className="sc-wc-grid">
        <div className="sc-wc-cell">
          <div className="sc-wc-num sc-wc-good">{raw.limit}</div>
          <div className="sc-wc-lbl">Allowed</div>
        </div>
        <div className="sc-wc-cell">
          <div className={'sc-wc-num ' + (raw.isOver ? 'sc-wc-bad' : 'sc-wc-good')}>{raw.words}</div>
          <div className="sc-wc-lbl">Yours</div>
        </div>
      </div>
      <p className="sc-drawer-tip">
        {raw.isOver
          ? `You're ${raw.words - raw.limit} words over the limit. Tighten or cut.`
          : raw.words < raw.limit * 0.8
          ? `You have ${raw.limit - raw.words} words of headroom.`
          : 'You\u2019re comfortably within the limit.'}
      </p>
    </>
  )
}

const DRAWER_COMPONENTS = {
  spelling: DrawerSpelling,
  grammar: DrawerGrammar,
  sentenceLength: DrawerSentenceLength,
  iUsage: DrawerIUsage,
  uniqueness: DrawerUniqueness,
  promptFit: DrawerPromptFit,
  wordCount: DrawerWordCount,
}

function Drawer({ activeBar, onClose }) {
  useEffect(() => {
    if (!activeBar) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeBar, onClose])

  if (!activeBar) return null
  const Body = DRAWER_COMPONENTS[activeBar.key]
  return (
    <aside className="sc-drawer" role="dialog" aria-label={`${activeBar.label} details`}>
      <div className="sc-drawer-hdr">
        <div className="sc-drawer-title">{activeBar.label}</div>
        <button className="sc-drawer-close" onClick={onClose} aria-label="Close details">{'\u2715'}</button>
      </div>
      <div className="sc-drawer-band-row">
        <span className={'sc-drawer-band-pill ' + (activeBar.position >= 67 ? 'sc-pill-high' : activeBar.position >= 33 ? 'sc-pill-med' : 'sc-pill-low')}>
          {activeBar.band}
        </span>
      </div>
      <div className="sc-drawer-body">
        {Body ? <Body raw={activeBar.raw} /> : <p>No details available.</p>}
      </div>
    </aside>
  )
}

export default function Scorecard({ result, meta, onBack }) {
  const [activeBar, setActiveBar] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const sc = buildScorecard(result, meta)

  const passed = result.overall >= 75

  const handleDownload = useCallback(async () => {
    if (downloading) return
    setDownloading(true)
    try {
      await generateTwoPagePdf(sc, meta)
    } catch (err) {
      console.error('PDF failed:', err)
      alert('PDF generation failed. Please try again.')
    } finally {
      setDownloading(false)
    }
  }, [sc, meta, downloading])

  return (
    <div className={'sc-shell ' + (activeBar ? 'sc-shell-drawer-open' : '')}>
      <div className="sc-main">
        <div className="sc-hdr">
          <div className="sc-hdr-l">
            <h2 className="sc-hdr-title">Essay feedback</h2>
            <div className="sc-hdr-sub">Boomer Counselor</div>
          </div>
          <div className="sc-hdr-r">
            {meta.college && <div className="sc-hdr-meta">{meta.college}</div>}
            <div className="sc-hdr-meta">{meta.essayType}</div>
            <div className="sc-hdr-meta">{meta.wordCount} words</div>
            <div className="sc-hdr-meta">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
          </div>
        </div>

        <div className="sc-bars">
          {sc.bars.map((b) => (
            <ScoreBar
              key={b.key}
              label={b.label}
              position={b.position}
              band={b.band}
              onClick={() => setActiveBar(b)}
            />
          ))}
        </div>

        <div className="sc-grid-row">
          <div className="sc-card sc-most-repeated">
            <div className="sc-card-title">Most repeated words</div>
            {sc.mostRepeated.length === 0 ? (
              <p className="sc-card-empty">Good variety.</p>
            ) : (
              <ol className="sc-mr-list">
                {sc.mostRepeated.map((w, i) => (
                  <li key={i}>
                    <span className="sc-mr-word">"{w.word}"</span>
                    <span className="sc-mr-count">{w.count}x</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="sc-card sc-overall">
            <div className="sc-card-title">Overall score</div>
            <div className="sc-overall-num">{result.overall}<span className="sc-overall-of">/100</span></div>
            <div className="sc-overall-percentile">Better than {result.percentile}% of past essays</div>
            {sc.aiDetect && sc.aiDetect.available && (
              <div className={'sc-aimini ' + (sc.aiDetect.aiPercent >= 50 ? 'sc-aimini-warn' : 'sc-aimini-ok')}>
                AI likelihood: <strong>{sc.aiDetect.aiPercent}%</strong>
              </div>
            )}
          </div>
        </div>

        <div className={'sc-conclusion ' + (passed ? 'sc-conclusion-pass' : 'sc-conclusion-rewrite')}>
          <div className="sc-conclusion-icon">{passed ? '\u2713' : '\u270E'}</div>
          <div className="sc-conclusion-text">
            <div className="sc-conclusion-title">
              {passed ? 'Looks ready' : 'Go back and rewrite'}
            </div>
            <div className="sc-conclusion-body">
              {passed
                ? 'This essay is in good shape. Show it to your counselor for a final pass.'
                : 'Use the feedback above to revise, then come back to re-analyze.'}
            </div>
          </div>
        </div>

        <div className="sc-actions">
          <button className="sc-btn sc-btn-primary" onClick={handleDownload} disabled={downloading}>
            {downloading ? 'Generating PDF...' : 'Download report (PDF)'}
          </button>
          <button className="sc-btn sc-btn-secondary" onClick={onBack}>Analyze another essay</button>
        </div>
      </div>

      <Drawer activeBar={activeBar} onClose={() => setActiveBar(null)} />
    </div>
  )
}

async function generateTwoPagePdf(sc, meta) {
  const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' })
  const W = pdf.internal.pageSize.getWidth()
  const H = pdf.internal.pageSize.getHeight()
  const M = 40

  // PAGE 1: SCORECARD
  pdf.setFillColor(26, 26, 26)
  pdf.rect(0, 0, W, 70, 'F')
  pdf.setTextColor(245, 240, 220)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(20)
  pdf.text('Essay feedback report', M, 38)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(200, 195, 175)
  pdf.text('Boomer Counselor', M, 56)
  pdf.setFontSize(9)
  const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  let metaY = 30
  if (meta.college) { pdf.text(meta.college, W - M, metaY, { align: 'right' }); metaY += 12 }
  pdf.text(meta.essayType || '', W - M, metaY, { align: 'right' }); metaY += 12
  pdf.text(`${meta.wordCount || 0} words / ${dateStr}`, W - M, metaY, { align: 'right' })

  pdf.setTextColor(40, 40, 40)
  let y = 100
  for (const b of sc.bars) {
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(11)
    pdf.text(b.label, M, y)
    drawBar(pdf, M + 130, y - 10, W - M * 2 - 130 - 90, 14, b.position)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.setTextColor(80, 80, 80)
    pdf.text(b.band, W - M - 85, y, { maxWidth: 80 })
    pdf.setTextColor(40, 40, 40)
    y += 30
  }

  y += 10
  const colW = (W - M * 2 - 20) / 2

  pdf.setFillColor(250, 247, 242)
  pdf.roundedRect(M, y, colW, 130, 6, 6, 'F')
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11)
  pdf.text('Most repeated words', M + 14, y + 22)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  if (sc.mostRepeated.length === 0) {
    pdf.setTextColor(60, 110, 60)
    pdf.text('Good variety.', M + 14, y + 44)
    pdf.setTextColor(40, 40, 40)
  } else {
    sc.mostRepeated.forEach((w, i) => {
      pdf.text(`${i + 1}. "${w.word}"`, M + 14, y + 44 + i * 16)
      pdf.setTextColor(120, 110, 90)
      pdf.text(`${w.count}x`, M + colW - 24, y + 44 + i * 16, { align: 'right' })
      pdf.setTextColor(40, 40, 40)
    })
  }

  const rightX = M + colW + 20
  pdf.setFillColor(255, 250, 232)
  pdf.roundedRect(rightX, y, colW, 130, 6, 6, 'F')
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11)
  pdf.text('Overall score', rightX + 14, y + 22)
  pdf.setFontSize(34)
  pdf.text(`${sc.overall}`, rightX + colW / 2, y + 70, { align: 'center' })
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.text('/ 100', rightX + colW / 2 + 30, y + 70)
  pdf.setFontSize(9)
  pdf.setTextColor(110, 100, 80)
  pdf.text(`Better than ${sc.percentile}% of past essays`, rightX + colW / 2, y + 92, { align: 'center' })
  pdf.setTextColor(40, 40, 40)
  if (sc.aiDetect && sc.aiDetect.available) {
    pdf.setFontSize(9)
    const isWarn = sc.aiDetect.aiPercent >= 50
    pdf.setTextColor(isWarn ? 139 : 26, isWarn ? 30 : 110, isWarn ? 20 : 58)
    pdf.text(`AI likelihood: ${sc.aiDetect.aiPercent}%`, rightX + colW / 2, y + 112, { align: 'center' })
    pdf.setTextColor(40, 40, 40)
  }
  y += 145

  const passed = sc.overall >= 75
  pdf.setFillColor(passed ? 232 : 253, passed ? 245 : 236, passed ? 233 : 234)
  pdf.setDrawColor(passed ? 100 : 192, passed ? 165 : 57, passed ? 100 : 43)
  pdf.roundedRect(M, y, W - M * 2, 60, 6, 6, 'FD')
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(12)
  pdf.setTextColor(passed ? 26 : 139, passed ? 110 : 30, passed ? 58 : 20)
  pdf.text(passed ? 'Looks ready' : 'Go back and rewrite', M + 14, y + 24)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.setTextColor(60, 60, 60)
  pdf.text(
    passed ? 'This essay is in good shape. Show it to your counselor for a final pass.' : 'Use the feedback on page 2 to revise, then re-analyze.',
    M + 14, y + 42, { maxWidth: W - M * 2 - 28 }
  )

  pdf.setFontSize(8)
  pdf.setTextColor(160, 150, 130)
  pdf.text('Page 1 of 2  \u00b7  Detailed breakdown on next page', W / 2, H - 20, { align: 'center' })

  // PAGE 2: DETAILS
  pdf.addPage()
  pdf.setTextColor(40, 40, 40)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(16)
  pdf.text('Detailed breakdown', M, 50)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(120, 120, 120)
  pdf.text('Detailed feedback for each metric on the scorecard.', M, 66)
  pdf.setTextColor(40, 40, 40)

  y = 90
  for (const b of sc.bars) {
    if (y > H - 80) { pdf.addPage(); y = 50 }
    pdf.setFillColor(245, 240, 230)
    pdf.rect(M, y - 12, W - M * 2, 22, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(11)
    pdf.text(b.label, M + 8, y + 3)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.setTextColor(110, 100, 80)
    pdf.text(b.band, W - M - 8, y + 3, { align: 'right' })
    pdf.setTextColor(40, 40, 40)
    y += 24
    y = drawDetail(pdf, b, y, M, W)
    y += 10
  }

  const safe = (meta.college || 'essay').replace(/\s+/g, '-').toLowerCase()
  pdf.save(`essay-report-${safe}-${new Date().toISOString().slice(0, 10)}.pdf`)
}

function drawBar(pdf, x, y, w, h, position) {
  const z = w / 3
  pdf.setFillColor(74, 144, 226); pdf.rect(x, y, z, h, 'F')
  pdf.setFillColor(245, 166, 35); pdf.rect(x + z, y, z, h, 'F')
  pdf.setFillColor(123, 178, 90); pdf.rect(x + z * 2, y, z, h, 'F')
  const mx = x + (position / 100) * w
  pdf.setFillColor(20, 20, 20)
  pdf.rect(mx - 1.5, y - 3, 3, h + 6, 'F')
}

function drawDetail(pdf, b, y, M, W) {
  const lineH = 13
  const wrap = (txt, x, yy, max) => {
    const lines = pdf.splitTextToSize(txt, max || (W - M * 2 - 16))
    pdf.text(lines, x, yy)
    return yy + lines.length * lineH
  }
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  const x = M + 8
  const max = W - M * 2 - 16
  switch (b.key) {
    case 'spelling':
      if (b.raw.count === 0) { y = wrap('No spelling errors detected.', x, y, max); break }
      y = wrap(`${b.raw.count} ${b.raw.count === 1 ? 'error' : 'errors'} (${b.raw.perHundred} per 100 words).`, x, y, max)
      for (const it of b.raw.items.slice(0, 8)) {
        y = wrap(`  \u2022 "${it.word}"${it.suggestion ? ' \u2192 "' + it.suggestion + '"' : ''}`, x, y, max)
      }
      if (b.raw.items.length > 8) y = wrap(`  \u2022 +${b.raw.items.length - 8} more`, x, y, max)
      break
    case 'grammar':
      if (b.raw.count === 0) { y = wrap('No grammar issues detected.', x, y, max); break }
      y = wrap(`${b.raw.count} ${b.raw.count === 1 ? 'issue' : 'issues'} (${b.raw.perHundred} per 100 words).`, x, y, max)
      for (const it of b.raw.items.slice(0, 6)) {
        const txt = it.bad ? `"${it.bad}"${it.suggestion ? ' \u2192 "' + it.suggestion + '"' : ''}` : `"${it.text || ''}"`
        y = wrap(`  \u2022 ${it.type || 'Grammar'}: ${txt}`, x, y, max)
      }
      break
    case 'sentenceLength':
      y = wrap(`Your average: ${b.raw.mean} words per sentence (database average: ${b.raw.baseline}).`, x, y, max)
      if (b.raw.pctOver25 > 0) y = wrap(`${b.raw.pctOver25}% of your sentences are over 25 words.`, x, y, max)
      if (b.raw.problematic && b.raw.problematic.length) {
        y = wrap('Long sentences to fix:', x, y, max)
        for (const p of b.raw.problematic.slice(0, 3)) {
          const t = p.text || p
          y = wrap(`  \u2022 "${t.length > 120 ? t.slice(0, 120) + '\u2026' : t}"`, x, y, max)
        }
      }
      break
    case 'iUsage':
      y = wrap(`Your "I" usage: ${b.raw.perHundred} per 100 words. Database average: ${b.raw.baseline}.`, x, y, max)
      break
    case 'uniqueness':
      y = wrap(`Top similarity vs ${b.raw.totalCompared.toLocaleString()} past essays: ${b.raw.topSim}%.`, x, y, max)
      if (b.raw.topSim >= 70) y = wrap('CRITICAL: Possible plagiarism. Do not submit this essay.', x, y, max)
      break
    case 'promptFit':
      y = wrap(`Score: ${b.raw.score}/100`, x, y, max)
      if (b.raw.reasoning) y = wrap(b.raw.reasoning, x, y, max)
      if (b.raw.missed) y = wrap(`Not addressed: ${b.raw.missed}`, x, y, max)
      if (b.raw.topics && b.raw.topics.length) y = wrap(`Topics in your essay: ${b.raw.topics.join(', ')}`, x, y, max)
      break
    case 'wordCount':
      if (b.raw.limit) y = wrap(`${b.raw.words} words (allowed: ${b.raw.limit}).${b.raw.isOver ? ' OVER LIMIT.' : ''}`, x, y, max)
      else y = wrap(`${b.raw.words} words. No limit set.`, x, y, max)
      break
  }
  return y
}
