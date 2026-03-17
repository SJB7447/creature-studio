import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  DocumentData,
  QueryDocumentSnapshot,
  Unsubscribe,
} from 'firebase/firestore'
import { db } from './firebase'
import { Project, Episode, Scene, Character, ConfirmedAsset, Invitation, UserProfile, CollaboratorRole } from '@/types'

// ─── Projects ────────────────────────────────────────────────
export async function getProjects(userId: string): Promise<Project[]> {
  // 내가 소유한 프로젝트
  const ownQ = query(
    collection(db, 'projects'),
    where('ownerId', '==', userId),
    orderBy('updatedAt', 'desc')
  )
  const ownSnap = await getDocs(ownQ)
  const owned = ownSnap.docs.map(d => ({ id: d.id, ...d.data() } as Project))

  // 내가 협업자로 참여한 프로젝트
  const collabQ = query(
    collection(db, 'projects'),
    where('collaborators', 'array-contains', userId)
  )
  const collabSnap = await getDocs(collabQ)
  const collaborated = collabSnap.docs.map(d => ({ id: d.id, ...d.data() } as Project))

  // 중복 제거 후 합치기
  const seen = new Set(owned.map(p => p.id))
  const merged = [...owned]
  for (const p of collaborated) {
    if (!seen.has(p.id)) merged.push(p)
  }

  return merged.sort((a, b) => {
    const aTime = (a.updatedAt as any)?.toDate?.() || new Date(0)
    const bTime = (b.updatedAt as any)?.toDate?.() || new Date(0)
    return bTime.getTime() - aTime.getTime()
  })
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

// ─── Confirmed Assets ────────────────────────────────────────
export async function getConfirmedAssets(projectId: string): Promise<ConfirmedAsset[]> {
  const q = query(
    collection(db, 'projects', projectId, 'confirmedAssets'),
    orderBy('createdAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as ConfirmedAsset))
}

export async function createConfirmedAsset(
  projectId: string,
  data: Omit<ConfirmedAsset, 'id' | 'createdAt' | 'confirmedAt'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'projects', projectId, 'confirmedAssets'), {
    ...data,
    confirmedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateConfirmedAsset(
  projectId: string,
  assetId: string,
  data: Partial<ConfirmedAsset>
): Promise<void> {
  await updateDoc(doc(db, 'projects', projectId, 'confirmedAssets', assetId), data)
}

export async function deleteConfirmedAsset(projectId: string, assetId: string): Promise<void> {
  await deleteDoc(doc(db, 'projects', projectId, 'confirmedAssets', assetId))
}

export function subscribeConfirmedAssets(
  projectId: string,
  callback: (assets: ConfirmedAsset[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, 'projects', projectId, 'confirmedAssets'),
    orderBy('createdAt', 'desc')
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as ConfirmedAsset)))
  }, onError)
}

// ─── Real-time Subscriptions ──────────────────────────────────
export function subscribeProjects(
  userId: string,
  callback: (projects: Project[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, 'projects'),
    where('ownerId', '==', userId),
    orderBy('updatedAt', 'desc')
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Project)))
  }, onError)
}

export function subscribeProject(
  projectId: string,
  callback: (project: Project | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(doc(db, 'projects', projectId), (snap) => {
    if (!snap.exists()) return callback(null)
    callback({ id: snap.id, ...snap.data() } as Project)
  }, onError)
}

export function subscribeEpisodes(
  projectId: string,
  callback: (episodes: Episode[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, 'projects', projectId, 'episodes'),
    orderBy('number', 'asc')
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Episode)))
  }, onError)
}

export function subscribeScenes(
  projectId: string,
  episodeId: string,
  callback: (scenes: Scene[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, 'projects', projectId, 'episodes', episodeId, 'scenes'),
    orderBy('number', 'asc')
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Scene)))
  }, onError)
}

export function subscribeCharacters(
  projectId: string,
  callback: (characters: Character[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, 'projects', projectId, 'characters'),
    orderBy('createdAt', 'asc')
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Character)))
  }, onError)
}

