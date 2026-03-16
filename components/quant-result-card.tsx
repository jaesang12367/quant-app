"use client"

import { TrendingUp, Shield, Gem } from "lucide-react"

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

  return (
    <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Main Card */}
      <div 
        className={`bg-card rounded-3xl border-2 ${borderColor} p-8 shadow-sm
                    transition-all duration-300 hover:shadow-md`}
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

        {/* Three Metrics */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <MetricItem 
            icon={<Gem className="w-5 h-5" />}
            label="가성비"
            score={result.valueScore}
          />
          <MetricItem 
            icon={<TrendingUp className="w-5 h-5" />}
            label="성장성"
            score={result.growthScore}
          />
          <MetricItem 
            icon={<Shield className="w-5 h-5" />}
            label="안전성"
            score={result.safetyScore}
          />
        </div>

        {/* Finance term tooltips (minimal) */}
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mb-8 text-xs text-muted-foreground">
          <TermTooltip term="PER" description="PER: 투자금 회수 기간" />
          <TermTooltip term="PBR" description="PBR: 순자산 대비 가격" />
          <TermTooltip term="ROE" description="ROE: 내 돈을 굴리는 수익률" />
          <TermTooltip term="부채비율" description="부채비율: 빚이 자본에 비해 얼마나?" />
          <TermTooltip term="유동비율" description="유동비율: 단기 빚 갚을 여력" />
        </div>

        {/* AI Insight */}
        <div className="bg-muted/50 rounded-2xl p-5">
  <div className="flex flex-col gap-2">
    {result.insight.split("\n").map((line, i) => (
      <p
        key={i}
        className={`text-foreground/90 leading-relaxed
          ${i === 0 ? "text-center font-semibold text-base" : "text-sm text-foreground/75"}
          ${i === result.insight.split("\n").length - 1 ? "text-center font-medium" : ""}
        `}
      >
        {line}
      </p>
    ))}
  </div>
</div>
      </div>

      {/* Reset Button */}
      <button
        onClick={onReset}
        className="w-full mt-6 py-3 text-sm font-medium text-muted-foreground
                   hover:text-foreground transition-colors duration-200"
      >
        다른 종목 분석하기
      </button>
    </div>
  )
}

interface MetricItemProps {
  icon: React.ReactNode
  label: string
  score: number
}

function MetricItem({ icon, label, score }: MetricItemProps) {
  return (
    <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-muted/30">
      <div className="text-muted-foreground">
        {icon}
      </div>
      <span className="text-xs text-muted-foreground font-medium">
        {label}
      </span>
      <span className="text-lg font-semibold text-foreground">
        {score}
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
