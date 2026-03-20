import { Scene, Project } from '@/types'

/**
 * 타임코드(MM:SS 또는 H:MM:SS)를 초 단위로 변환
 */
export function parseTimecode(tc: string): number {
  const parts = tc.split(':').map(Number)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return 0
}

/**
 * 씬 길이(초)에 따른 필요 이미지 컷 수 계산
 * 약 3초당 1컷 기준, 최소 1컷 ~ 최대 15컷
 */
export function calculateCutCount(scene: Scene): number {
  const startSec = parseTimecode(scene.timeStart)
  const endSec = parseTimecode(scene.timeEnd)
  const durationSec = Math.max(endSec - startSec, 0)

  if (durationSec <= 0) return 1
  const cuts = Math.ceil(durationSec / 3)
  return Math.max(1, Math.min(cuts, 15))
}

/**
 * 씬 길이(초) 계산
 */
export function getSceneDurationSec(scene: Scene): number {
  return Math.max(parseTimecode(scene.timeEnd) - parseTimecode(scene.timeStart), 0)
}

export function formatDialogues(scene: Scene): string {
  if (!scene.dialogues || scene.dialogues.length === 0) return '(대사 없음)'
  return scene.dialogues
    .map(d => '  ' + d.characterName + ' (' + d.emotion + '): "' + d.line + '" [' + d.direction + ']')
    .join('\n')
}

export function formatDialoguesShort(scene: Scene): string {
  if (!scene.dialogues || scene.dialogues.length === 0) return '(대사 없음)'
  return scene.dialogues
    .map(d => '  ' + d.characterName + ' (' + d.emotion + '): "' + d.line + '"')
    .join('\n')
}

export function formatTransform(scene: Scene): string {
  if (!scene.isAITransformScene || !scene.transform) return ''
  return [
    '\nAI 변환 씬:',
    '  트리거: ' + scene.transform.triggerMoment,
    '  변환 전: ' + scene.transform.stateBefore,
    '  변환 후: ' + scene.transform.stateAfter,
    '  방식: ' + scene.transform.transitionStyle,
    '  소요: ' + scene.transform.duration,
  ].join('\n')
}

export function formatProjectContext(project: Project): string {
  return [
    '작품명: ' + project.title + ' (' + project.titleEn + ')',
    '장르: ' + project.genre.join(', '),
    '타겟 시청자: ' + project.targetAudience,
    '아트 스타일: ' + project.artContext.style,
    '색감: ' + project.artContext.colorPalette.join(', '),
    '무드 키워드: ' + project.artContext.moodKeywords.join(', '),
    '금지 요소: ' + project.artContext.prohibitedElements.join(', '),
    '레퍼런스 작품: ' + project.artContext.referenceWorks.join(', '),
    '화면 비율: ' + project.artContext.aspectRatio,
  ].join('\n')
}

export function formatSceneInfo(scene: Scene, opts?: { includeDialogue?: boolean; includeFull?: boolean }): string {
  const lines = [
    '씬 ' + scene.number + ': ' + scene.title,
    '시간: ' + scene.timeStart + ' ~ ' + scene.timeEnd,
    '장소: ' + scene.location + ' (' + scene.timeOfDay + (scene.weather ? ', ' + scene.weather : '') + ')',
    '카메라 무브먼트: ' + scene.cameraMovement,
    '카메라 앵글: ' + scene.cameraAngle,
    '조명: ' + scene.lighting,
    '색보정: ' + scene.colorGrade,
    '감정 키워드: ' + scene.emotionKeywords.join(', '),
    '배경 묘사: ' + scene.backgroundDescription,
    '액션: ' + scene.actionDescription,
  ]

  if (opts?.includeDialogue !== false) {
    lines.push('대사:')
    lines.push(formatDialogues(scene))
  }

  if (opts?.includeFull !== false) {
    lines.push('사운드: ' + scene.soundDesign)
    lines.push('연출 노트: ' + scene.directorNote)
  }

  const transform = formatTransform(scene)
  if (transform) lines.push(transform)

  return lines.join('\n')
}
