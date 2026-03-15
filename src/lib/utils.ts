import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTimestamp(timestamp: any): string {
  if (!timestamp) return ''
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  development: '개발 중',
  preproduction: '프리프로덕션',
  production: '제작 중',
  postproduction: '후반 작업',
  completed: '완성',
}

export const PROJECT_TYPE_LABELS: Record<string, string> = {
  animation: '애니메이션',
  film: '영화',
  short: '단편',
  documentary: '다큐멘터리',
  other: '기타',
}

export const EPISODE_STATUS_LABELS: Record<string, string> = {
  draft: '초안',
  inprogress: '작업 중',
  review: '검토 중',
  final: '최종',
}

export const SCENE_STATUS_LABELS: Record<string, string> = {
  draft: '초안',
  inprogress: '작업 중',
  review: '검토 중',
  final: '최종',
}

export const CAMERA_MOVEMENT_LABELS: Record<string, string> = {
  static: '고정',
  pan: '팬',
  tilt: '틸트',
  zoom_in: '줌인',
  zoom_out: '줌아웃',
  tracking: '트래킹',
  crane: '크레인',
}

export const CAMERA_ANGLE_LABELS: Record<string, string> = {
  eye_level: '아이레벨',
  high_angle: '하이앵글',
  low_angle: '로우앵글',
  birds_eye: '조감',
  dutch: '더치앵글',
}

export const TIME_OF_DAY_LABELS: Record<string, string> = {
  morning: '아침',
  afternoon: '낮',
  evening: '저녁',
  night: '밤',
  interior: '실내',
}
