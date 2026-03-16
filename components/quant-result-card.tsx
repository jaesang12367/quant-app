"use client"

import { useState } from "react"
import { TrendingUp, Shield, Gem } from "lucide-react"

import { toPng } from "html-to-image"
import { useRef } from "react"

interface QuantResult {
  stockName: string
  symbol?: string  // 이 줄 추가
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

interface QuantResultCardProps {
  result: QuantResult
  onReset: () => void
}

function getScoreColor(score: number) {
  if (score >= 70) return "green"
  if (score >= 40) return "yellow"
  return "red"
}

function getScoreGradient(score: number) {
  if (score >= 70) {
    return "from-emerald-400 via-green-500 to-teal-500"
  }
  if (score >= 40) {
    return "from-amber-400 via-yellow-500 to-orange-400"
  }
  return "from-red-400 via-rose-500 to-pink-500"
}

function getBorderColor(score: number) {
  if (score >= 70) return "border-score-green"
  if (score >= 40) return "border-score-yellow"
  return "border-score-red"
}

function getIndicatorEmoji(recommendation: string) {
  switch (recommendation) {
    case "buy": return "🟢"
    case "hold": return "🟡"
    case "sell": return "🔴"
    default: return "⚪"
  }
}

export function QuantResultCard({ result, onReset }: QuantResultCardProps) {
  const scoreColor = getScoreColor(result.totalScore)
  const scoreGradient = getScoreGradient(result.totalScore)
  const borderColor = getBorderColor(result.totalScore)
  const indicatorEmoji = getIndicatorEmoji(result.recommendation)
  const [isChecklistOpen, setIsChecklistOpen] = useState(false)

  const cardRef = useRef<HTMLDivElement>(null)


  const handleCapture = async () => {
    if (!cardRef.current) return
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        style: {
          borderRadius: "24px",
        },
      })
      const link = document.createElement("a")
      link.download = `${result.stockName}_퀀트분석.png`
      link.href = dataUrl
      link.click()
    } catch (e) {
      alert("이미지 저장에 실패했습니다. 다시 시도해주세요.")
    }
  }

  const checklist = result.beginnerChecklist ?? []
  const isDataMissing = result.isDataMissing

  return (
    <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Main Card */}
      <div 
        ref={cardRef} className={`bg-card rounded-3xl border-2 ${borderColor} p-8 shadow-sm ...`}
      >
        {/* Stock Name */}
        <div className="text-center mb-8">
          <span className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
            퀀트 분석 결과
          </span>
          <h2 className="text-2xl font-semibold text-foreground mt-1 tracking-tight">
            {result.stockName}
          </h2>
          {result.businessModel ? (
            <p className="mt-4 text-sm text-gray-500">
              {result.businessModel}
            </p>
          ) : null}
        </div>

        {/* Total Score */}
        {!isDataMissing && (
          <div className="text-center mb-10">
            <div className="relative inline-block">
              <span 
                className={`text-8xl font-bold bg-gradient-to-br ${scoreGradient} 
                            bg-clip-text text-transparent tracking-tighter`}
              >
                {result.totalScore}
              </span>
              <span className="absolute -top-1 -right-6 text-lg font-medium text-muted-foreground">
                점
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              퀀트 종합 점수
            </p>
          </div>
        )}

        {/* Three Metrics */}
        {!isDataMissing && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <MetricItem
              icon={<Gem className="w-5 h-5" />}
              label="가성비"
              score={result.valueScore}
              description="PER·PBR 기준으로 현재 주가가 기업 가치 대비 얼마나 저렴한지를 나타내요."
            />
            <MetricItem
              icon={<TrendingUp className="w-5 h-5" />}
              label="성장성"
              score={result.growthScore}
              description="매출·이익 성장률과 ROE를 기준으로 기업이 얼마나 빠르게 커가고 있는지를 나타내요."
            />
            <MetricItem
              icon={<Shield className="w-5 h-5" />}
              label="안전성"
              score={result.safetyScore}
              description="부채비율·유동비율을 기준으로 불황에도 버틸 수 있는 재무 체력을 나타내요."
            />
          </div>
        )}

        {/* Finance term tooltips (minimal) */}
        {!isDataMissing && (
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mb-8 text-xs text-muted-foreground">
            <TermTooltip term="PER" description="PER: 투자금 회수 기간" />
            <TermTooltip term="PBR" description="PBR: 순자산 대비 가격" />
            <TermTooltip term="ROE" description="ROE: 내 돈을 굴리는 수익률" />
            <TermTooltip term="부채비율" description="부채비율: 빚이 자본에 비해 얼마나?" />
            <TermTooltip term="유동비율" description="유동비율: 단기 빚 갚을 여력" />
          </div>
        )}

        {/* AI Insight or data-missing message */}
        <div className="bg-muted/50 rounded-2xl p-5">
          <div className="flex flex-col gap-2">
            {isDataMissing ? (
              <p className="text-center text-sm text-muted-foreground leading-relaxed">
                죄송합니다. 해당 종목의 실시간 재무 데이터를 확보하지 못해 분석을 진행할 수 없습니다.
                티커를 다시 확인한 뒤, 잠시 후 다시 시도해 주세요.
              </p>
            ) : (
              result.insight.split("\n").map((line, i, arr) => (
                <p
                  key={i}
                  className={`text-foreground/90 leading-relaxed
                    ${i === 0 ? "text-center font-semibold text-base" : "text-sm text-foreground/75"}
                    ${i === arr.length - 1 ? "text-center font-medium" : ""}
                  `}
                >
                  {line}
                </p>
              ))
            )}
          </div>
        </div>

        {/* Peter Lynch beginner checklist drawer */}
        {!isDataMissing && checklist.length > 0 ? (
          <div className="mt-10">
            <button
              type="button"
              onClick={() => setIsChecklistOpen((v) => !v)}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground
                         transition-colors duration-200"
              aria-expanded={isChecklistOpen}
            >
              {isChecklistOpen
                ? "− 주식 초보자를 위한 피터 린치 체크리스트 닫기"
                : "+ 주식 초보자를 위한 피터 린치 체크리스트 보기"}
            </button>

            <div
              className={`overflow-hidden transition-all duration-300 ease-out ${
                isChecklistOpen ? "max-h-96 opacity-100 mt-6" : "max-h-0 opacity-0 mt-0"
              }`}
            >
              <div className="space-y-6">
                {checklist.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="text-left">
                    <div className="text-sm font-medium text-foreground tracking-tight">
                      {item.title}
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      {item.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* 하단 버튼 영역 */}
      <div className="flex flex-col gap-2 mt-6">
        {/* 이미지 저장 */}
        <button
          onClick={handleCapture}
          className="w-full py-3.5 text-sm font-medium text-foreground
           bg-muted/70 rounded-2xl hover:bg-muted
           transition-all duration-200"
        >
          📸 이미지로 저장하기
        </button>

     {/* 토스증권 */}
        {!isDataMissing && (
          <a
          href={(() => {
            const symbol = result.symbol ?? ""
            const krMatch = symbol.match(/^(\d{6})\.(KS|KQ)$/i)
            if (krMatch) return `https://www.tossinvest.com/stocks/A${krMatch[1]}/order`
            return `https://www.tossinvest.com/stocks/${symbol}/order`
          })()}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3.5 text-sm font-medium text-white
                    bg-[#3182F6] rounded-2xl hover:bg-[#1B64DA]
                    transition-all duration-200 flex items-center justify-center"
        >
          🔵 토스증권에서 매수하기
        </a>
      )}

      {/* 다른 종목 */}
      <button
        onClick={onReset}
        className="w-full py-3.5 text-sm font-medium text-muted-foreground
           hover:text-foreground border border-muted rounded-2xl
           hover:border-foreground/20 transition-all duration-200"
      >
        🔍 다른 종목 분석하기
      </button>
    </div>
    </div>
  )
}

interface MetricItemProps {
  icon: React.ReactNode
  label: string
  score: number
  description: string
}

function MetricItem({ icon, label, score, description }: MetricItemProps) {
  const [open, setOpen] = useState(false)

  return (
    <div
      className={`flex flex-col items-center gap-2 p-3 rounded-xl bg-muted/30 cursor-pointer
                  transition-all duration-200 hover:bg-muted/50 select-none
                  ${open ? "ring-1 ring-foreground/10" : ""}`}
      onClick={() => setOpen((v) => !v)}
    >
      <div className="text-muted-foreground">{icon}</div>
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <span className="text-lg font-semibold text-foreground">{score}</span>
      <div
        className={`overflow-hidden transition-all duration-300 ease-out w-full
                    ${open ? "max-h-24 opacity-100 mt-1" : "max-h-0 opacity-0"}`}
      >
        <p className="text-xs text-muted-foreground leading-relaxed text-center">
          {description}
        </p>
      </div>
      <span className="text-xs text-muted-foreground/50">
        {open ? "▲" : "▼"}
      </span>
    </div>
  )
}

function TermTooltip({ term, description }: { term: string; description: string }) {
  return (
    <span className="relative inline-flex group">
      <button
        type="button"
        className="border-b border-dashed border-muted-foreground/50 leading-none pb-0.5
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/10 rounded-sm"
      >
        {term}
      </button>
      <span
        className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 -translate-x-1/2
                   whitespace-nowrap rounded-md bg-black px-2 py-1 text-[11px] leading-snug text-white shadow
                   opacity-0 translate-y-1 transition-all duration-200
                   group-hover:opacity-100 group-hover:translate-y-0
                   group-focus-within:opacity-100 group-focus-within:translate-y-0"
      >
        {description}
      </span>
    </span>
  )
}
