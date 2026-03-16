'use client'

import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createScene } from '@/lib/firestore'
import { toast } from 'sonner'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface FormData {
  number: number
  title: string
  location: string
  timeStart: string
  timeEnd: string
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night' | 'interior'
  cameraMovement: 'static' | 'pan' | 'tilt' | 'zoom_in' | 'zoom_out' | 'tracking' | 'crane'
  cameraAngle: 'eye_level' | 'high_angle' | 'low_angle' | 'birds_eye' | 'dutch'
  lighting: string
  colorGrade: string
  emotionKeywords: string
  backgroundDescription: string
  actionDescription: string
  soundDesign: string
  directorNote: string
  isAITransformScene: boolean
}

export function NewSceneDialog({ open, onClose, projectId, episodeId }: {
  open: boolean
  onClose: () => void
  projectId: string
  episodeId: string
}) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, reset, watch } = useForm<FormData>({
    defaultValues: {
      number: 1,
      timeOfDay: 'morning',
      cameraMovement: 'static',
      cameraAngle: 'eye_level',
      isAITransformScene: false,
    }
  })

  const isTransform = watch('isAITransformScene')

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return createScene(projectId, episodeId, {
        episodeId,
        projectId,
        number: Number(data.number),
        title: data.title,
        timeStart: data.timeStart,
        timeEnd: data.timeEnd,
        location: data.location,
        timeOfDay: data.timeOfDay,
        characters: [],
        cameraMovement: data.cameraMovement,
        cameraAngle: data.cameraAngle,
        lighting: data.lighting,
        colorGrade: data.colorGrade,
        emotionKeywords: data.emotionKeywords.split(',').map(k => k.trim()).filter(Boolean),
        backgroundDescription: data.backgroundDescription,
        actionDescription: data.actionDescription,
        dialogues: [],
        soundDesign: data.soundDesign,
        directorNote: data.directorNote,
        isAITransformScene: data.isAITransformScene,
        assets: {},
        status: 'draft',
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenes', projectId, episodeId] })
      toast.success('씬이 생성되었습니다!')
      reset()
      onClose()
    },
    onError: (e: any) => toast.error('생성 실패: ' + e.message),
  })

  if (!open) return null

  const inputStyle = { background: 'var(--color-surface-2)', borderColor: 'var(--color-border)', color: 'var(--color-text)', borderWidth: '1px' as const, borderStyle: 'solid' as const }
  const inputCls = "w-full px-3 py-2 rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:border-purple-500"
  const selectCls = "w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-purple-500"
  const labelStyle = { color: 'var(--color-text-sub)' }
  const labelCls = "block text-xs mb-1.5"

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative z-10 w-full max-w-2xl mx-4 border border-border rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
          style={{ background: 'var(--color-surface)' }}
        >
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h2 className="font-semibold" style={{ color: 'var(--color-text)' }}>새 씬 추가</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent">
              <X className="w-4 h-4" style={{ color: 'var(--color-text-sub)' }} />
            </button>
          </div>

          <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="p-5 space-y-4">
            {/* Basic */}
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className={labelCls} style={labelStyle}>씬 번호</label>
                <input type="number" {...register('number', { min: 1 })} className={inputCls} style={inputStyle} />
              </div>
              <div className="col-span-3">
                <label className={labelCls} style={labelStyle}>씬 제목 *</label>
                <input {...register('title', { required: true })} placeholder="병원 입구 — 사자 등장" className={inputCls} style={inputStyle} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls} style={labelStyle}>장소</label>
                <input {...register('location')} placeholder="병원 대기실" className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className={labelCls} style={labelStyle}>시작 시간</label>
                <input {...register('timeStart')} placeholder="00:00" className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className={labelCls} style={labelStyle}>종료 시간</label>
                <input {...register('timeEnd')} placeholder="00:30" className={inputCls} style={inputStyle} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls} style={labelStyle}>시간대</label>
                <select {...register('timeOfDay')} className={selectCls} style={inputStyle}>
                  <option value="morning">아침</option>
                  <option value="afternoon">낮</option>
                  <option value="evening">저녁</option>
                  <option value="night">밤</option>
                  <option value="interior">실내</option>
                </select>
              </div>
              <div>
                <label className={labelCls} style={labelStyle}>카메라 무브</label>
                <select {...register('cameraMovement')} className={selectCls} style={inputStyle}>
                  <option value="static">고정</option>
                  <option value="pan">팬</option>
                  <option value="tilt">틸트</option>
                  <option value="zoom_in">줌인</option>
                  <option value="zoom_out">줌아웃</option>
                  <option value="tracking">트래킹</option>
                  <option value="crane">크레인</option>
                </select>
              </div>
              <div>
                <label className={labelCls} style={labelStyle}>카메라 앵글</label>
                <select {...register('cameraAngle')} className={selectCls} style={inputStyle}>
                  <option value="eye_level">아이레벨</option>
                  <option value="high_angle">하이앵글</option>
                  <option value="low_angle">로우앵글</option>
                  <option value="birds_eye">조감</option>
                  <option value="dutch">더치앵글</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} style={labelStyle}>조명</label>
                <input {...register('lighting')} placeholder="부드러운 자연광" className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className={labelCls} style={labelStyle}>색보정</label>
                <input {...register('colorGrade')} placeholder="웜 톤, 파스텔" className={inputCls} style={inputStyle} />
              </div>
            </div>

            <div>
              <label className={labelCls} style={labelStyle}>감정 키워드 (쉼표 구분)</label>
              <input {...register('emotionKeywords')} placeholder="슬픔, 억눌림, 해소" className={inputCls} style={inputStyle} />
            </div>

            <div>
              <label className={labelCls} style={labelStyle}>배경 묘사</label>
              <textarea {...register('backgroundDescription')} rows={2} placeholder="배경 상세 묘사..." className={`${inputCls} resize-none`} style={inputStyle} />
            </div>

            <div>
              <label className={labelCls} style={labelStyle}>액션 (화면 지문)</label>
              <textarea {...register('actionDescription')} rows={2} placeholder="씬에서 일어나는 일..." className={`${inputCls} resize-none`} style={inputStyle} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} style={labelStyle}>사운드 디자인</label>
                <input {...register('soundDesign')} placeholder="잔잔한 피아노 BGM..." className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className={labelCls} style={labelStyle}>연출 노트</label>
                <input {...register('directorNote')} placeholder="감독 주요 의도..." className={inputCls} style={inputStyle} />
              </div>
            </div>

            {/* AI Transform Toggle */}
            <div className="flex items-center gap-3 p-3 rounded-lg border border-purple-500/30 bg-purple-500/5">
              <input type="checkbox" {...register('isAITransformScene')} id="isTransform"
                className="w-4 h-4 rounded border-purple-500 accent-purple-600" />
              <label htmlFor="isTransform" className="text-sm cursor-pointer" style={{ color: 'var(--color-text)' }}>
                AI 변환 씬 (클레이 세계 → 현실 등 특수 변환)
              </label>
            </div>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 rounded-lg border border-border hover:bg-accent text-sm transition-colors"
                style={{ color: 'var(--color-text-sub)' }}
              >취소</button>
              <button type="submit" disabled={createMutation.isPending}
                className="flex-1 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-sm transition-colors disabled:opacity-60"
              >{createMutation.isPending ? '생성 중...' : '씬 생성'}</button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
