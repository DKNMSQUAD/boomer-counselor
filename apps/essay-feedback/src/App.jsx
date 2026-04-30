import { useState, useMemo, useEffect, useRef } from 'react'
import { emitEvent } from './bcEvents'
import './index.css'

const ESSAY_TYPES = [
  'CommonApp (main essay)',
  'UCAS Personal Statement',
  'Why This College Essay',
  'Why This Major Essay',
  'Personal Essay',
]

function countWords(text) {
  const t = text.trim()
  if (!t) return 0
  return t.split(/\s+/).length
}

export default function App() {
  const [essayType, setEssayType] = useState('')
  const [college, setCollege] = useState('')
  const [prompt, setPrompt] = useState('')
  const [limit, setLimit] = useState('')
  const [unit, setUnit] = useState('words')
  const [essay, setEssay] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const debounceRef = useRef(null)

  const wordCount = useMemo(() => countWords(essay), [essay])
  const charCount = essay.length

  const limitNum = parseInt(limit, 10)
  const currentForLimit = unit === 'words' ? wordCount : charCount
  const isOver = Number.isFinite(limitNum) && limitNum > 0 && currentForLimit > limitNum

  useEffect(() => {
    if (!essay) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      emitEvent('essay_typing', {
        action: 'paste',
        extraData: {
          word_count: wordCount,
          char_count: charCount,
          essay_type: essayType,
        },
      })
    }, 1500)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [essay, wordCount, charCount, essayType])

  const canSubmit = essayType && college.trim() && prompt.trim() && essay.trim() && limit

  function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    emitEvent('essay_submit', {
      action: 'submit',
      targetLabel: essayType,
      extraData: {
        essay_type: essayType,
        college: college.trim(),
        prompt: prompt.trim(),
        limit: limitNum,
        unit,
        word_count: wordCount,
        char_count: charCount,
        over_limit: isOver,
      },
    })
    setSubmitted(true)
  }

  return (
    <div className='ef-shell'>
      <header className='bc-masthead'>
        <div className='bc-masthead-inner'>
          <img className='bc-masthead-logo' src={import.meta.env.BASE_URL + 'logo.png'} alt='Boomer Counselor' />
          <div className='bc-masthead-titles'>
            <h1 className='bc-masthead-title'>Essay Feedback</h1>
            <div className='bc-masthead-tagline'>Polish your draft.</div>
          </div>
        </div>
      </header>

      <main className='ef-page'>
        <form onSubmit={handleSubmit}>
          <div className='ef-field'>
            <label className='ef-label' htmlFor='ef-type'>Essay type</label>
            <select
              id='ef-type'
              className='ef-select'
              value={essayType}
              onChange={e => setEssayType(e.target.value)}
              required
            >
              <option value=''>Select essay type...</option>
              {ESSAY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className='ef-field'>
            <div className='ef-row'>
              <div>
                <label className='ef-label' htmlFor='ef-college'>College / University</label>
                <input
                  id='ef-college'
                  className='ef-input'
                  type='text'
                  placeholder='e.g. Stanford University'
                  value={college}
                  onChange={e => setCollege(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className='ef-label'>Maximum length</label>
                <div className='ef-row-limit'>
                  <input
                    className='ef-input'
                    type='number'
                    min='1'
                    placeholder='e.g. 650'
                    value={limit}
                    onChange={e => setLimit(e.target.value)}
                    required
                  />
                  <select
                    className='ef-select'
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                  >
                    <option value='words'>Words</option>
                    <option value='characters'>Characters</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className='ef-field'>
            <label className='ef-label' htmlFor='ef-prompt'>Essay prompt</label>
            <textarea
              id='ef-prompt'
              className='ef-textarea ef-textarea-prompt'
              placeholder='Paste the exact prompt you are answering...'
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              required
            />
          </div>

          <div className='ef-field'>
            <label className='ef-label' htmlFor='ef-essay'>Your essay</label>
            <textarea
              id='ef-essay'
              className='ef-textarea ef-textarea-essay'
              placeholder='Paste your essay here...'
              value={essay}
              onChange={e => setEssay(e.target.value)}
              required
            />
            <div className={'ef-meter' + (isOver ? ' is-over' : '')}>
              <span>Words: <strong>{wordCount.toLocaleString()}</strong>{unit === 'words' && limitNum ? ` / ${limitNum.toLocaleString()}` : ''}</span>
              <span>Characters: <strong>{charCount.toLocaleString()}</strong>{unit === 'characters' && limitNum ? ` / ${limitNum.toLocaleString()}` : ''}</span>
              {isOver && <span>Over limit</span>}
            </div>
          </div>

          <button type='submit' className='ef-submit' disabled={!canSubmit}>
            Submit for feedback
          </button>

          {submitted && (
            <div className='ef-toast'>
              Got it. We have logged your essay and will share feedback shortly.
            </div>
          )}
        </form>
      </main>
    </div>
  )
}
