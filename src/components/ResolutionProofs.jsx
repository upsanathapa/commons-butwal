
import { useEffect, useState } from 'react'
import {
  submitResolutionProof,
  fetchResolutionProofs,
  reviewResolutionProof,
} from '../lib/api'

export default function ResolutionProofs({
  issue,
  user,
  admin,
  onUpdated,
}) {
  const [proofs, setProofs] = useState([])
  const [photo, setPhoto] = useState(null)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function loadProofs() {
    try {
      setLoading(true)
      const data = await fetchResolutionProofs(issue.id)
      setProofs(data)
    } catch (err) {
      setError(err.message || 'Could not load proof submissions.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProofs()
  }, [issue.id])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!photo) {
      setError('Please select an after-photo.')
      return
    }

    try {
      setSubmitting(true)
      setError('')

      await submitResolutionProof(issue.id, photo, note)

      setPhoto(null)
      setNote('')
      e.target.reset()

      await loadProofs()
      onUpdated?.()
    } catch (err) {
      setError(err.message || 'Could not submit proof.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleReview(proofId, decision) {
    try {
      setError('')
      await reviewResolutionProof(proofId, decision)
      await loadProofs()
      onUpdated?.()
    } catch (err) {
      setError(err.message || 'Could not review proof.')
    }
  }

  return (
    <div className="resolution-proofs">
      <h3>Proof of Resolution</h3>
      <p>
        Share a photo showing that this reported issue has been resolved.
      </p>

      {user ? (
        <form onSubmit={handleSubmit}>
          <label>After-photo</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setPhoto(e.target.files?.[0] || null)}
          />

          <label>Additional explanation (optional)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Describe what was fixed..."
            rows={2}
          />

          <button type="submit" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit resolution proof'}
          </button>
        </form>
      ) : (
        <p>Sign in to submit a resolution photo.</p>
      )}

      {error && <p className="proof-error">{error}</p>}

      <h4>Submitted proofs</h4>

      {loading ? (
        <p>Loading proofs...</p>
      ) : proofs.length === 0 ? (
        <p>No resolution proofs submitted yet.</p>
      ) : (
        proofs.map((proof) => (
          <div className="proof-item" key={proof.id}>
            <img
              src={proof.photo_url}
              alt="Resolution proof"
              className="proof-image"
            />

            {proof.note && <p>{proof.note}</p>}

            <small>
              Submitted: {new Date(proof.created_at).toLocaleString()}
            </small>

            <p>
              Status: <strong>{proof.status}</strong>
            </p>

            {admin && proof.status === 'pending' && (
              <div className="proof-review-actions">
                <button
                  type="button"
                  onClick={() => handleReview(proof.id, 'approved')}
                >
                  Approve
                </button>

                <button
                  type="button"
                  onClick={() => handleReview(proof.id, 'rejected')}
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}
