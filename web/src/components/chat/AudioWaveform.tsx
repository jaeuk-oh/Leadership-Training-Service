'use client'

import { useEffect, useRef } from 'react'

export default function AudioWaveform() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const bars = 40
      const barWidth = canvas.width / bars - 2

      for (let i = 0; i < bars; i++) {
        const height = Math.random() * canvas.height * 0.8 + canvas.height * 0.1
        const x = i * (barWidth + 2)
        const y = (canvas.height - height) / 2

        ctx.fillStyle = `rgba(59, 130, 246, ${0.4 + Math.random() * 0.6})`
        ctx.beginPath()
        ctx.roundRect(x, y, barWidth, height, 2)
        ctx.fill()
      }

      animRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  return (
    <div className="flex items-center gap-3 mb-3 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
      <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
      <canvas ref={canvasRef} width={200} height={32} className="flex-1 max-w-48" />
      <span className="text-sm text-red-600 dark:text-red-400 font-medium">녹음 중...</span>
    </div>
  )
}
