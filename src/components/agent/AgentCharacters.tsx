'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { AgentStep } from '@/types'

// ─── 7명의 에이전트 캐릭터 정의 ──────────────────────────
export interface AgentCharacterDef {
  id: string
  name: string
  role: string
  emoji: string
  color: string        // accent color
  bgColor: string      // background color
  messages: {
    idle: string
    working: string
    done: string
    error: string
  }
}

export const AGENT_CHARACTERS: AgentCharacterDef[] = [
  {
    id: 'analyze',
    name: '하루',
    role: '감정 분석가',
    emoji: '🔍',
    color: '#7C3AED',
    bgColor: '#EDE9FE',
    messages: {
      idle: '씬 분석 대기 중...',
      working: '감정 흐름을 읽고 있어요',
      done: '감정 분석 완료!',
      error: '분석에 문제가 생겼어요',
    },
  },
  {
    id: 'character',
    name: '미르',
    role: '캐릭터 전문가',
    emoji: '🎭',
    color: '#2563EB',
    bgColor: '#DBEAFE',
    messages: {
      idle: '캐릭터 대기 중...',
      working: '캐릭터 정보를 정리하고 있어요',
      done: '캐릭터 컨텍스트 완성!',
      error: '캐릭터 구성에 문제가 생겼어요',
    },
  },
  {
    id: 'script',
    name: '소율',
    role: '연출 작가',
    emoji: '✍️',
    color: '#059669',
    bgColor: '#D1FAE5',
    messages: {
      idle: '스크립트 대기 중...',
      working: '연출 스크립트를 쓰고 있어요',
      done: '스크립트 작성 완료!',
      error: '스크립트 작성에 문제가 생겼어요',
    },
  },
  {
    id: 'image',
    name: '다빈',
    role: '이미지 디자이너',
    emoji: '🎨',
    color: '#D97706',
    bgColor: '#FEF3C7',
    messages: {
      idle: '이미지 프롬프트 대기 중...',
      working: '이미지 프롬프트를 만들고 있어요',
      done: '이미지 프롬프트 완성!',
      error: '이미지 프롬프트에 문제가 생겼어요',
    },
  },
  {
    id: 'video',
    name: '지안',
    role: '영상 디렉터',
    emoji: '🎬',
    color: '#DC2626',
    bgColor: '#FEE2E2',
    messages: {
      idle: '영상 프롬프트 대기 중...',
      working: '영상 프롬프트를 제작 중이에요',
      done: '영상 프롬프트 완성!',
      error: '영상 프롬프트에 문제가 생겼어요',
    },
  },
  {
    id: 'storyboard',
    name: '온유',
    role: '스토리보드 아티스트',
    emoji: '🖼️',
    color: '#0891B2',
    bgColor: '#CFFAFE',
    messages: {
      idle: '스토리보드 대기 중...',
      working: '프레임을 분해하고 있어요',
      done: '스토리보드 완성!',
      error: '스토리보드에 문제가 생겼어요',
    },
  },
  {
    id: 'validate',
    name: '세진',
    role: '품질 검수관',
    emoji: '✅',
    color: '#4F46E5',
    bgColor: '#E0E7FF',
    messages: {
      idle: '검수 대기 중...',
      working: '품질을 검수하고 있어요',
      done: '검수 완료!',
      error: '검수 중 문제가 생겼어요',
    },
  },
]

function getCharacterForStep(stepId: string): AgentCharacterDef | undefined {
  return AGENT_CHARACTERS.find(c => c.id === stepId)
}

