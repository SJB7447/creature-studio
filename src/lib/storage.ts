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

/**
 * 이미지 스튜디오에서 생성된 이미지를 Firebase Storage에 업로드
 * base64 문자열 → Blob → Storage
 * 경로: projects/{projectId}/episodes/{episodeId}/scenes/{sceneId}/generated-images/{cutNumber}_{timestamp}.png
 */
export async function uploadGeneratedImage(
  projectId: string,
  episodeId: string,
  sceneId: string,
  cutNumber: number,
  base64Data: string,
  mimeType: string = 'image/png',
  suffix?: string
): Promise<string> {
  const byteCharacters = atob(base64Data)
  const byteArray = new Uint8Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteArray[i] = byteCharacters.charCodeAt(i)
  }
  const blob = new Blob([byteArray], { type: mimeType })
  const ext = mimeType.split('/')[1] ?? 'png'
  const fileId = suffix ?? String(Date.now())
  const path = `projects/${projectId}/episodes/${episodeId}/scenes/${sceneId}/generated-images/cut${cutNumber}_${fileId}.${ext}`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, blob)
  return getDownloadURL(storageRef)
}

export async function deleteStorageFile(fileUrl: string): Promise<void> {
  try {
    const storageRef = ref(storage, fileUrl)
    await deleteObject(storageRef)
  } catch {
    // File may not exist, ignore
  }
}
