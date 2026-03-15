import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  DocumentData,
  QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from './firebase'
import { Project, Episode, Scene, Character } from '@/types'

// ─── Projects ────────────────────────────────────────────────
export async function getProjects(userId: string): Promise<Project[]> {
  const q = query(
    collection(db, 'projects'),
    where('ownerId', '==', userId),
    orderBy('updatedAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Project))
}

export async function getProject(projectId: string): Promise<Project | null> {
  const snap = await getDoc(doc(db, 'projects', projectId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Project
}

export async function createProject(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'projects'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateProject(projectId: string, data: Partial<Project>): Promise<void> {
  await updateDoc(doc(db, 'projects', projectId), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteProject(projectId: string): Promise<void> {
  await deleteDoc(doc(db, 'projects', projectId))
}

// ─── Episodes ─────────────────────────────────────────────────
export async function getEpisodes(projectId: string): Promise<Episode[]> {
  const q = query(
    collection(db, 'projects', projectId, 'episodes'),
    orderBy('number', 'asc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Episode))
}

export async function getEpisode(projectId: string, episodeId: string): Promise<Episode | null> {
  const snap = await getDoc(doc(db, 'projects', projectId, 'episodes', episodeId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Episode
}

export async function createEpisode(projectId: string, data: Omit<Episode, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'projects', projectId, 'episodes'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateEpisode(projectId: string, episodeId: string, data: Partial<Episode>): Promise<void> {
  await updateDoc(doc(db, 'projects', projectId, 'episodes', episodeId), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteEpisode(projectId: string, episodeId: string): Promise<void> {
  await deleteDoc(doc(db, 'projects', projectId, 'episodes', episodeId))
}

// ─── Scenes ───────────────────────────────────────────────────
export async function getScenes(projectId: string, episodeId: string): Promise<Scene[]> {
  const q = query(
    collection(db, 'projects', projectId, 'episodes', episodeId, 'scenes'),
    orderBy('number', 'asc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Scene))
}

export async function getScene(projectId: string, episodeId: string, sceneId: string): Promise<Scene | null> {
  const snap = await getDoc(doc(db, 'projects', projectId, 'episodes', episodeId, 'scenes', sceneId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Scene
}

export async function createScene(projectId: string, episodeId: string, data: Omit<Scene, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'projects', projectId, 'episodes', episodeId, 'scenes'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateScene(projectId: string, episodeId: string, sceneId: string, data: Partial<Scene>): Promise<void> {
  await updateDoc(doc(db, 'projects', projectId, 'episodes', episodeId, 'scenes', sceneId), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteScene(projectId: string, episodeId: string, sceneId: string): Promise<void> {
  await deleteDoc(doc(db, 'projects', projectId, 'episodes', episodeId, 'scenes', sceneId))
}

// ─── Characters ───────────────────────────────────────────────
export async function getCharacters(projectId: string): Promise<Character[]> {
  const q = query(
    collection(db, 'projects', projectId, 'characters'),
    orderBy('createdAt', 'asc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Character))
}

export async function createCharacter(projectId: string, data: Omit<Character, 'id' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'projects', projectId, 'characters'), {
    ...data,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateCharacter(projectId: string, characterId: string, data: Partial<Character>): Promise<void> {
  await updateDoc(doc(db, 'projects', projectId, 'characters', characterId), data)
}

export async function deleteCharacter(projectId: string, characterId: string): Promise<void> {
  await deleteDoc(doc(db, 'projects', projectId, 'characters', characterId))
}
