'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, LayoutDashboard, Film, Users, Settings, Library, Download,
  Clapperboard, Zap, Bot, Lock, FolderOpen, ChevronRight, BookOpen,
  Camera, Layers, Sparkles, Share2, Crown, ImageIcon, Video,
} from 'lucide-react'

interface Topic {
  id: string
  icon: React.ElementType
  label: string
  color: string
  bg: string
  sections: {
    title: string
    content: string
    tips?: string[]
  }[]
}

const TOPICS: Topic[] = [
  {
    id: 'overview',
    icon: BookOpen,
    label: '시작하기',
    color: '#7C3AED',
    bg: '#EDE9FE',
    sections: [
      {
        title: 'CreatureStudio란?',
        content: 'CreatureStudio는 애니메이션·영화·단편 등의 영상 작품을 기획·제작하기 위한 AI 기반 프로덕션 관리 도구입니다. 에피소드와 씬을 구성하고, AI 에이전트가 연출 스크립트·이미지 프롬프트·영상 프롬프트·스토리보드를 자동 생성해줍니다.',
        tips: [
          '대시보드 → 새 프로젝트 → 에피소드 → 씬 → AI 에이전트 순서로 진행하세요.',
          '여러 사람과 함께 작업하려면 프로젝트 설정 > 팀 멤버에서 초대하세요.',
        ],
      },
      {
        title: '기본 작업 흐름',
        content: '① 프로젝트 생성 (작품명, 장르, 아트 스타일 설정) → ② 에피소드 추가 → ③ 씬 추가 (장소, 카메라, 감정 등 입력) → ④ AI 에이전트 실행 → ⑤ 생성된 에셋 저장 → ⑥ 라이브러리에서 프롬프트 활용',
        tips: [
          '씬 정보를 구체적으로 채울수록 AI가 더 정확한 결과를 생성합니다.',
          '확정 에셋(캐릭터 이미지 등)을 먼저 등록하면 모든 씬에서 일관된 비주얼을 유지할 수 있습니다.',
        ],
      },
    ],
  },
  {
    id: 'dashboard',
    icon: LayoutDashboard,
    label: '대시보드',
    color: '#7C3AED',
    bg: '#EDE9FE',
    sections: [
      {
        title: '통계 카드',
        content: '상단의 4개 통계 카드(전체 프로젝트·제작 중·공유 프로젝트·이번 주 업데이트)를 클릭하면 해당 조건의 프로젝트만 필터링됩니다. 같은 카드를 다시 클릭하면 전체 보기로 돌아옵니다.',
        tips: ['이미 활성화된 필터 카드를 한 번 더 누르면 해제됩니다.'],
      },
      {
        title: '프로젝트 필터',
        content: '통계 카드 아래 상태 버튼(개발 중·프리프로덕션·제작 중·후반 작업·완성)으로 프로젝트를 상태별로 필터링할 수 있습니다. 검색창에서 제목·장르로 검색도 가능합니다.',
      },
    ],
  },
  {
    id: 'project',
    icon: FolderOpen,
    label: '프로젝트',
    color: '#2563EB',
    bg: '#DBEAFE',
    sections: [
      {
        title: '프로젝트 생성',
        content: '새 프로젝트를 만들 때 작품명, 장르, 타겟 시청자, 아트 스타일, 색감 팔레트, 무드 키워드, 금지 요소 등을 입력합니다. 이 정보는 AI 에이전트가 모든 씬의 프롬프트를 생성할 때 기준으로 사용됩니다.',
        tips: [
          '아트 스타일은 "3D 클레이 렌더, 부드러운 파스텔 톤" 처럼 구체적으로 입력하세요.',
          '금지 요소를 명확히 입력하면 AI가 원치 않는 비주얼을 자동으로 피합니다.',
          '레퍼런스 작품(코코멜론, 블루이 등)을 입력하면 스타일 일관성이 높아집니다.',
        ],
      },
      {
        title: '프로젝트 설정',
        content: '사이드바 하단 "설정" 메뉴에서 프로젝트 기본 정보, 아트 컨텍스트, 제작 정보를 수정할 수 있습니다. 팀 멤버 섹션에서 협업자 초대·관리도 가능합니다.',
      },
    ],
  },
  {
    id: 'episode-scene',
    icon: Film,
    label: '에피소드·씬',
    color: '#059669',
    bg: '#D1FAE5',
    sections: [
      {
        title: '에피소드 구성',
        content: '프로젝트 내에서 에피소드를 만들어 작품을 회차별로 관리합니다. 각 에피소드에는 번호, 제목, 핵심 감정, 시놉시스, 러닝타임이 있습니다.',
      },
      {
        title: '씬 구성',
        content: '에피소드 안에 씬을 추가합니다. 씬마다 다음 정보를 입력합니다:\n• 시간 범위 (타임코드: MM:SS)\n• 장소·시간대·날씨\n• 카메라 무브먼트·앵글\n• 조명·색보정\n• 감정 키워드\n• 배경 묘사·액션\n• 대사 (캐릭터·감정·연출 방향)\n• 사운드 디자인',
        tips: [
          '씬 길이(타임코드 범위)에 따라 AI가 자동으로 컷 수를 계산합니다 (약 3초당 1컷).',
          '대사에 감정과 연출 방향까지 입력하면 연출 스크립트 품질이 올라갑니다.',
        ],
      },
    ],
  },
  {
    id: 'ai-transform',
    icon: Zap,
    label: 'AI 변환 씬',
    color: '#7C3AED',
    bg: '#EDE9FE',
    sections: [
      {
        title: 'AI 변환 씬이란?',
        content: '씬 안에서 마법·변신·환상 등 시각적 변환이 일어나는 특수 씬을 위한 기능입니다. 씬 편집 하단의 "AI 변환 씬 활성화" 토글을 켜면 추가 필드가 나타납니다.',
      },
      {
        title: '입력 필드',
        content: '• 변환 트리거 순간: 변환이 시작되는 장면 묘사 (예: "도티가 마법봉을 흔드는 순간")\n• 변환 전: 변환 이전 상태 (예: "평범한 고양이 외형")\n• 변환 후: 변환 이후 상태 (예: "빛나는 마법사 고양이")\n• 변환 방식: 전환 스타일 (예: "파티클 폭발 → 형태 재구성")\n• 소요 시간: 변환에 걸리는 시간 (예: "2초")',
        tips: [
          'AI 에이전트는 변환 씬에서 변환 전·중·후를 스토리보드의 핵심 프레임으로 자동 배치합니다.',
          '이미지 프롬프트는 변환 후 상태를 중심으로, 영상 프롬프트는 변환 과정 전체를 시퀀스로 생성합니다.',
        ],
      },
    ],
  },
  {
    id: 'agent',
    icon: Bot,
    label: 'AI 에이전트',
    color: '#7C3AED',
    bg: '#EDE9FE',
    sections: [
      {
        title: 'SceneDirector Agent',
        content: '씬 에디터에서 "AI 에이전트" 탭을 선택하고 실행하면 7단계 파이프라인이 순차적으로 동작합니다. 씬 정보·프로젝트 아트 컨텍스트·캐릭터·확정 에셋을 종합해 다음을 자동 생성합니다.',
      },
      {
        title: '7단계 파이프라인',
        content: '① 씬 감정 흐름 분석\n② 캐릭터 컨텍스트 구성\n③ 연출 스크립트 작성\n④ 스토리보드 프레임 분해 (연출 스크립트 기반)\n⑤ 이미지 프롬프트 생성 — 컷별, 스토리보드 카메라 지시 반영\n⑥ 영상 프롬프트 생성 — 컷별 (Veo 2 / Sora / Runway)\n⑦ 품질 검증 및 정제',
        tips: [
          '스토리보드가 먼저 생성되므로, 이미지·영상 프롬프트는 스토리보드의 카메라 지시와 레이아웃을 그대로 반영합니다.',
          '연출 스크립트의 감정 톤은 영상 프롬프트 전 컷에 일관되게 유지됩니다.',
          '생성 완료 후 반드시 "에셋 저장" 버튼을 눌러야 Firestore에 저장됩니다.',
        ],
      },
      {
        title: '단일 스텝 재생성',
        content: '씬 에디터의 각 에셋 탭(연출 스크립트·이미지·영상·스토리보드)에서 개별 스텝만 다시 생성할 수 있습니다. 전체 에이전트를 다시 돌리지 않고 원하는 항목만 수정할 때 사용하세요.',
      },
    ],
  },
  {
    id: 'storyboard',
    icon: Layers,
    label: '스토리보드',
    color: '#0891B2',
    bg: '#CFFAFE',
    sections: [
      {
        title: '스토리보드 뷰어',
        content: '에피소드 상단의 "스토리보드" 버튼을 누르면 해당 에피소드 전체의 씬·컷별 스토리보드를 한눈에 볼 수 있습니다. 각 프레임에는 장면 묘사·카메라 지시·화면 레이아웃이 표시됩니다.',
        tips: [
          '스토리보드 프레임은 씬 길이(타임코드)에 따라 자동으로 컷 수가 결정됩니다.',
          '스토리보드를 먼저 생성하면 이미지·영상 프롬프트의 구도가 스토리보드 카메라 지시와 일치하게 됩니다.',
        ],
      },
    ],
  },
  {
    id: 'prompts',
    icon: ImageIcon,
    label: '이미지·영상 프롬프트',
    color: '#2563EB',
    bg: '#DBEAFE',
    sections: [
      {
        title: '이미지 프롬프트 (컷별)',
        content: '씬의 각 컷마다 Midjourney v6·Google Imagen 3 최적화 프롬프트가 생성됩니다. 스토리보드의 카메라 지시와 레이아웃을 반영하므로 이미지와 스토리보드의 구도가 일치합니다.',
        tips: [
          '확정 에셋에 캐릭터 비주얼 키워드를 등록해두면 모든 컷에 자동 반영됩니다.',
          '네거티브 프롬프트에는 프로젝트의 금지 요소가 자동으로 포함됩니다.',
        ],
      },
      {
        title: '영상 프롬프트 (컷별)',
        content: '씬의 각 컷마다 Veo 2·Sora·Runway Gen-3 Alpha에 최적화된 프롬프트가 생성됩니다. 스토리보드 카메라 지시를 영문 무브먼트 키워드로 변환하여 반영합니다.',
        tips: [
          'Veo: 시네마틱 카메라워크와 분위기 묘사에 강합니다.',
          'Sora: 복잡한 물리 시뮬레이션과 긴 장면에 강합니다.',
          'Runway: 짧은 모션과 스타일 전이에 강합니다.',
        ],
      },
    ],
  },
  {
    id: 'library',
    icon: Library,
    label: '라이브러리',
    color: '#D97706',
    bg: '#FEF3C7',
    sections: [
      {
        title: '프롬프트 라이브러리',
        content: '프로젝트 내 모든 씬에서 생성된 에셋(연출 스크립트·이미지 프롬프트·영상 프롬프트·스토리보드)을 한 곳에서 검색·필터·복사할 수 있습니다.',
        tips: [
          '에피소드·타입·플랫폼별로 필터링하여 원하는 프롬프트만 볼 수 있습니다.',
          '별표(즐겨찾기)를 눌러 자주 쓰는 프롬프트를 표시해두세요.',
        ],
      },
      {
        title: '내보내기',
        content: '"전체 내보내기" 버튼으로 현재 필터 결과를 다음 형식으로 내보낼 수 있습니다:\n• Markdown (.md) — 에피소드/씬 구조 유지\n• JSON — 구조화 데이터\n• TXT — 플랫폼별 파일 분리 (Midjourney.txt, Veo2.txt 등)',
      },
    ],
  },
  {
    id: 'assets',
    icon: Lock,
    label: '확정 에셋',
    color: '#059669',
    bg: '#D1FAE5',
    sections: [
      {
        title: '확정 에셋이란?',
        content: '캐릭터·배경·소품·이펙트 등 최종 확정된 비주얼 에셋을 프로젝트에 등록하는 기능입니다. 등록된 에셋의 비주얼 키워드는 AI 에이전트가 모든 씬의 프롬프트를 생성할 때 최우선으로 반영합니다.',
        tips: [
          '캐릭터 확정 에셋에 프롬프트 키워드를 상세히 입력할수록 씬 간 비주얼 일관성이 높아집니다.',
          '이미 AI로 생성한 이미지를 확정 에셋으로 업로드하고 프롬프트를 기록해두면 동일한 외형을 재현하기 쉽습니다.',
        ],
      },
      {
        title: '에셋 카테고리',
        content: '• 캐릭터: 외형 키워드·프롬프트 저장\n• 배경: 장소·분위기 비주얼 에셋\n• 소품: 오브젝트 에셋\n• 이펙트: 특수효과 에셋\n• 사운드: 음향 에셋',
      },
    ],
  },
  {
    id: 'characters',
    icon: Users,
    label: '캐릭터',
    color: '#2563EB',
    bg: '#DBEAFE',
    sections: [
      {
        title: '캐릭터 관리',
        content: '프로젝트의 등장인물을 관리합니다. 각 캐릭터에는 이름·역할·외형 베이스·스타일 키워드·색상 체계·고정 프롬프트 키워드를 등록합니다. 등록된 캐릭터는 씬 편집 시 등장인물로 선택할 수 있습니다.',
        tips: [
          '고정 프롬프트 키워드는 AI가 이 캐릭터가 등장하는 모든 씬의 이미지 프롬프트에 자동으로 포함합니다.',
          '감정 변형(EmotionVariant)을 등록하면 씬의 감정 상태에 따라 외형 변화를 프롬프트에 반영할 수 있습니다.',
        ],
      },
    ],
  },
  {
    id: 'collaboration',
    icon: Share2,
    label: '팀 협업',
    color: '#2563EB',
    bg: '#DBEAFE',
    sections: [
      {
        title: '초대 & 권한',
        content: '프로젝트 설정 > 팀 멤버에서 이메일로 팀원을 초대할 수 있습니다. 권한은 두 가지입니다:\n• 소유자: 모든 권한 (초대·설정 변경·삭제)\n• 편집자: 씬·에피소드 편집 가능',
        tips: [
          '초대받은 팀원은 헤더 오른쪽 벨(🔔) 알림에서 초대를 수락·거절할 수 있습니다.',
          '초대가 수락되면 대시보드 프로젝트 카드에 "공유됨" 배지가 표시됩니다.',
        ],
      },
      {
        title: '소유권 이전',
        content: '소유자가 팀 멤버 목록에서 편집자 옆의 ↔ 버튼을 클릭하면 소유권을 이전할 수 있습니다. 이전 후 기존 소유자는 편집자로 변경됩니다.',
        tips: ['소유권 이전 시 해당 편집자는 자동으로 협업자 목록에서 제거되고 소유자로 승격됩니다.'],
      },
    ],
  },
]

