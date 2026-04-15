import { Cloudinary } from '@cloudinary/url-gen'
import { fill } from '@cloudinary/url-gen/actions/resize'
import { focusOn } from '@cloudinary/url-gen/qualifiers/gravity'
import { FocusOn } from '@cloudinary/url-gen/qualifiers/focusOn'

const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME

// Cloudinary instance for URL generation
export const cld = new Cloudinary({
  cloud: { cloudName }
})

/**
 * Upload a file directly to Cloudinary from the browser (unsigned upload).
 * Requires an unsigned upload preset configured in your Cloudinary dashboard.
 */
export async function uploadToCloudinary(file, options = {}) {
  const {
    folder = 'chikitsak',
    uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'chikitsak_unsigned',
    resourceType = 'auto',
    onProgress = null,
  } = options

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', uploadPreset)
  formData.append('folder', folder)

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`

  const xhr = new XMLHttpRequest()

  return new Promise((resolve, reject) => {
    xhr.open('POST', url)

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100))
        }
      }
    }

    xhr.onload = () => {
      if (xhr.status === 200) {
        resolve(JSON.parse(xhr.responseText))
      } else {
        reject(new Error(`Upload failed: ${xhr.statusText}`))
      }
    }

    xhr.onerror = () => reject(new Error('Upload network error'))
    xhr.send(formData)
  })
}

/**
 * Upload a health record file (PDF, image, doc).
 */
export async function uploadHealthRecord(file, patientId, recordType = 'report', onProgress = null) {
  return uploadToCloudinary(file, {
    folder: `chikitsak/health_records/${patientId}`,
    resourceType: 'auto',
    onProgress,
  })
}

/**
 * Upload a profile image with face-crop transformation.
 */
export async function uploadProfileImage(file, patientId, onProgress = null) {
  return uploadToCloudinary(file, {
    folder: 'chikitsak/profiles',
    resourceType: 'image',
    onProgress,
  })
}

/**
 * Get an optimized image URL from a Cloudinary public_id.
 */
export function getImageUrl(publicId, width = 400, height = 400) {
  return cld
    .image(publicId)
    .resize(fill().width(width).height(height).gravity(focusOn(FocusOn.face())))
    .toURL()
}

/**
 * Get a raw file URL (for PDFs, docs, etc.)
 */
export function getFileUrl(publicId) {
  return `https://res.cloudinary.com/${cloudName}/raw/upload/${publicId}`
}

export default { uploadToCloudinary, uploadHealthRecord, uploadProfileImage, getImageUrl, getFileUrl, cld }
