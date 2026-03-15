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

export interface AgentStep {
  id: string
  label: string
  status: 'pending' | 'running' | 'done' | 'error'
  result?: string
  error?: string
}

export interface AgentResult {
  directorScript: string
  imagePrompts: ImagePrompts
  videoPrompts: VideoPrompts
  storyboardFrames: StoryboardFrame[]
  agentAnalysis: string
  steps: AgentStep[]
}

export type User = {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
}
