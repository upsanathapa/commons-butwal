import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// One ID per browser, used to stop double confirmations
export function getDeviceId() {
  let id = localStorage.getItem('device_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('device_id', id)
  }
  return id
}

// Load all issues, each with its confirmation count
export async function loadIssues() {
  const { data, error } = await supabase
    .from('issues')
    .select('*, confirmations(count)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map((i) => ({
    ...i,
    confirmCount: i.confirmations?.[0]?.count ?? 0,
  }))
}

// Upload a photo and return its public URL
export async function uploadPhoto(file) {
  const ext = file.name.split('.').pop()
  const path = `${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage
    .from('issue-photos')
    .upload(path, file)
  if (error) throw error
  return supabase.storage.from('issue-photos').getPublicUrl(path).data.publicUrl
}

// Add a new issue (photo is optional)
export async function addIssue({ title, category, description, lat, lng, reporter_name, photoFile }) {
  let photo_url = null
  if (photoFile) photo_url = await uploadPhoto(photoFile)
  const { data, error } = await supabase
    .from('issues')
    .insert({ title, category, description, lat, lng, reporter_name, photo_url })
    .select()
    .single()
  if (error) throw error
  return data
}

// "I see this too". Returns false if this device already confirmed.
export async function confirmIssue(issueId) {
  const { error } = await supabase
    .from('confirmations')
    .insert({ issue_id: issueId, device_id: getDeviceId() })
  if (error) {
    if (error.code === '23505') return false // duplicate, already confirmed
    throw error
  }
  return true
}