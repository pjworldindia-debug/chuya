import { supabase } from './supabase'

type StorageBucket = 'product-images' | 'banner-images'

/**
 * Convert an image File to WebP format using Canvas API.
 * Returns a Blob in WebP format at 85% quality.
 */
export async function convertToWebP(file: File, quality: number = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to get canvas context'))
        return
      }

      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to convert image to WebP'))
          }
        },
        'image/webp',
        quality
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }

    img.src = url
  })
}

/**
 * Upload an image file to Supabase Storage.
 * Converts to WebP before uploading.
 * Returns the public URL of the uploaded image.
 */
export async function uploadImage(
  file: File,
  bucket: StorageBucket
): Promise<string> {
  try {
    // Convert to WebP
    const webpBlob = await convertToWebP(file)

    // Generate unique filename
    const uuid = crypto.randomUUID()
    const timestamp = Date.now()
    const filename = `${uuid}-${timestamp}.webp`

    // Upload to VPS
    const webpFile = new File([webpBlob], filename, { type: 'image/webp' })
    const formData = new FormData()
    formData.append('file', webpFile)

    // Using VITE_API_URL or relative proxy
    const apiUrl = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_API_URL || '' : ''

    const res = await fetch(`${apiUrl}/api/upload`, {
      method: 'POST',
      body: formData,
    })

    const data = await res.json()
    if (!res.ok) {
      throw new Error(`Upload failed: ${data.error || res.statusText}`)
    }

    // Return full URL to the image on the API server
    return `${apiUrl}${data.publicUrl}`
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown upload error'
    throw new Error(message)
  }
}

/**
 * Upload a raw file to Supabase Storage without conversion.
 * Ideal for videos or documents.
 * Returns the public URL of the uploaded file.
 */
export async function uploadFile(
  file: File,
  bucket: StorageBucket
): Promise<string> {
  try {
    // Generate unique filename preserving extension
    const uuid = crypto.randomUUID()
    const timestamp = Date.now()
    const extension = file.name.split('.').pop() || 'bin'
    const filename = `${uuid}-${timestamp}.${extension}`

    // Upload to VPS
    const newFile = new File([file], filename, { type: file.type })
    const formData = new FormData()
    formData.append('file', newFile)

    const apiUrl = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_API_URL || '' : ''

    const res = await fetch(`${apiUrl}/api/upload`, {
      method: 'POST',
      body: formData,
    })

    const data = await res.json()
    if (!res.ok) {
      throw new Error(`Upload failed: ${data.error || res.statusText}`)
    }

    return `${apiUrl}${data.publicUrl}`
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown upload error'
    throw new Error(message)
  }
}

/**
 * Delete an image from Supabase Storage by its public URL.
 */
export async function deleteImage(
  publicUrl: string,
  bucket: StorageBucket
): Promise<void> {
  try {
    // Extract filename from public URL
    const url = new URL(publicUrl, 'http://localhost') // fallback base for relative urls
    const pathParts = url.pathname.split('/')
    const filename = pathParts[pathParts.length - 1]

    if (!filename) {
      throw new Error('Could not extract filename from URL')
    }

    const apiUrl = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_API_URL || '' : ''

    const res = await fetch(`${apiUrl}/api/upload/${filename}`, {
      method: 'DELETE'
    })

    if (!res.ok) {
      throw new Error(`Delete failed: ${res.statusText}`)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown delete error'
    throw new Error(message)
  }
}

/**
 * Upload multiple images and return their public URLs.
 */
export async function uploadMultipleImages(
  files: File[],
  bucket: StorageBucket
): Promise<string[]> {
  const uploadPromises = files.map((file) => uploadImage(file, bucket))
  return Promise.all(uploadPromises)
}
