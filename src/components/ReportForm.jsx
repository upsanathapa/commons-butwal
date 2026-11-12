import { useEffect, useState } from 'react'
import { CATEGORY_NAMES, categoryInfo } from '../lib/helpers'
import { t, catLabel } from '../lib/i18n'

export default function ReportForm({ position, onSubmit, onCancel, user }) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState(CATEGORY_NAMES[0])
  const [description, setDescription] = useState('')
  const [reporter, setReporter] = useState(() => user?.user_metadata?.full_name || '')
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState('')
  const [saving, setSaving] = useState(false)

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

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim() || saving) return
    setSaving(true)
    await onSubmit({ title, category, description, reporter, photo })
    setSaving(false)
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
        onChange={(e) => setTitle(e.target.value)}
      />

      <label className="label">{t('form_category')}</label>
      <div className="chips">
        {CATEGORY_NAMES.map((c) => (
          <button
            type="button"
            key={c}
            className={`chip ${category === c ? 'chip-on' : ''}`}
            onClick={() => setCategory(c)}
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
        onChange={(e) => setDescription(e.target.value)}
      />

      <label className="label">
        {t('form_name')} {user && <span style={{ color: '#2563eb', fontSize: '12px' }}>✓ Verified Google Account</span>}
      </label>
      <input
        className="input"
        placeholder={t('form_namePh')}
        value={reporter}
        onChange={(e) => setReporter(e.target.value)}
      />

      <div className="report-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          {t('form_cancel')}
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving || !title.trim()}>
          {saving ? t('form_saving') : t('form_submit')}
        </button>
      </div>
    </form>
  )
}