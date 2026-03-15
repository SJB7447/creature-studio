'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { NewSceneDialog } from './NewSceneDialog'

export function NewSceneButton({ projectId, episodeId }: { projectId: string; episodeId: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent hover:bg-accent/80 text-white text-sm transition-colors border border-border"
      >
        <Plus className="w-3.5 h-3.5" />
        새 씬
      </button>
      <NewSceneDialog open={open} onClose={() => setOpen(false)} projectId={projectId} episodeId={episodeId} />
    </>
  )
}
