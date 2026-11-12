
import { useEffect, useState } from 'react'
import { CATEGORY_NAMES, categoryInfo } from '../lib/helpers'
import { t, catLabel } from '../lib/i18n'
import { checkDuplicateIssues } from '../lib/api'

export default function ReportForm({ position, onSubmit, onCancel, user }) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState(CATEGORY_NAMES[0])
  const [description, setDescription] = useState('')
  const [reporter, setReporter] = useState(() => user?.user_metadata?.full_name || '')
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState('')
  const [saving, setSaving] = useState(false)

  const [duplicates, setDuplicates] = useState([])
  const [duplicateChecked, setDuplicateChecked] = useState(false)
  const [checkError, setCheckError] = useState('')

  useEffect(() => {
    if (user?.user_metadata?.full_name && !reporter) {
      setReporter(user.user_metadata.full_name)
    }
  }, [user])

  useEffect(() => {
    if (!photo) {
      setPreview('')
      return
    }

    const url = URL.createObjectURL(photo)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])

  // Reset duplicate results whenever report details change.
  function resetDuplicateCheck() {
    setDuplicates([])
    setDuplicateChecked(false)
    setCheckError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!title.trim() || saving) return

    setSaving(true)
    setCheckError('')

    try {
      // Check for possible duplicates before submitting.
      if (!duplicateChecked) {
        const matches = await checkDuplicateIssues(
          { title, category, description },
          position
        )

        setDuplicateChecked(true)

        if (matches.length > 0) {
          setDuplicates(matches)
          setSaving(false)
          return
        }
      }

      // If no duplicates were found, or the user chose to continue,
      // submit the report normally.
      await onSubmit({ title, category, description, reporter, photo })
    } catch (error) {
      console.error('Report submission failed:', error)
      setCheckError(
        'Could not check or submit your report. Please try again.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="report" onSubmit={handleSubmit}>
      <div className="report-head">
        <h2>{t('form_title')}</h2>
        <button type="button" className="icon-btn" onClick={onCancel} aria-label="Close">
          ×
        </button>
      </div>

      <p className="report-loc">
        📍 {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
      </p>

      <p className="report-drag">{t('drag_hint')}</p>

      <label className="label">{t('form_problem')}</label>
      <input
        className="input"
        placeholder={t('form_problemPh')}
        value={title}
        maxLength={80}
        autoFocus
        onChange={(e) => {
          setTitle(e.target.value)
          resetDuplicateCheck()
        }}
      />

      <label className="label">{t('form_category')}</label>
      <div className="chips">
        {CATEGORY_NAMES.map((c) => (
          <button
            type="button"
            key={c}
            className={`chip ${category === c ? 'chip-on' : ''}`}
            onClick={() => {
              setCategory(c)
              resetDuplicateCheck()
            }}
          >
            {categoryInfo(c).emoji} {catLabel(c)}
          </button>
        ))}
      </div>

      <label className="label">{t('form_photo')}</label>

      {preview ? (
        <div className="photo-box">
          <img className="photo-preview" src={preview} alt="" />
          <button type="button" className="photo-remove" onClick={() => setPhoto(null)}>
            {t('form_removePhoto')}
          </button>
        </div>
      ) : (
        <label className="photo-pick">
          {t('form_addPhoto')}
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => setPhoto(e.target.files?.[0] || null)}
          />
        </label>
      )}

      <label className="label">{t('form_details')}</label>
      <textarea
        className="input"
        rows={3}
        placeholder={t('form_detailsPh')}
        value={description}
        onChange={(e) => {
          setDescription(e.target.value)
          resetDuplicateCheck()
        }}
      />

      <label className="label">
        {t('form_name')} {user && (
          <span style={{ color: '#2563eb', fontSize: '12px' }}>
            ✓ Verified Google Account
          </span>
        )}
      </label>

      <input
        className="input"
        placeholder={t('form_namePh')}
        value={reporter}
        onChange={(e) => setReporter(e.target.value)}
      />

      {/* Possible duplicate warning */}
      {duplicates.length > 0 && (
        <div
          style={{
            marginTop: '16px',
            padding: '14px',
            border: '1px solid #f59e0b',
            borderRadius: '12px',
            background: '#fffbeb',
            color: '#78350f',
          }}
        >
          <h3 style={{ marginTop: 0 }}>
            ⚠️ Possible existing report
          </h3>

          <p>
            We found reports near this location that might describe
            the same problem. Please check before submitting.
          </p>

          {duplicates.map((issue) => (
            <div
              key={issue.id}
              style={{
                padding: '10px',
                marginTop: '8px',
                background: '#ffffff',
                borderRadius: '8px',
              }}
            >
              <strong>{issue.title}</strong>

              <p style={{ margin: '5px 0', fontSize: '13px' }}>
                {issue.description || 'No additional description'}
              </p>

              <small>
                📍 Approximately {issue.distance} metres away
              </small>
            </div>
          ))}

          <p style={{ fontSize: '13px' }}>
            If this is a different problem, you can still submit your report.
          </p>
        </div>
      )}

      {checkError && (
        <p style={{ color: '#dc2626', fontSize: '13px' }}>
          {checkError}
        </p>
      )}

      <div className="report-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          {t('form_cancel')}
        </button>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={saving || !title.trim()}
        >
          {saving
            ? 'Checking...'
            : duplicates.length > 0
              ? 'Submit anyway'
              : t('form_submit')}
        </button>
      </div>
    </form>
  )
}
