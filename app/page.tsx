"use client"

import { useState } from "react"
import { Search } from "lucide-react"
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

const MOCK_STOCKS = [
  { id: 1, name: "허브스팟", ticker: "HUBS", score: 92, bgColor: "bg-[#FFECE8]", dotColor: "bg-[#00C805]" },
  { id: 2, name: "서브 로보틱스", ticker: "SERV", score: 68, bgColor: "bg-[#FFF3E0]", dotColor: "bg-[#FFB900]" },
  { id: 3, name: "삼성전자", ticker: "005930.KS", score: 78, bgColor: "bg-[#F4ECFF]", dotColor: "bg-[#00C805]" },
]

export default function Home() {
  const [query, setQuery] = useState("")
  const [result, setResult] = useState<QuantResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return
    try {
      setIsLoading(true)
      setResult(null)
      const res = await fetch("/api/quant-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data?.error ?? "알 수 없는 오류가 발생했습니다.")
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
      alert("퀀트 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSearch(query)
  }

  const handleReset = () => {
    setResult(null)
    setQuery("")
  }

  if (result) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center px-6">
        <QuantResultCard result={result} onReset={handleReset} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center pt-20 px-6 font-sans">
      <div className="w-full max-w-md flex flex-col h-full">

        {/* 헤더 로고 */}
        <div className="text-xl font-serif font-bold text-gray-900 mb-6 tracking-tight">
          Daily Quant.
        </div>

        {/* 메인 타이틀 */}
        <h1 className="text-[2.75rem] font-extrabold text-gray-900 leading-[1.15] tracking-tight mb-10">
          분석하고 싶은<br />
          기업을<br />
          검색하세요
        </h1>

        {/* 검색창 */}
        <div className="w-full mb-8">
          <form
            onSubmit={handleFormSubmit}
            className="flex items-center bg-white rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.08)] px-6 py-4 border border-gray-50"
          >
            <Search className="w-6 h-6 text-gray-400 mr-3" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="삼성전자, 팔란티어, 또는 티커 입력"
              className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-400 text-lg"
              disabled={isLoading}
            />
            {isLoading && (
              <div className="flex items-center gap-1 ml-2">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            )}
          </form>
        </div>

        {/* 오늘의 퀀트 발견 */}
        <div className="bg-white rounded-[2rem] p-7 shadow-sm border border-gray-100 flex-1 mb-8">
          <h2 className="text-sm font-bold text-gray-500 mb-5 tracking-wide">
            [오늘의 퀀트 발견]
          </h2>
          <div className="flex flex-col space-y-3">
            {MOCK_STOCKS.map((stock) => (
              <div
                key={stock.id}
                onClick={() => handleSearch(stock.ticker)}
                className={`flex justify-between items-center p-4 rounded-2xl ${stock.bgColor} cursor-pointer hover:opacity-80 transition-opacity`}
              >
                <span className="font-bold text-gray-900 text-lg">
                  {stock.name} ({stock.ticker})
                </span>
                <div className="flex items-center">
                  <span className={`w-3 h-3 rounded-full ${stock.dotColor} mr-2 shadow-sm`}></span>
                  <span className="font-bold text-gray-900">{stock.score}점</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}