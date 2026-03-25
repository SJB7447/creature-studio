'use client'

import { useRef, useCallback, forwardRef } from 'react'

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

/**
 * 가로 드래그 스크롤이 가능한 div.
 * overflow-x-auto와 함께 사용하세요.
 */
export const DragScrollDiv = forwardRef<HTMLDivElement, Props>(
  ({ children, style, ...props }, forwardedRef) => {
    const innerRef = useRef<HTMLDivElement>(null)
    const isDragging = useRef(false)
    const startX = useRef(0)
    const scrollLeft = useRef(0)

    function getEl() {
      return (forwardedRef as React.RefObject<HTMLDivElement>)?.current ?? innerRef.current
    }

    const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      const el = getEl()
      if (!el) return
      isDragging.current = true
      startX.current = e.pageX - el.offsetLeft
      scrollLeft.current = el.scrollLeft
      el.style.cursor = 'grabbing'
      el.style.userSelect = 'none'
    }, [])

    const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDragging.current) return
      const el = getEl()
      if (!el) return
      e.preventDefault()
      const x = e.pageX - el.offsetLeft
      el.scrollLeft = scrollLeft.current - (x - startX.current) * 1.2
    }, [])

    const stopDrag = useCallback(() => {
      isDragging.current = false
      const el = getEl()
      if (el) {
        el.style.cursor = 'grab'
        el.style.userSelect = ''
      }
    }, [])

    return (
      <div
        ref={forwardedRef ?? innerRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
        style={{ cursor: 'grab', ...style }}
        {...props}
      >
        {children}
      </div>
    )
  }
)

DragScrollDiv.displayName = 'DragScrollDiv'
