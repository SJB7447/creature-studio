import { Timestamp } from 'firebase/firestore'

export type ProjectType = 'animation' | 'film' | 'short' | 'documentary' | 'other'
export type ProjectStatus = 'development' | 'preproduction' | 'production' | 'postproduction' | 'completed'
export type AspectRatio = '16:9' | '9:16' | '1:1' | '2.39:1'
export type FrameRate = '24fps' | '30fps' | '60fps'
export type EpisodeStatus = 'draft' | 'inprogress' | 'review' | 'final'
export type SceneStatus = 'draft' | 'inprogress' | 'review' | 'final'
export type CameraMovement = 'static' | 'pan' | 'tilt' | 'zoom_in' | 'zoom_out' | 'tracking' | 'crane'
export type CameraAngle = 'eye_level' | 'high_angle' | 'low_angle' | 'birds_eye' | 'dutch'
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night' | 'interior'

export interface ArtContext {
  style: string
  colorPalette: string[]
  moodKeywords: string[]
  prohibitedElements: string[]
  referenceWorks: string[]
  aspectRatio: AspectRatio
  frameRate: FrameRate
}

export interface ProductionInfo {
  broadcaster: string
  runtime: string
  totalEpisodes: number
  submissionDeadline?: string
}

export interface Project {
  id: string
  title: string
  titleEn: string
  type: ProjectType
  genre: string[]
  targetAudience: string
  status: ProjectStatus
  artContext: ArtContext
  productionInfo: ProductionInfo
  ownerId: string
  collaborators: string[]
  createdAt: Timestamp
  updatedAt: Timestamp
  thumbnail?: string
}

export interface EmotionVariant {
  emotion: string
  appearanceChange: string
  promptAddition: string
}

export interface CharacterAppearance {
  base: string
  styleKeywords: string[]
  colorScheme: string
  fixedPromptKeywords: string[]
}

export interface Character {
  id: string
  name: string
  nameEn: string
  role: string
  emotionalRole: string
  appearance: CharacterAppearance
  emotionVariants: EmotionVariant[]
  episodeAppearances: string[]
  profileImage?: string
  confirmedAt?: Timestamp
  createdAt: Timestamp
}

export type ConfirmedAssetCategory = 'character' | 'background' | 'sound' | 'prop' | 'effect'

export interface ConfirmedAsset {
  id: string
  name: string
  category: ConfirmedAssetCategory
  description: string
  fileUrl: string
  thumbnailUrl?: string | null
  fileType: string
  tags: string[]
  prompt?: string | null
  confirmedAt: Timestamp
  createdAt: Timestamp
}

