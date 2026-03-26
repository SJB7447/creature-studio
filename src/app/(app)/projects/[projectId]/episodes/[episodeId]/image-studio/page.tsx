'use client'

import { use } from 'react'
import { ImageStudioMain } from '@/components/image-studio/ImageStudioMain'

export default function ImageStudioPage({
  params,
}: {
  params: Promise<{ projectId: string; episodeId: string }>
}) {
  const { projectId, episodeId } = use(params)
  return <ImageStudioMain projectId={projectId} episodeId={episodeId} />
}
