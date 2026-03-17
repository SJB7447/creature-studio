'use client'

import { useState, useRef } from 'react'
import { Camera, Loader2, X, Lock } from 'lucide-react'
import { toast } from 'sonner'

interface ProfileImageUploadProps {
  currentImage?: string
  onUpload: (file: File) => Promise<string>
  onRemove?: () => void
  size?: 'sm' | 'md' | 'lg'
  shape?: 'circle' | 'rounded'
  label?: string
  confirmed?: boolean
}

const SIZE_MAP = {
  sm: { container: 'w-16 h-16', icon: 'w-4 h-4', badge: 'w-5 h-5' },
  md: { container: 'w-24 h-24', icon: 'w-5 h-5', badge: 'w-6 h-6' },
  lg: { container: 'w-32 h-32', icon: 'w-6 h-6', badge: 'w-7 h-7' },
}

export default function ProfileImageUpload({
  currentImage,
  onUpload,
  onRemove,
  size = 'md',
  shape = 'circle',
  label,
  confirmed = false,
}: ProfileImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const s = SIZE_MAP[size]
  const borderRadius = shape === 'circle' ? 'rounded-full' : 'rounded-xl'

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드 가능합니다.')
      return
    }

    // Preview
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target?.result as string)
    reader.readAsDataURL(file)

    setUploading(true)
    try {
      await onUpload(file)
      toast.success('프로필 이미지가 업로드되었습니다!')
    } catch (err: any) {
      toast.error('업로드 실패: ' + err.message)
      setPreview(null)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const displayImage = preview || currentImage

  return (
    <div className="flex flex-col items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".png,.jpg,.jpeg,.webp"
        onChange={handleFile}
      />

      <div className="relative group">
        <div
          className={`${s.container} ${borderRadius} overflow-hidden border-2 cursor-pointer transition-all hover:border-purple-400 flex items-center justify-center`}
          style={{
            borderColor: confirmed ? '#10B981' : 'var(--color-border)',
            background: displayImage ? 'transparent' : 'var(--color-surface-2)',
          }}
          onClick={() => !uploading && inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className={`${s.icon} animate-spin`} style={{ color: 'var(--color-primary-dark)' }} />
          ) : displayImage ? (
            <img src={displayImage} alt="profile" className="w-full h-full object-cover" />
          ) : (
            <Camera className={s.icon} style={{ color: 'var(--color-text-sub)' }} />
          )}

          {/* Hover overlay */}
          {!uploading && displayImage && (
            <div className={`absolute inset-0 ${borderRadius} bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center`}>
              <Camera className={s.icon} style={{ color: 'white' }} />
            </div>
          )}
        </div>

        {/* Confirmed badge */}
        {confirmed && (
          <div
            className={`absolute -bottom-1 -right-1 ${s.badge} rounded-full flex items-center justify-center border-2`}
            style={{ background: '#10B981', borderColor: 'var(--color-surface)' }}
            title="확정된 디자인"
          >
            <Lock className="w-3 h-3 text-white" />
          </div>
        )}

        {/* Remove button */}
        {displayImage && onRemove && !uploading && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
              setPreview(null)
            }}
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <X className="w-3 h-3" style={{ color: 'var(--color-text-sub)' }} />
          </button>
        )}
      </div>

      {label && (
        <span className="text-[10px] text-center" style={{ color: confirmed ? '#10B981' : 'var(--color-text-sub)' }}>
          {confirmed ? '확정됨' : label}
        </span>
      )}
    </div>
  )
}
