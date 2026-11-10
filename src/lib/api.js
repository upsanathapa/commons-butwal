import { supabase } from './supabase'
import { uploadPhoto } from './storage'

// Each browser gets a random ID saved on the device.
// It lets us allow only one confirmation and one fix vote per device per issue.
export function getDeviceId() {
  let id = localStorage.getItem('commons_device_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('commons_device_id', id)
  }
  return id
}

export async function fetchIssues() {
  const deviceId = getDeviceId()

  const { data: issues, error } = await supabase
    .from('issues')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error

  const { data: confs, error: confError } = await supabase
    .from('confirmations')
    .select('issue_id, device_id')
  if (confError) throw confError

  // Fix votes are optional: if the table is missing, the app still works
  let votes = []
  try {
    const { data, error: voteError } = await supabase
      .from('fix_votes')
      .select('issue_id, device_id, vote')
    if (!voteError && data) votes = data
  } catch {
    votes = []
  }

  return issues.map((issue) => {
    const forIssue = confs.filter((c) => c.issue_id === issue.id)
    const votesForIssue = votes.filter((v) => v.issue_id === issue.id)
    return {
      ...issue,
      reporter: issue.reporter_name,
      confirmations: forIssue.length,
      confirmedByMe: forIssue.some((c) => c.device_id === deviceId),
      fixedVotes: votesForIssue.filter((v) => v.vote === 'fixed').length,
      brokenVotes: votesForIssue.filter((v) => v.vote === 'broken').length,
      myVote: votesForIssue.find((v) => v.device_id === deviceId)?.vote || null,
    }
  })
}

// Save a new issue. If the photo fails to upload, the report is still saved without it.
export async function createIssue(details, position) {
  let photoUrl = null
  let photoFailed = false

  if (details.photo) {
    try {
      photoUrl = await uploadPhoto(details.photo)
    } catch (e) {
      console.error('Photo upload failed', e)
      photoFailed = true
    }
  }

  const { error } = await supabase.from('issues').insert({
    title: details.title.trim(),
    category: details.category,
    description: details.description,
    reporter_name: details.reporter || null,
    photo_url: photoUrl,
    lat: position.lat,
    lng: position.lng,
  })
  if (error) throw error

  return { photoFailed }
}

// Code 23505 means "already done", which is fine
export async function confirmIssue(issueId) {
  const { error } = await supabase
    .from('confirmations')
    .insert({ issue_id: issueId, device_id: getDeviceId() })
  if (error && error.code !== '23505') throw error
}

// vote is 'fixed' or 'broken'
export async function castFixVote(issueId, vote) {
  const { error } = await supabase
    .from('fix_votes')
    .insert({ issue_id: issueId, device_id: getDeviceId(), vote })
  if (error && error.code !== '23505') throw error
}
