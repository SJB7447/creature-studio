'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { NewProjectDialog } from './NewProjectDialog'

export function NewProjectButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors"
      >
        <Plus className="w-4 h-4" />
        새 프로젝트
      </button>
      <NewProjectDialog open={open} onClose={() => setOpen(false)} />
    </>
  )
}