// ─── User Profiles ────────────────────────────────────────────
export async function saveUserProfile(data: Omit<UserProfile, 'updatedAt'>): Promise<void> {
  await setDoc(doc(db, 'users', data.uid), {
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

export async function getUserByEmail(email: string): Promise<UserProfile | null> {
  const q = query(collection(db, 'users'), where('email', '==', email.toLowerCase()))
  const snap = await getDocs(q)
  if (snap.empty) return null
  return snap.docs[0].data() as UserProfile
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return null
  return snap.data() as UserProfile
}

export async function getUserProfiles(uids: string[]): Promise<UserProfile[]> {
  if (uids.length === 0) return []
  const profiles: UserProfile[] = []
  for (const uid of uids) {
    const profile = await getUserProfile(uid)
    if (profile) profiles.push(profile)
  }
  return profiles
}

// ─── Invitations ──────────────────────────────────────────────
export async function createInvitation(data: {
  projectId: string
  projectTitle: string
  fromUserId: string
  fromUserName: string
  fromUserPhoto: string
  toEmail: string
  role: CollaboratorRole
}): Promise<string> {
  // 이미 같은 프로젝트에 같은 이메일로 pending 초대가 있는지 확인
  const existQ = query(
    collection(db, 'invitations'),
    where('projectId', '==', data.projectId),
    where('toEmail', '==', data.toEmail.toLowerCase()),
    where('status', '==', 'pending')
  )
  const existSnap = await getDocs(existQ)
  if (!existSnap.empty) throw new Error('이미 초대장이 발송되었습니다.')

  // 대상 유저가 이미 존재하면 toUserId도 저장
  const targetUser = await getUserByEmail(data.toEmail.toLowerCase())

  const ref = await addDoc(collection(db, 'invitations'), {
    ...data,
    toEmail: data.toEmail.toLowerCase(),
    toUserId: targetUser?.uid || null,
    status: 'pending',
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function getInvitationsForUser(email: string): Promise<Invitation[]> {
  const q = query(
    collection(db, 'invitations'),
    where('toEmail', '==', email.toLowerCase()),
    where('status', '==', 'pending')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Invitation))
}

export async function getProjectInvitations(projectId: string): Promise<Invitation[]> {
  const q = query(
    collection(db, 'invitations'),
    where('projectId', '==', projectId),
    orderBy('createdAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Invitation))
}

export async function acceptInvitation(invitationId: string, userId: string): Promise<void> {
  const invRef = doc(db, 'invitations', invitationId)
  const invSnap = await getDoc(invRef)
  if (!invSnap.exists()) throw new Error('초대를 찾을 수 없습니다.')
  const inv = invSnap.data() as Invitation

  // 프로젝트 collaborators에 추가
  await updateDoc(doc(db, 'projects', inv.projectId), {
    collaborators: arrayUnion(userId),
    updatedAt: serverTimestamp(),
  })

  // 초대 상태 업데이트
  await updateDoc(invRef, { status: 'accepted', toUserId: userId })
}

export async function declineInvitation(invitationId: string): Promise<void> {
  await updateDoc(doc(db, 'invitations', invitationId), { status: 'declined' })
}

export async function cancelInvitation(invitationId: string): Promise<void> {
  await deleteDoc(doc(db, 'invitations', invitationId))
}

export async function removeCollaborator(projectId: string, userId: string): Promise<void> {
  await updateDoc(doc(db, 'projects', projectId), {
    collaborators: arrayRemove(userId),
    updatedAt: serverTimestamp(),
  })
}

// ─── Scene Assets Update ──────────────────────────────────────
export async function updateSceneAssets(
  projectId: string,
  episodeId: string,
  sceneId: string,
  assets: Partial<Scene['assets']>
): Promise<void> {
  const sceneRef = doc(db, 'projects', projectId, 'episodes', episodeId, 'scenes', sceneId)
  const snap = await getDoc(sceneRef)
  if (!snap.exists()) throw new Error('씬을 찾을 수 없습니다.')
  const current = snap.data().assets || {}
  await updateDoc(sceneRef, {
    assets: { ...current, ...assets },
    updatedAt: serverTimestamp(),
  })
}
