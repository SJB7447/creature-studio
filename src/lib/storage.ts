import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from './firebase'

export async function uploadProjectFile(
  projectId: string,
  path: string,
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop() || 'bin'
  const timestamp = Date.now()
  const storageRef = ref(storage, `projects/${projectId}/${path}/${timestamp}.${ext}`)
  await uploadBytes(storageRef, file)
  return getDownloadURL(storageRef)
}

export async function uploadCharacterProfile(
  projectId: string,
  characterId: string,
  file: File
): Promise<string> {
  return uploadProjectFile(projectId, `characters/${characterId}/profile`, file)
}

export async function uploadConfirmedAsset(
  projectId: string,
  category: string,
  file: File
): Promise<string> {
  return uploadProjectFile(projectId, `confirmed-assets/${category}`, file)
}

export async function deleteStorageFile(fileUrl: string): Promise<void> {
  try {
    const storageRef = ref(storage, fileUrl)
    await deleteObject(storageRef)
  } catch {
    // File may not exist, ignore
  }
}