// ─── 개별 에이전트 캐릭터 아바타 ──────────────────────────
function AgentAvatar({ char, status, size = 'md' }: {
  char: AgentCharacterDef
  status: 'idle' | 'pending' | 'running' | 'done' | 'error'
  size?: 'sm' | 'md' | 'lg'
}) {
  const sizeMap = { sm: 'w-8 h-8 text-sm', md: 'w-10 h-10 text-lg', lg: 'w-14 h-14 text-2xl' }
  const ringMap = { sm: 'ring-[1.5px]', md: 'ring-2', lg: 'ring-[3px]' }
  const ringColor = status === 'running' ? char.color
    : status === 'done' ? '#059669'
    : status === 'error' ? '#EF4444'
    : 'transparent'

  return (
    <div className="relative">
      <motion.div
        className={`${sizeMap[size]} rounded-full flex items-center justify-center ring ${ringMap[size]} transition-all`}
        style={{
          background: char.bgColor,
          ['--tw-ring-color' as any]: ringColor,
        }}
        animate={status === 'running' ? {
          scale: [1, 1.08, 1],
          transition: { repeat: Infinity, duration: 1.5, ease: 'easeInOut' },
        } : { scale: 1 }}
      >
        <span className={status === 'pending' || status === 'idle' ? 'grayscale opacity-50' : ''}>
          {char.emoji}
        </span>
      </motion.div>

      {/* Status indicator dot */}
      {status !== 'idle' && status !== 'pending' && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center"
          style={{
            background: status === 'running' ? char.color
              : status === 'done' ? '#059669'
              : '#EF4444',
          }}
        >
          {status === 'running' && (
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-white"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
            />
          )}
          {status === 'done' && (
            <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
          {status === 'error' && (
            <span className="text-white text-[8px] font-bold">!</span>
          )}
        </motion.div>
      )}
    </div>
  )
}

// ─── 에이전트 크루 패널 (전체 상태 요약) ──────────────────
export function AgentCrewPanel({ steps, isRunning }: {
  steps: AgentStep[]
  isRunning: boolean
}) {
  if (steps.length === 0 && !isRunning) return null

  const activeStep = steps.find(s => s.status === 'running')
  const activeChar = activeStep ? getCharacterForStep(activeStep.id) : null
  const doneCount = steps.filter(s => s.status === 'done').length
  const errorCount = steps.filter(s => s.status === 'error').length
  const totalSteps = steps.length || 7

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      {/* Crew avatar row */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>에이전트 크루</span>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{
            background: errorCount > 0 ? '#FEE2E2' : doneCount === totalSteps ? '#D1FAE5' : '#EDE9FE',
            color: errorCount > 0 ? '#EF4444' : doneCount === totalSteps ? '#059669' : 'var(--color-primary-dark)',
          }}>
            {errorCount > 0 ? `${errorCount}개 오류` : doneCount === totalSteps ? '모두 완료' : isRunning ? `${doneCount}/${totalSteps} 진행 중` : `${doneCount}/${totalSteps} 완료`}
          </span>
        </div>

        {/* Character row */}
        <div className="flex items-center gap-1">
          {AGENT_CHARACTERS.map((char, i) => {
            const step = steps.find(s => s.id === char.id)
            const status = step?.status || (isRunning ? 'pending' : 'idle')
            return (
              <div key={char.id} className="flex flex-col items-center flex-1 min-w-0">
                <AgentAvatar char={char} status={status} size="sm" />
                <span className="text-[9px] mt-1 truncate w-full text-center" style={{
                  color: status === 'running' ? char.color
                    : status === 'done' ? '#059669'
                    : status === 'error' ? '#EF4444'
                    : 'var(--color-text-sub)',
                  fontWeight: status === 'running' ? 600 : 400,
                }}>
                  {char.name}
                </span>
              </div>
            )
          })}
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-2)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: errorCount > 0 ? '#EF4444' : 'var(--color-primary-dark)' }}
            initial={{ width: '0%' }}
            animate={{ width: `${(doneCount / totalSteps) * 100}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Active agent speech bubble */}
      <AnimatePresence mode="wait">
        {activeChar && activeStep && (
          <motion.div
            key={activeChar.id}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="px-4 py-2.5 border-t flex items-center gap-3"
            style={{ background: activeChar.bgColor + '40', borderColor: 'var(--color-border)' }}
          >
            <AgentAvatar char={activeChar} status="running" size="md" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold" style={{ color: activeChar.color }}>{activeChar.name}</span>
                <span className="text-[10px]" style={{ color: 'var(--color-text-sub)' }}>{activeChar.role}</span>
              </div>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text)' }}>
                {activeChar.messages.working}
              </p>
            </div>
            <motion.div
              className="flex gap-0.5"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
            >
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: activeChar.color }}
                  animate={{ y: [0, -3, 0] }}
                  transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }}
                />
              ))}
            </motion.div>
          </motion.div>
        )}

        {/* Error agent bubble */}
        {!activeStep && errorCount > 0 && (() => {
          const errorStep = steps.find(s => s.status === 'error')
          const errorChar = errorStep ? getCharacterForStep(errorStep.id) : null
          if (!errorChar || !errorStep) return null
          return (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-4 py-2.5 border-t flex items-center gap-3"
              style={{ background: '#FEF2F2', borderColor: '#FECACA' }}
            >
              <AgentAvatar char={errorChar} status="error" size="md" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-red-500">{errorChar.name}</span>
                  <span className="text-[10px] text-red-400">{errorChar.role}</span>
                </div>
                <p className="text-[11px] mt-0.5 text-red-600">
                  {errorChar.messages.error} {errorStep.error ? `— ${errorStep.error}` : ''}
                </p>
              </div>
            </motion.div>
          )
        })()}

        {/* Completed state */}
        {!activeStep && errorCount === 0 && doneCount === totalSteps && (
          <motion.div
            key="done"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-4 py-2.5 border-t flex items-center gap-3"
            style={{ background: '#F0FDF4', borderColor: '#BBF7D0' }}
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ background: '#D1FAE5' }}>
              🎉
            </div>
            <div className="flex-1">
              <span className="text-xs font-semibold" style={{ color: '#059669' }}>모든 에이전트 작업 완료!</span>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-sub)' }}>결과를 탭에서 확인하고, 피드백으로 재생성할 수 있어요.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── 에이전트 스텝 아이템 (캐릭터 포함) ──────────────────
export function AgentStepItem({ step, index }: { step: AgentStep; index: number }) {
  const char = getCharacterForStep(step.id)
  if (!char) return null

  return (
    <div
      className="flex items-center gap-2.5 py-2 px-3 rounded-lg transition-all"
      style={{
        background: step.status === 'running' ? char.bgColor + '60' : undefined,
      }}
    >
      <AgentAvatar char={char} status={step.status} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold" style={{
            color: step.status === 'running' ? char.color
              : step.status === 'done' ? '#059669'
              : step.status === 'error' ? '#EF4444'
              : 'var(--color-text-sub)',
          }}>
            {char.name}
          </span>
          <span className="text-[10px]" style={{ color: 'var(--color-text-sub)' }}>
            {char.role}
          </span>
        </div>
        <p className="text-[10px] truncate" style={{
          color: step.status === 'running' ? char.color
            : step.status === 'done' ? '#059669'
            : step.status === 'error' ? '#EF4444'
            : 'var(--color-text-sub)',
        }}>
          {step.status === 'running' ? char.messages.working
            : step.status === 'done' ? char.messages.done
            : step.status === 'error' ? (step.error || char.messages.error)
            : char.messages.idle}
        </p>
      </div>
      {step.status === 'done' && step.result && (
        <span className="text-[10px] shrink-0 max-w-24 truncate" style={{ color: 'var(--color-text-sub)' }}>{step.result}</span>
      )}
    </div>
  )
}
