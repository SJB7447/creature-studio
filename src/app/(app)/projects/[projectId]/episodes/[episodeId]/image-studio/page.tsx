'use client'

import { useParams } from 'next/navigation'
import { ImageStudioMain } from '@/components/image-studio/ImageStudioMain'

export default function ImageStudioPage() {
  const { projectId, episodeId } = useParams<{ projectId: string; episodeId: string }>()
  return <ImageStudioMain projectId={projectId} episodeId={episodeId} />
}
