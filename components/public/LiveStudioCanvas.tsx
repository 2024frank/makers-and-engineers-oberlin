'use client'

import { useEffect, useRef } from 'react'

type LiveStudioCanvasProps = {
  variant?: 'hero' | 'subtle'
  className?: string
}

/**
 * High-DPI volumetric studio atmosphere canvas.
 * Renders organic, slowly shifting chiaroscuro lighting with anti-banding
 * film texture and subtle cursor parallax (no grid lines or geometric meshes).
 */
export function LiveStudioCanvas({ variant = 'hero', className }: LiveStudioCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)) return

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    const subtle = variant === 'subtle'
    const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    let reducedMotion = reduceMotionQuery.matches
    let isVisible = true
    let animationFrameId = 0
    let width = 0
    let height = 0

    // Pre-generate tiny monochrome film grain tile so 4K gradients have zero banding
    const grainCanvas = document.createElement('canvas')
    grainCanvas.width = 160
    grainCanvas.height = 160
    const grainCtx = grainCanvas.getContext('2d')
    let grainPattern: CanvasPattern | null = null
    if (grainCtx) {
      const imgData = grainCtx.createImageData(grainCanvas.width, grainCanvas.height)
      const data = imgData.data
      let seed = 1337
      for (let i = 0; i < data.length; i += 4) {
        seed = (seed * 16807) % 2147483647
        const v = seed & 255
        data[i] = v
        data[i + 1] = v
        data[i + 2] = v
        data[i + 3] = 7
      }
      grainCtx.putImageData(imgData, 0, 0)
      grainPattern = ctx.createPattern(grainCanvas, 'repeat')
    }

    const pointer = { x: 0.65, y: 0.42, targetX: 0.65, targetY: 0.42 }

    const resize = () => {
      const rect = container.getBoundingClientRect()
      width = Math.max(320, Math.floor(rect.width))
      height = Math.max(240, Math.floor(rect.height))
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5)
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const drawFrame = (timeMs: number) => {
      const t = reducedMotion ? 1.8 : timeMs * 0.001
      pointer.x += (pointer.targetX - pointer.x) * 0.035
      pointer.y += (pointer.targetY - pointer.y) * 0.035

      ctx.clearRect(0, 0, width, height)

      const maxDim = Math.max(width, height)
      const driftA = Math.sin(t * 0.22) * 0.07
      const driftB = Math.cos(t * 0.17) * 0.06
      const px = (pointer.x - 0.5) * (subtle ? 0.06 : 0.14)
      const py = (pointer.y - 0.5) * (subtle ? 0.05 : 0.11)

      // 1. Deep Oberlin crimson subsurface wash anchored behind studio showcase
      const crimsonX = width * (0.73 + driftA + px)
      const crimsonY = height * (0.44 + driftB + py)
      const crimsonGlow = ctx.createRadialGradient(
        crimsonX,
        crimsonY,
        0,
        crimsonX,
        crimsonY,
        maxDim * (subtle ? 0.72 : 0.64)
      )
      crimsonGlow.addColorStop(0, subtle ? 'rgba(166, 25, 46, 0.28)' : 'rgba(166, 25, 46, 0.34)')
      crimsonGlow.addColorStop(0.42, subtle ? 'rgba(133, 18, 35, 0.12)' : 'rgba(133, 18, 35, 0.15)')
      crimsonGlow.addColorStop(1, 'rgba(10, 11, 13, 0)')
      ctx.fillStyle = crimsonGlow
      ctx.fillRect(0, 0, width, height)

      // 2. Warm studio key lamp diffusion
      const warmX = width * (0.46 - driftB * 0.8 + px * 0.6)
      const warmY = height * (0.22 + driftA * 0.7 + py * 0.5)
      const warmGlow = ctx.createRadialGradient(
        warmX,
        warmY,
        0,
        warmX,
        warmY,
        maxDim * 0.54
      )
      warmGlow.addColorStop(0, subtle ? 'rgba(196, 128, 88, 0.09)' : 'rgba(212, 138, 92, 0.13)')
      warmGlow.addColorStop(0.5, 'rgba(140, 74, 48, 0.04)')
      warmGlow.addColorStop(1, 'rgba(10, 11, 13, 0)')
      ctx.fillStyle = warmGlow
      ctx.fillRect(0, 0, width, height)

      // 3. Cool obsidian-slate shadow depth toward reading side
      const coolX = width * (0.14 + driftB * 0.4)
      const coolY = height * (0.82 - driftA * 0.5)
      const coolGlow = ctx.createRadialGradient(
        coolX,
        coolY,
        0,
        coolX,
        coolY,
        maxDim * 0.62
      )
      coolGlow.addColorStop(0, 'rgba(72, 82, 98, 0.15)')
      coolGlow.addColorStop(0.55, 'rgba(42, 48, 58, 0.05)')
      coolGlow.addColorStop(1, 'rgba(10, 11, 13, 0)')
      ctx.fillStyle = coolGlow
      ctx.fillRect(0, 0, width, height)

      // 4. Subtle photographic film grain texture to prevent 4K gradient banding
      if (grainPattern) {
        ctx.fillStyle = grainPattern
        ctx.fillRect(0, 0, width, height)
      }
    }

    const tick = (timeMs: number) => {
      if (!isVisible || reducedMotion) return
      drawFrame(timeMs)
      animationFrameId = window.requestAnimationFrame(tick)
    }

    const handlePointerMove = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return
      pointer.targetX = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
      pointer.targetY = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
    }

    const handleMotionChange = () => {
      reducedMotion = reduceMotionQuery.matches
      window.cancelAnimationFrame(animationFrameId)
      drawFrame(0)
      if (!reducedMotion && isVisible) {
        animationFrameId = window.requestAnimationFrame(tick)
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry) return
        isVisible = entry.isIntersecting
        window.cancelAnimationFrame(animationFrameId)
        if (isVisible && !reducedMotion) {
          animationFrameId = window.requestAnimationFrame(tick)
        }
      },
      { threshold: 0.01 }
    )

    resize()
    drawFrame(0)

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(container)
    observer.observe(container)

    if (!subtle) {
      window.addEventListener('pointermove', handlePointerMove, { passive: true })
    }
    reduceMotionQuery.addEventListener('change', handleMotionChange)

    if (!reducedMotion) {
      animationFrameId = window.requestAnimationFrame(tick)
    }

    return () => {
      window.cancelAnimationFrame(animationFrameId)
      resizeObserver.disconnect()
      observer.disconnect()
      if (!subtle) {
        window.removeEventListener('pointermove', handlePointerMove)
      }
      reduceMotionQuery.removeEventListener('change', handleMotionChange)
    }
  }, [variant])

  return (
    <div
      ref={containerRef}
      className={className ? `live-studio-canvas ${className}` : 'live-studio-canvas'}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="live-studio-canvas__surface" />
    </div>
  )
}
