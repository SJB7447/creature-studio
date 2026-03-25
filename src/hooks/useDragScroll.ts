'use client'

import { useRef, useCallback } from 'react'

/**
 * 마우스 드래그로 가로 스크롤하는 훅
 * 반환된 ref를 스크롤 컨테이너에 연결하고, handlers를 spread하면 됩니다.
 *
 * <div ref={ref} {...handlers} className="flex overflow-x-auto">
 */
export function useDragScroll() {
  const ref = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const startX = useRef(0)
  const scrollLeft = useRef(0)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const el = ref.current
    if (!el) return
    isDragging.current = true
    startX.current = e.pageX - el.offsetLeft
    scrollLeft.current = el.scrollLeft
    el.style.cursor = 'grabbing'
    el.style.userSelect = 'none'
  }, [])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !ref.current) return
    e.preventDefault()
    const x = e.pageX - ref.current.offsetLeft
    const walk = (x - startX.current) * 1.2
    ref.current.scrollLeft = scrollLeft.current - walk
  }, [])

  const onMouseUp = useCallback(() => {
    isDragging.current = false
    if (ref.current) {
      ref.current.style.cursor = 'grab'
      ref.current.style.userSelect = ''
    }
  }, [])

  const onMouseLeave = useCallback(() => {
    isDragging.current = false
    if (ref.current) {
      ref.current.style.cursor = 'grab'
      ref.current.style.userSelect = ''
    }
  }, [])

  return {
    ref,
    handlers: {
      onMouseDown,
      onMouseMove,
      onMouseUp,
      onMouseLeave,
    },
    // 초기 cursor 스타일 — className과 함께 사용
    dragStyle: { cursor: 'grab' } as React.CSSProperties,
  }
}
