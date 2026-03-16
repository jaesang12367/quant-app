import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import YahooFinance from "yahoo-finance2"
const yahooFinance = new YahooFinance()

const CLAUDE_MODEL = "claude-sonnet-4-6"
const CLAUDE_MAX_TOKENS = 700

interface QuantApiResponse {
  stockName: string
  totalScore: number
  valueScore: number
  growthScore: number
  safetyScore: number
  insight: string
  recommendation: "buy" | "hold" | "sell"
}

async function fetchJson(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`API 오류: ${res.status} ${res.statusText}`)
  return res.json()
}

async function searchSymbol(query: string): Promise<{ symbol: string; name: string }> {
  // 이미 티커처럼 보이면 바로 반환
  if (/^[A-Z]{1,6}(\.[A-Z]{1,2})?$/.test(query.trim())) {
    return { symbol: query.trim(), name: query.trim() }
  }

  // 한글이 포함된 경우 Claude로 티커 변환
  const hasKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(query)
  if (hasKorean) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error("Anthropic API 키가 설정되지 않았습니다.")
    const anthropic = new Anthropic({ apiKey })
    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 100,
      messages: [{
        role: "user",
        content: `"${query}"의 Yahoo Finance 티커 심볼을 알려줘. 티커만 한 단어로 답해. 예: 삼성전자 → 005930.KS, 카카오 → 035720.KS, SK하이닉스 → 000660.KS`
      }],
    })
    const ticker = message.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9.]/g, "")

    if (ticker) {
      return { symbol: ticker, name: query }
    }
  }

  // 영문 종목명은 Yahoo Finance search 사용
  const results = await yahooFinance.search(query)
  const quotes = results.quotes.filter((q: any) => q.quoteType === "EQUITY")
  if (!quotes || quotes.length === 0) {
    throw new Error(`'${query}'에 해당하는 종목을 찾을 수 없습니다.`)
  }
  const best: any = quotes[0]
  return {
    symbol: String(best.symbol),
    name: String(best.longname ?? best.shortname ?? best.symbol),
  }
}
async function getFinancialData(symbol: string) {
  const [quote, summary]: [any, any] = await Promise.all([
    yahooFinance.quote(symbol),
    yahooFinance.quoteSummary(symbol, {
      modules: ["financialData", "defaultKeyStatistics", "summaryProfile"],
    }),
  ])

  const fin = summary.financialData ?? {}
  const stats = summary.defaultKeyStatistics ?? {}
  const profile = summary.summaryProfile ?? {}

  return {
    symbol,
    name: quote.longName ?? quote.shortName ?? symbol,
    data: {
      sector: profile.sector,
      industry: profile.industry,
      marketCap: quote.marketCap,
      peRatio: quote.trailingPE,
      pbRatio: stats.priceToBook,
      eps: stats.trailingEps,
      dividendYield: quote.dividendYield,
      profitMargin: fin.profitMargins,
      operatingMargin: fin.operatingMargins,
      roe: fin.returnOnEquity,
      revenueGrowth: fin.revenueGrowth,
      debtToEquity: fin.debtToEquity,
      currentRatio: fin.currentRatio,
      price: quote.regularMarketPrice,
      changePercent: quote.regularMarketChangePercent,
      high52: quote.fiftyTwoWeekHigh,
      low52: quote.fiftyTwoWeekLow,
    },
  }
}

async function callClaude(stockName: string, symbol: string, financialData: unknown): Promise<QuantApiResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("Anthropic API 키가 설정되지 않았습니다.")
  const systemPrompt =
    "너는 제공된 JSON 재무 데이터(PER, ROE, PBR 등)에 있는 '정확한 숫자'만을 기반으로 분석해야 해. " +
    "데이터에 없는 내용은 절대 너의 사전 지식으로 지어내지 마(No Hallucination).\n\n" +
    "특히 한국 주식의 경우 야후 파이낸스에서 부채비율(debtToEquity)이나 특정 데이터가 누락되어 null로 들어오는 경우가 있어. " +
    "만약 특정 데이터가 없다면, 그 지표가 문제라는 식의 부정적인 언급이나 짐작을 절대 하지 마. " +
    "있는 데이터만 가지고 피터 린치 스타일로 장점을 분석해.\n\n" +
    "출력은 0~100점 종합 점수와 아래 형식의 4줄 평을 JSON으로 반환해.\n\n" +
"verdict 형식 (줄바꿈 \\n으로 구분):\n" +
"1줄: 신호등 이모지 + 핵심 결론 한 문장\n" +
"2줄: 긍정 포인트 (데이터에 있는 숫자 포함)\n" +
"3줄: 리스크 또는 주의사항\n" +
"4줄: 투자 액션 제안\n\n" +
    '{ "stockName": string, "totalScore": number, "valueScore": number, "growthScore": number, "safetyScore": number, "verdict": string }\n\n' +
    "JSON 이외의 설명/코드블록/텍스트는 절대 쓰지 말 것."
  const userContent = `분석 대상 종목: ${stockName} (${symbol})\n\n아래는 Yahoo Finance에서 가져온 재무 데이터이다.\n\n${JSON.stringify(financialData)}`
  const anthropic = new Anthropic({ apiKey })
  const message = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: CLAUDE_MAX_TOKENS,
    system: systemPrompt,
    messages: [{ role: "user", content: userContent }],
  })
  const text = message.content.filter((b) => b.type === "text").map((b) => b.text).join("\n")
  if (!text) throw new Error("Claude 응답을 파싱할 수 없습니다.")
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim()
  let parsed: any
  try { parsed = JSON.parse(cleaned) } catch { throw new Error("Claude가 올바른 JSON을 반환하지 않았습니다.") }
  return {
    stockName: parsed.stockName ?? stockName,
    totalScore: Number(parsed.totalScore ?? 0),
    valueScore: Number(parsed.valueScore ?? 0),
    growthScore: Number(parsed.growthScore ?? 0),
    safetyScore: Number(parsed.safetyScore ?? 0),
    insight: String(parsed.verdict ?? ""),
    recommendation: (() => {
      const v = String(parsed.verdict ?? "")
      if (v.includes("🟢")) return "buy"
      if (v.includes("🟡")) return "hold"
      if (v.includes("🔴")) return "sell"
      const s = Number(parsed.totalScore ?? 0)
      return s >= 70 ? "buy" : s >= 50 ? "hold" : "sell"
    })(),
  }
}
export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json()
    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "종목명을 문자열로 전달해주세요." }, { status: 400 })
    }
    try {
      const { symbol, name: resolvedName } = await searchSymbol(query)
      const { name, data } = await getFinancialData(symbol)
      const stockName = name !== symbol ? name : resolvedName
      const aiResult = await callClaude(stockName, symbol, { source: "Yahoo Finance", symbol, stockName, ...data })
      return NextResponse.json({ ...aiResult, stockName })
    } catch (err: any) {
      console.error("Yahoo Finance 연동 실패, Claude 단독 분석으로 폴백합니다.", err)
      const aiResult = await callClaude(query, query, {
        source: "fallback-without-yf",
        originalQuery: query,
        error: String(err?.message ?? err),
      })
      return NextResponse.json({ ...aiResult, stockName: query })
    }
  } catch (error: any) {
    console.error(error)
    return NextResponse.json({ error: error?.message ?? "퀀트 분석 중 알 수 없는 오류가 발생했습니다." }, { status: 500 })
  }
}