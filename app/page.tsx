"use client"

import { useState } from "react"
import { StockSearch } from "@/components/stock-search"
import { QuantResultCard } from "@/components/quant-result-card"

interface QuantResult {
  stockName: string
  businessModel?: string
  totalScore: number
  valueScore: number
  growthScore: number
  safetyScore: number
  insight: string
  recommendation: "buy" | "hold" | "sell"
}

// Mock data for demonstration
const mockResults: Record<string, QuantResult> = {
  "삼성전자": {
    stockName: "삼성전자",
    businessModel: "반도체·가전 등을 팔아 전 세계에 제품을 공급하며 돈을 법니다",
    totalScore: 82,
    valueScore: 78,
    growthScore: 85,
    safetyScore: 83,
    insight: "반도체 업황 개선과 견고한 재무구조로 장기 투자에 적합합니다",
    recommendation: "buy"
  },
  "애플": {
    stockName: "Apple Inc.",
    businessModel: "아이폰 같은 기기와 앱·구독 서비스를 팔아 돈을 법니다",
    totalScore: 88,
    valueScore: 72,
    growthScore: 91,
    safetyScore: 94,
    insight: "프리미엄 밸류에이션이지만 탁월한 성장성과 안정성을 보유하고 있습니다",
    recommendation: "buy"
  },
  "테슬라": {
    stockName: "Tesla Inc.",
    businessModel: "전기차와 에너지 제품을 팔고, 소프트웨어로 추가 수익을 냅니다",
    totalScore: 65,
    valueScore: 45,
    growthScore: 89,
    safetyScore: 52,
    insight: "높은 성장 잠재력이 있으나 변동성이 크므로 신중한 접근이 필요합니다",
    recommendation: "hold"
  },
  "카카오": {
    stockName: "카카오",
    businessModel: "메신저 기반 광고·콘텐츠·결제 서비스로 돈을 법니다",
    totalScore: 58,
    valueScore: 68,
    growthScore: 52,
    safetyScore: 55,
    insight: "현재 밸류에이션은 매력적이나 성장 모멘텀 회복이 필요합니다",
    recommendation: "hold"
  },
  "네이버": {
    stockName: "NAVER",
    businessModel: "검색·광고와 커머스·콘텐츠·클라우드로 돈을 법니다",
    totalScore: 75,
    valueScore: 71,
    growthScore: 78,
    safetyScore: 76,
    insight: "AI 사업 확장과 안정적인 광고 수익으로 균형 잡힌 투자처입니다",
    recommendation: "buy"
  }
}

function getRandomResult(query: string): QuantResult {
  // Check if we have mock data for this query
  const normalizedQuery = query.toLowerCase()
  for (const [key, value] of Object.entries(mockResults)) {
    if (key.toLowerCase().includes(normalizedQuery) || normalizedQuery.includes(key.toLowerCase())) {
      return value
    }
  }
  
  // Generate random result for unknown stocks
  const totalScore = Math.floor(Math.random() * 60) + 30
  const valueScore = Math.floor(Math.random() * 50) + 40
  const growthScore = Math.floor(Math.random() * 50) + 40
  const safetyScore = Math.floor(Math.random() * 50) + 40
  
  let insight: string
  let recommendation: "buy" | "hold" | "sell"
  
  if (totalScore >= 70) {
    insight = "전반적으로 양호한 퀀트 지표를 보여 투자 매력도가 높습니다"
    recommendation = "buy"
  } else if (totalScore >= 50) {
    insight = "현재 가격대에서 관망하며 추가 분석이 권장됩니다"
    recommendation = "hold"
  } else {
    insight = "현재 퀀트 지표가 부정적이므로 투자에 주의가 필요합니다"
    recommendation = "sell"
  }
  
  return {
    stockName: query,
    totalScore,
    valueScore,
    growthScore,
    safetyScore,
    insight,
    recommendation
  }
}

export default function Home() {
  const [result, setResult] = useState<QuantResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSearch = async (query: string) => {
    try {
      setIsLoading(true)
      setResult(null)

      const res = await fetch("/api/quant-analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const message = data?.error ?? "알 수 없는 오류가 발생했습니다."
        alert(message)
        return
      }

      const data = await res.json()
      const quantResult: QuantResult = {
        stockName: data.stockName,
        businessModel: data.businessModel,
        totalScore: data.totalScore,
        valueScore: data.valueScore,
        growthScore: data.growthScore,
        safetyScore: data.safetyScore,
        insight: data.insight,
        recommendation: data.recommendation,
      }

      setResult(quantResult)
    } catch (error) {
      console.error(error)
      alert("퀀트 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setResult(null)
  }

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      {!result ? (
        // Search View
        <div className="flex flex-col items-center gap-8 w-full animate-in fade-in duration-500">
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-semibold text-foreground tracking-tight mb-3">
              분석할 종목의 이름을 입력하세요.
            </h1>
            <p className="text-muted-foreground text-lg">
              AI가 퀀트 지표를 분석해 드립니다
            </p>
          </div>
          
          <StockSearch onSearch={handleSearch} isLoading={isLoading} />
          
          {isLoading && (
            <div className="flex items-center gap-3 text-muted-foreground animate-pulse">
              <div className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          )}
          
          {/* Example stocks */}
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {["삼성전자", "애플", "테슬라", "네이버"].map((stock) => (
              <button
                key={stock}
                onClick={() => handleSearch(stock)}
                disabled={isLoading}
                className="px-4 py-2 text-sm text-muted-foreground bg-muted/50 
                         rounded-full hover:bg-muted hover:text-foreground
                         transition-all duration-200 disabled:opacity-50"
              >
                {stock}
              </button>
            ))}
          </div>
        </div>
      ) : (
        // Result View
        <QuantResultCard result={result} onReset={handleReset} />
      )}
    </main>
  )
}