interface Props {
  open: boolean
  onClose: () => void
}

export function HelpModal({ open, onClose }: Props) {
  const [activeTopic, setActiveTopic] = useState(TOPICS[0].id)
  const topic = TOPICS.find(t => t.id === activeTopic)!

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-4 sm:inset-8 lg:inset-16 z-50 flex flex-col rounded-2xl border overflow-hidden shadow-2xl"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', maxHeight: 'calc(100vh - 4rem)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#EDE9FE' }}>
                  <BookOpen className="w-4 h-4" style={{ color: '#7C3AED' }} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>CreatureStudio 도움말</h2>
                  <p className="text-xs" style={{ color: 'var(--color-text-sub)' }}>기능 설명 및 사용 가이드</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:opacity-70 transition-opacity"
                style={{ color: 'var(--color-text-sub)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex flex-1 min-h-0">
              {/* Sidebar */}
              <div className="w-44 sm:w-52 border-r shrink-0 overflow-y-auto py-2" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)' }}>
                {TOPICS.map(t => {
                  const isActive = t.id === activeTopic
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveTopic(t.id)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors text-sm"
                      style={{
                        background: isActive ? 'var(--color-surface)' : 'transparent',
                        color: isActive ? t.color : 'var(--color-text-sub)',
                        fontWeight: isActive ? 600 : 400,
                        borderRight: isActive ? `2px solid ${t.color}` : '2px solid transparent',
                      }}
                    >
                      <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: isActive ? t.bg : 'transparent' }}>
                        <t.icon className="w-3.5 h-3.5" style={{ color: isActive ? t.color : 'var(--color-text-sub)' }} />
                      </div>
                      {t.label}
                    </button>
                  )
                })}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTopic}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.14 }}
                    className="space-y-5 max-w-2xl"
                  >
                    {/* Topic header */}
                    <div className="flex items-center gap-3 pb-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: topic.bg }}>
                        <topic.icon className="w-5 h-5" style={{ color: topic.color }} />
                      </div>
                      <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>{topic.label}</h3>
                    </div>

                    {/* Sections */}
                    {topic.sections.map((section, i) => (
                      <div key={i} className="space-y-2">
                        <h4 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{section.title}</h4>
                        <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--color-text-sub)' }}>
                          {section.content}
                        </p>
                        {section.tips && section.tips.length > 0 && (
                          <div className="mt-3 p-3 rounded-xl space-y-1.5" style={{ background: topic.bg }}>
                            {section.tips.map((tip, j) => (
                              <div key={j} className="flex items-start gap-2">
                                <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: topic.color }} />
                                <p className="text-xs leading-relaxed" style={{ color: topic.color }}>{tip}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t flex items-center justify-between shrink-0" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)' }}>
              <p className="text-xs" style={{ color: 'var(--color-text-sub)' }}>
                {TOPICS.findIndex(t => t.id === activeTopic) + 1} / {TOPICS.length}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const idx = TOPICS.findIndex(t => t.id === activeTopic)
                    if (idx > 0) setActiveTopic(TOPICS[idx - 1].id)
                  }}
                  disabled={TOPICS.findIndex(t => t.id === activeTopic) === 0}
                  className="px-3 py-1.5 rounded-lg text-xs border transition-colors disabled:opacity-30"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-sub)' }}
                >
                  이전
                </button>
                <button
                  onClick={() => {
                    const idx = TOPICS.findIndex(t => t.id === activeTopic)
                    if (idx < TOPICS.length - 1) setActiveTopic(TOPICS[idx + 1].id)
                    else onClose()
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs text-white transition-colors"
                  style={{ background: topic.color }}
                >
                  {TOPICS.findIndex(t => t.id === activeTopic) < TOPICS.length - 1 ? '다음' : '닫기'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
