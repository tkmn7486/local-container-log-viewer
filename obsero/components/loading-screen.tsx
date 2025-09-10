"use client"

import { useEffect, useState } from "react"

interface LoadingScreenProps {
  isLoading: boolean
}

export function LoadingScreen({ isLoading }: LoadingScreenProps) {
  const [shouldShow, setShouldShow] = useState(isLoading)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isLoading) {
      setShouldShow(true)
      // ふわっと現れるアニメーション開始
      setTimeout(() => setIsVisible(true), 100)
    } else {
      // 最低1.5秒表示を保証
      const timer = setTimeout(() => {
        setIsVisible(false)
        // フェードアウト完了後に非表示
        setTimeout(() => setShouldShow(false), 300)
      }, 1500)

      return () => clearTimeout(timer)
    }
  }, [isLoading])

  if (!shouldShow) return null

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center">
      <div
        className={`flex flex-col items-center space-y-6 transition-all duration-700 ease-out ${
          isVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4"
        }`}
      >
        <div className="relative">
          <div className={`h-20 w-20 transition-all duration-1000 ${isVisible ? "logo-spin" : ""}`}>
            <svg viewBox="0 0 80 80" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Container outline */}
              <rect
                x="12"
                y="20"
                width="56"
                height="40"
                rx="4"
                stroke="currentColor"
                strokeWidth="2"
                className="text-primary"
              />

              {/* Log lines representing data flow */}
              <g className="text-accent">
                <line x1="18" y1="28" x2="32" y2="28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="18" y1="34" x2="45" y2="34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="18" y1="40" x2="38" y2="40" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="18" y1="46" x2="52" y2="46" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="18" y1="52" x2="42" y2="52" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </g>

              {/* Monitoring eye/lens */}
              <circle
                cx="58"
                cy="35"
                r="8"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                className="text-primary"
              />
              <circle cx="58" cy="35" r="4" fill="currentColor" className="text-accent" />

              {/* Data flow indicators */}
              <g className="text-accent opacity-60">
                <circle cx="22" cy="28" r="1.5" fill="currentColor" />
                <circle cx="22" cy="34" r="1.5" fill="currentColor" />
                <circle cx="22" cy="40" r="1.5" fill="currentColor" />
                <circle cx="22" cy="46" r="1.5" fill="currentColor" />
                <circle cx="22" cy="52" r="1.5" fill="currentColor" />
              </g>
            </svg>
          </div>
          <div
            className={`absolute inset-0 bg-primary/20 rounded-full blur-xl transition-all duration-1000 ${
              isVisible ? "animate-pulse scale-110" : "scale-100"
            }`}
          />
        </div>
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-bold text-foreground tracking-wide">obsero</h2>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
          </div>
          <p className="text-sm text-muted-foreground">コンテナ情報を読み込み中...</p>
        </div>
      </div>
    </div>
  )
}
