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
  const [question, setQuestion] = useState('')
  const [limit, setLimit] = useState('')
  const [essay, setEssay] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const debounceRef = useRef(null)

  const wordCount = useMemo(() => countWords(essay), [essay])
  const charCount = essay.length

  const limitNum = parseInt(limit, 10)
  const isOver = Number.isFinite(limitNum) && limitNum > 0 && wordCount > limitNum

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

  const canSubmit = essayType && limit && essay.trim()

  function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    emitEvent('essay_submit', {
      action: 'submit',
      targetLabel: essayType,
      extraData: {
        essay_type: essayType,
        college: college.trim(),
        question: question.trim(),
        limit_words: limitNum,
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
            <label className='ef-label' htmlFor='ef-type'>Essay type<span className='ef-req'>*</span></label>
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
                />
              </div>
              <div>
                <label className='ef-label' htmlFor='ef-limit'>Maximum length (words)<span className='ef-req'>*</span></label>
                <input
                  id='ef-limit'
                  className='ef-input'
                  type='number'
                  min='1'
                  placeholder='e.g. 650'
                  value={limit}
                  onChange={e => setLimit(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div className='ef-field'>
            <label className='ef-label' htmlFor='ef-question'>Essay question</label>
            <textarea
              id='ef-question'
              className='ef-textarea ef-textarea-prompt'
              placeholder='Paste the exact question you are answering...'
              value={question}
              onChange={e => setQuestion(e.target.value)}
            />
          </div>

          <div className='ef-field'>
            <label className='ef-label' htmlFor='ef-essay'>Your essay<span className='ef-req'>*</span></label>
            <textarea
              id='ef-essay'
              className='ef-textarea ef-textarea-essay'
              placeholder='Paste your essay here...'
              value={essay}
              onChange={e => setEssay(e.target.value)}
              required
            />
            <div className={'ef-meter' + (isOver ? ' is-over' : '')}>
              <span>Words: <strong>{wordCount.toLocaleString()}</strong>{limitNum ? ` / ${limitNum.toLocaleString()}` : ''}</span>
              <span>Characters: <strong>{charCount.toLocaleString()}</strong></span>
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
