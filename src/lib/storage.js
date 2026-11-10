import { supabase } from './supabase'

async function shrink(file, maxSize = 1280) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('shrink failed'))), 'image/jpeg', 0.82)
  )
}

export async function uploadPhoto(file) {
  let body = file
  let ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  let type = file.type || 'image/jpeg'
  try {
    body = await shrink(file)
    ext = 'jpg'
    type = 'image/jpeg'
  } catch (e) {
    console.warn('Could not shrink photo, uploading the original', e)
  }
  const path = `${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('issue-photos').upload(path, body, { contentType: type })
  if (error) throw error
  const { data } = supabase.storage.from('issue-photos').getPublicUrl(path)
  return data.publicUrl
}
