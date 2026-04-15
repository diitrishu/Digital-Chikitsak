const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD || 'your_cloud_name';
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_PRESET || 'chikitsak_unsigned';

export async function uploadToCloudinary(fileUri, options = {}) {
  const { folder = 'chikitsak', resourceType = 'auto', onProgress = null } = options;

  const filename = fileUri.split('/').pop();
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'application/octet-stream';

  const formData = new FormData();
  formData.append('file', { uri: fileUri, name: filename, type });
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', folder);

  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;

  const response = await fetch(url, { method: 'POST', body: formData });
  if (!response.ok) throw new Error(`Upload failed: ${response.statusText}`);
  return response.json();
}

export async function uploadHealthRecord(fileUri, patientId) {
  return uploadToCloudinary(fileUri, {
    folder: `chikitsak/health_records/${patientId}`,
    resourceType: 'auto',
  });
}

export function getFileUrl(publicId) {
  return `https://res.cloudinary.com/${CLOUD_NAME}/raw/upload/${publicId}`;
}

export function getImageUrl(publicId, width = 400) {
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/w_${width},c_fill/${publicId}`;
}
