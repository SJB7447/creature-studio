import { Scene, Project, SceneAnalysis, CharacterContext } from '@/types'
import { formatSceneInfo } from './helpers'

export function buildScriptPrompt(
  scene: Scene,
  project: Project,
  analysis: SceneAnalysis,
  characterContext: CharacterContext
): string {
  const sceneInfo = formatSceneInfo(scene)

  return `당신은 20년 경력의 베테랑 애니메이션 감독입니다.

[작품 컨텍스트]
작품명: ${project.title} (${project.titleEn})
장르: ${project.genre.join(', ')}
타겟 시청자: ${project.targetAudience}
아트 스타일: ${project.artContext.style}
색감: ${project.artContext.colorPalette.join(', ')}
무드 키워드: ${project.artContext.moodKeywords.join(', ')}

[씬 분석 결과]
감정 흐름: ${analysis.emotionFlow}
서사적 위치: ${analysis.narrativePosition}
핵심 시각적 순간: ${analysis.keyVisualMoment}
기술 요구사항: ${analysis.technicalRequirements}

[씬 정보]
${sceneInfo}

[등장 캐릭터]
${characterContext.context}

위 씬에 대한 **상세 연출 스크립트**를 작성하세요.

형식:
---
## 씬 ${scene.number} 연출 스크립트: ${scene.title}

### 오프닝 비트
[카메라 포지션] / [캐릭터 위치 및 동작] / [조명/색감]

### 비트 1: (비트 제목)
- 카메라: (포지션, 무브먼트, 앵글)
- 캐릭터 액션: (표정, 몸짓, 동선)
- 대사 연출: (톤, 속도, 강조)
- 조명/색감: (변화 포인트)
- 사운드: (BGM, 효과음, 앰비언스)

### 비트 2: ...
(씬 내용에 맞게 3~6개 비트)

### 클로징 비트
[엔딩 포지션] / [편집 포인트 및 다음 씬 연결]

### 편집 노트
- 컷 연결 방식, 트랜지션, 타이밍 지시
---

한국어 전문 연출 스크립트 형식으로 작성하세요.`
}