export interface Episode {
  id: string
  projectId: string
  number: number
  title: string
  targetEmotion: string
  coreMessage: string
  synopsis: string
  runtime: string
  status: EpisodeStatus
  sceneCount: number
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface Dialogue {
  characterId: string
  characterName: string
  line: string
  emotion: string
  direction: string
}

export interface StoryboardFrame {
  frameNumber: number
  description: string
  cameraNote: string
  layout: string
}

export interface ImagePrompts {
  base: string
  midjourney: string
  imagen: string
  negativePrompt: string
}

/** 컷별 이미지 프롬프트 (시간 구간 + 프롬프트) */
export interface ImagePromptCut {
  cutNumber: number
  timeStart: string
  timeEnd: string
  description: string
  prompts: ImagePrompts
}

export interface VideoPrompts {
  veo: string
  sora: string
  runway: string
}

/** 컷별 영상 프롬프트 (스토리보드 프레임과 1:1 매핑) */
export interface VideoPromptCut {
  cutNumber: number
  timeStart: string
  timeEnd: string
  storyboardFrame?: number
  description: string
  prompts: VideoPrompts
}

export interface GeneratedImage {
  /** 컷 번호 (0 = 대표 이미지) */
  cutNumber: number
  /** 현재 선택된 이미지 URL (Firebase Storage) */
  url: string
  /** 이번 생성 라운드의 후보 이미지 URLs (최대 4장) */
  candidates: string[]
  /** 선택된 후보 인덱스 */
  selectedIndex: number
  /** 생성에 사용된 프롬프트 */
  prompt: string
  /** 사용된 모델 */
  model: 'imagen3' | 'gemini-flash' | 'gemini-pro'
  /** 생성 시각 (ISO string) */
  createdAt: string
  /** 이전 생성 라운드들 (재생성 히스토리) */
  history?: GeneratedImageRound[]
}

export interface GeneratedImageRound {
  candidates: string[]
  selectedIndex: number
  prompt: string
  model: string
  createdAt: string
}

export interface SceneAssets {
  directorScript?: string
  imagePrompt?: ImagePrompts
  imagePromptCuts?: ImagePromptCut[]
  videoPrompt?: VideoPrompts
  videoPromptCuts?: VideoPromptCut[]
  storyboardFrames?: StoryboardFrame[]
  agentAnalysis?: string
  generatedImages?: GeneratedImage[]
}

export interface SceneTransform {
  triggerMoment: string
  stateBefore: string
  stateAfter: string
  transitionStyle: string
  duration: string
}

export interface Scene {
  id: string
  episodeId: string
  projectId: string
  number: number
  title: string
  timeStart: string
  timeEnd: string
  location: string
  timeOfDay: TimeOfDay
  weather?: string
  characters: string[]
  cameraMovement: CameraMovement
  cameraAngle: CameraAngle
  lighting: string
  colorGrade: string
  emotionKeywords: string[]
  backgroundDescription: string
  actionDescription: string
  dialogues: Dialogue[]
  soundDesign: string
  directorNote: string
  isAITransformScene: boolean
  transform?: SceneTransform
  assets: SceneAssets
  status: SceneStatus
  createdAt: Timestamp
  updatedAt: Timestamp
}

// Legacy step object (used in SSE streaming)
export interface AgentStepInfo {
  id: string
  label: string
  status: 'pending' | 'running' | 'done' | 'error'
  result?: string
  error?: string
}

// New agent step union
export type AgentStepName =
  | 'idle'
  | 'analyzing'       // Step 1
  | 'characters'      // Step 2
  | 'scripting'       // Step 3
  | 'storyboard'      // Step 4 (스토리보드 먼저 → 이미지/영상에 반영)
  | 'imagePrompt'     // Step 5
  | 'videoPrompt'     // Step 6
  | 'validating'      // Step 7
  | 'done'
  | 'error'

export interface AgentProgress {
  step: AgentStepName
  stepNumber: number   // 1~7
  message: string
  result?: any
}

export interface SceneAnalysis {
  emotionFlow: string
  narrativePosition: string
  keyVisualMoment: string
  technicalRequirements: string
  childSafetyNotes: string
  raw: string
}

export interface CharacterContext {
  characterCount: number
  context: string
  characters: { name: string; role: string; appearance: string; keywords: string[] }[]
}

export interface ValidationResult {
  styleCompliance: string
  prohibitedCheck: string
  keyElementReflection: string
  recommendations: string
  qualityGrade: 'A' | 'B' | 'C'
  raw: string
}

export interface AgentResult {
  analysis: SceneAnalysis
  characterContext: CharacterContext
  directorScript: string
  imagePrompts: ImagePrompts
  imagePromptCuts: ImagePromptCut[]
  videoPrompts: VideoPrompts
  videoPromptCuts: VideoPromptCut[]
  storyboardFrames: StoryboardFrame[]
  validation: ValidationResult
  agentAnalysis: string
  steps: AgentStepInfo[]
}

// Keep backward compat alias
export type AgentStep = AgentStepInfo

export type User = {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
}

export type InvitationStatus = 'pending' | 'accepted' | 'declined'
export type CollaboratorRole = 'editor' | 'viewer'

export interface Invitation {
  id: string
  projectId: string
  projectTitle: string
  fromUserId: string
  fromUserName: string
  fromUserPhoto: string
  toEmail: string
  toUserId?: string
  status: InvitationStatus
  role: CollaboratorRole
  createdAt: Timestamp
}

export interface UserProfile {
  uid: string
  email: string
  displayName: string
  photoURL: string
  updatedAt: Timestamp
}

export type NotificationActionType =
  | 'episode_created'
  | 'scene_created'
  | 'scene_updated'
  | 'agent_completed'
  | 'asset_confirmed'
  | 'collaborator_added'
  | 'project_updated'

export interface AppNotification {
  id: string
  userId: string           // 받는 사람
  actorId: string          // 행동한 사람
  actorName: string
  actorPhoto?: string
  actionType: NotificationActionType
  projectId: string
  projectTitle: string
  targetTitle: string      // 에피소드/씬 제목 등
  read: boolean
  createdAt: Timestamp
}
