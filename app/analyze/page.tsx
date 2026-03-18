"use client"

import { Suspense } from "react"
import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { QuantResultCard } from "@/components/quant-result-card"

interface QuantResult {
  stockName: string
  symbol?: string
  businessModel?: string
  beginnerChecklist?: Array<{ title: string; description: string }>
  totalScore: number
  valueScore: number
  growthScore: number
  safetyScore: number
  insight: string
  recommendation: "buy" | "hold" | "sell"
  isDataMissing?: boolean
}

function AnalyzeContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const query = searchParams.get("q") ?? ""

  const [result, setResult] = useState<QuantResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!query) { router.push("/"); return }
    const analyze = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const res = await fetch("/api/quant-analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          setError(data?.error ?? "알 수 없는 오류가 발생했습니다.")
          return
        }
        const data = await res.json()
        setResult({
          stockName: data.stockName,
          symbol: data.symbol,
          businessModel: data.businessModel,
          beginnerChecklist: data.beginnerChecklist,
          totalScore: data.totalScore,
          valueScore: data.valueScore,
          growthScore: data.growthScore,
          safetyScore: data.safetyScore,
          insight: data.insight,
          recommendation: data.recommendation,
          isDataMissing: data.isDataMissing,
        })
      } catch {
        setError("퀀트 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.")
      } finally {
        setIsLoading(false)
      }
    }
    analyze()
  }, [query])

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center px-6">
      {isLoading && (
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <p className="text-sm text-gray-400">'{query}' 분석 중...</p>
        </div>
      )}
      {error && !isLoading && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={() => router.push("/")} className="text-sm text-gray-400 hover:text-gray-600">
            다시 검색하기
          </button>
        </div>
      )}
      {result && !isLoading && (
        <QuantResultCard result={result} onReset={() => router.push("/")} />
      )}
    </div>
  )
}

export default function AnalyzePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">로딩 중...</div>}>
      <AnalyzeContent />
    </Suspense>
  )
}