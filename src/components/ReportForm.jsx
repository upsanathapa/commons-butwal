import { useEffect, useState } from 'react'
import { CATEGORY_NAMES, categoryInfo } from '../lib/helpers'

export default function ReportForm({ position, onSubmit, onCancel }) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState(CATEGORY_NAMES[0])
  const [description, setDescription] = useState('')
  const [reporter, setReporter] = useState('')
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState('')
  const [saving, setSaving] = useState(false)

  // Make a temporary preview of the chosen photo, and clean it up afterwards
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
        <h2>Report a problem</h2>
        <button type="button" className="icon-btn" onClick={onCancel} aria-label="Close">
          ×
        </button>
      </div>
      <p className="report-loc">
        📍 {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
      </p>

      <label className="label">What is the problem?</label>
      <input
        className="input"
        placeholder="e.g. Streetlight not working near the temple"
        value={title}
        maxLength={80}
        autoFocus
        onChange={(e) => setTitle(e.target.value)}
      />

      <label className="label">Category</label>
      <div className="chips">
        {CATEGORY_NAMES.map((c) => (
          <button
            type="button"
            key={c}
            className={`chip ${category === c ? 'chip-on' : ''}`}
            onClick={() => setCategory(c)}
          >
            {categoryInfo(c).emoji} {c}
          </button>
        ))}
      </div>

      <label className="label">Photo (optional)</label>
      {preview ? (
        <div className="photo-box">
          <img className="photo-preview" src={preview} alt="Chosen photo" />
          <button type="button" className="photo-remove" onClick={() => setPhoto(null)}>
            Remove photo
          </button>
        </div>
      ) : (
        <label className="photo-pick">
          📷 Add a photo
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => setPhoto(e.target.files?.[0] || null)}
          />
        </label>
      )}

      <label className="label">Details (optional)</label>
      <textarea
        className="input"
        rows={3}
        placeholder="What is wrong, and why does it matter?"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <label className="label">Your name (optional)</label>
      <input
        className="input"
        placeholder="Leave empty to stay anonymous"
        value={reporter}
        onChange={(e) => setReporter(e.target.value)}
      />

      <div className="report-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving || !title.trim()}>
          {saving ? 'Saving…' : 'Submit report'}
        </button>
      </div>
    </form>
  )
}