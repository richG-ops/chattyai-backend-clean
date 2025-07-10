'use client'

import { useEffect, useState } from 'react'
import Confetti from 'react-confetti'

interface ConfettiEffectProps {
  isActive: boolean
  onComplete?: () => void
}

export function ConfettiEffect({ isActive, onComplete }: ConfettiEffectProps) {
  const [windowDimensions, setWindowDimensions] = useState({
    width: 0,
    height: 0
  })
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      })

      const handleResize = () => {
        setWindowDimensions({
          width: window.innerWidth,
          height: window.innerHeight
        })
      }

      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }
  }, [])

  useEffect(() => {
    if (isActive) {
      setShowConfetti(true)
      // Auto-stop after 3 seconds
      const timer = setTimeout(() => {
        setShowConfetti(false)
        onComplete?.()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isActive, onComplete])

  if (!showConfetti || windowDimensions.width === 0) {
    return null
  }

  return (
    <Confetti
      width={windowDimensions.width}
      height={windowDimensions.height}
      recycle={false}
      numberOfPieces={200}
      gravity={0.1}
      colors={['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981']}
      wind={0.02}
      initialVelocityY={10}
      opacity={0.8}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999,
        pointerEvents: 'none'
      }}
    />
  )
} 