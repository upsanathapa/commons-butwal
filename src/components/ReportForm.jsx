import { useState } from 'react'

const CATEGORIES = ['Streetlight', 'Garbage', 'Pothole / Road', 'Drainage', 'Water', 'Other']

export default function ReportForm({ position, onSubmit, onCancel }) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [description, setDescription] = useState('')
  const [reporter, setReporter] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return
    onSubmit({ title, category, description, reporter })
  }

  const box = {
    position: 'fixed', top: 16, right: 16, zIndex: 2000, width: 300,
    background: 'white', color: '#111', padding: 16, borderRadius: 12,
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)', fontFamily: 'sans-serif',
  }
  const field = { width: '100%', padding: 8, marginBottom: 10, boxSizing: 'border-box' }

  return (
    <form style={box} onSubmit={handleSubmit}>
      <h3 style={{ margin: '0 0 4px' }}>Report an issue</h3>
      <p style={{ margin: '0 0 12px', fontSize: 12, color: '#555' }}>
        Location: {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
      </p>

      <input style={field} placeholder="Short title (e.g. Broken streetlight)"
        value={title} onChange={(e) => setTitle(e.target.value)} />

      <select style={field} value={category} onChange={(e) => setCategory(e.target.value)}>
        {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
      </select>

      <textarea style={field} rows={3} placeholder="Describe the problem"
        value={description} onChange={(e) => setDescription(e.target.value)} />

      <input style={field} placeholder="Your name (optional)"
        value={reporter} onChange={(e) => setReporter(e.target.value)} />

      <button type="submit" style={{ marginRight: 8, padding: '8px 14px' }}>Submit</button>
      <button type="button" onClick={onCancel} style={{ padding: '8px 14px' }}>Cancel</button>
    </form>
  )
}