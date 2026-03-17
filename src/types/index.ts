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

export interface VideoPrompts {
  veo: string
  sora: string
  runway: string
}

export interface SceneAssets {
  directorScript?: string
  imagePrompt?: ImagePrompts
  videoPrompt?: VideoPrompts
  storyboardFrames?: StoryboardFrame[]
  agentAnalysis?: string
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
  | 'imagePrompt'     // Step 4
  | 'videoPrompt'     // Step 5
  | 'storyboard'      // Step 6
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
  videoPrompts: VideoPrompts
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
