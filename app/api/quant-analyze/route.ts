import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import YahooFinance from "yahoo-finance2"
import * as cheerio from 'cheerio';

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] })
const CLAUDE_MODEL = "claude-sonnet-4-6"
const CLAUDE_MAX_TOKENS = 1200

interface QuantApiResponse {
  stockName: string
  businessModel: string
  beginnerChecklist: Array<{ title: string; description: string }>
  totalScore: number
  valueScore: number
  growthScore: number
  safetyScore: number
  insight: string
  recommendation: "buy" | "hold" | "sell"
  isDataMissing?: boolean
}
//  cheerio를 설치하셨다면 상단에 import 추가: import * as cheerio from 'cheerio';

async function scrapeNaverFinance(ticker: string) {
  try {
    // 한국 종목 (숫자 6자리)인지 확인
    const isKorean = /^\d{6}/.test(ticker);
    const cleanTicker = ticker.replace(/[^0-9]/g, "");
    
    // 한국 주식일 경우 네이버 금융 상세 페이지
    const url = isKorean 
      ? `https://finance.naver.com/item/main.naver?code=${cleanTicker}`
      : `https://finance.naver.com/world/sise.naver?symbol=${ticker}`;

    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const html = await res.text();
    const $ = cheerio.load(html);

    if (isKorean) {
      // 한국 주식 데이터 파싱 (네이버 금융 DOM 구조 기준)
      const price = $(".no_today .blind").first().text().replace(/[^0-9]/g, "");
      const peRatio = $("#_per").text();
      const roe = $("#_roe").text();
      const pbr = $("#_pbr").text();

      return {
        source: "Naver Finance (KR)",
        price: price ? parseInt(price) : null,
        peRatio: peRatio ? parseFloat(peRatio) : null,
        roe: roe ? parseFloat(roe) : null,
        pbRatio: pbr ? parseFloat(pbr) : null,
      };
    } else {
      // 미국 주식 등 해외 주식 (네이버 해외주식 기준)
      const price = $(".price_info .today .no_today").text().replace(/[^0-9.]/g, "");
      return {
        source: "Naver Finance (Global)",
        price: price ? parseFloat(price) : null,
      };
    }
  } catch (err) {
    console.error("네이버 크롤링 실패:", err);
    return null;
  }
}
async function searchSymbol(query: string): Promise<{ symbol: string; name: string }> {
  const trimmed = query.trim()
  if (/^[A-Za-z0-9.\-]{1,12}$/.test(trimmed)) {
    return { symbol: trimmed.toUpperCase(), name: trimmed.toUpperCase() }
  }
  const hasKorean = /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(trimmed)
  if (hasKorean) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error("Anthropic API 키가 설정되지 않았습니다.")
    const anthropic = new Anthropic({ apiKey })
    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 50,
      messages: [{
        role: "user",
        content: `"${trimmed}"의 Yahoo Finance 티커 심볼만 한 단어로 답해. 예: 삼성전자→005930.KS 카카오→035720.KS SK하이닉스→000660.KS 현대차→005380.KS 네이버→035420.KS`,
      }],
    })
    const ticker = message.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9.]/g, "")
    if (ticker) return { symbol: ticker, name: trimmed }
  }
  const results = await yf.search(trimmed)
  const quotes = (results.quotes ?? []).filter((q: any) => q.quoteType === "EQUITY")
  if (quotes.length === 0) throw new Error(`'${trimmed}'에 해당하는 종목을 찾을 수 없습니다.`)
  const best = quotes[0]
  return { symbol: best.symbol, name: best.longname ?? best.shortname ?? best.symbol }
}
async function getFinancialData(symbol: string) {
  const [quote, summary] = await Promise.all([
    yf.quote(symbol),
    yf.quoteSummary(symbol, {
      modules: ["financialData", "defaultKeyStatistics", "summaryProfile"],
    }),
  ])
  const fin = summary.financialData ?? {}
  const stats = summary.defaultKeyStatistics ?? {}
  const profile = summary.summaryProfile ?? {}
  return {
    symbol,
    name: (quote.longName ?? quote.shortName ?? symbol) as string,
    data: {
      source: "Yahoo Finance",
      sector: profile.sector,
      industry: profile.industry,
      marketCap: quote.marketCap,
      price: quote.regularMarketPrice,
      changePercent: quote.regularMarketChangePercent,
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
      high52: quote.fiftyTwoWeekHigh,
      low52: quote.fiftyTwoWeekLow,
    },
  }
}

function hasMeaningfulData(data: any) {
  if (!data) return false
  const candidates = [data.price, data.marketCap, data.peRatio, data.pbRatio, data.roe]
  return candidates.some((v) => typeof v === "number" && Number.isFinite(v) && v !== 0)
}

async function callClaude(stockName: string, symbol: string, financialData: unknown): Promise<QuantApiResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("Anthropic API 키가 설정되지 않았습니다.")
  const systemPrompt =
    "너는 제공된 JSON 재무 데이터(PER, ROE, PBR 등)에 있는 '정확한 숫자'만을 기반으로 분석해야 해. " +
    "데이터에 없는 내용은 절대 너의 사전 지식으로 지어내지 마(No Hallucination).\n\n" +
    "특히 한국 주식의 경우 부채비율(debtToEquity)이나 특정 데이터가 누락되어 null로 들어오는 경우가 있어. " +
    "만약 특정 데이터가 없다면, 그 지표가 문제라는 식의 부정적인 언급이나 짐작을 절대 하지 마. " +
    "있는 데이터만 가지고 피터 린치 스타일로 장점을 분석해.\n\n" +
    "해당 기업이 정확히 무엇을 팔아서 어떻게 돈을 버는지 초등학생도 이해할 수 있는 1줄짜리 비즈니스 모델 요약을 작성해.\n\n" +
    "주식 초보자를 위해 피터 린치의 3대 원칙을 바탕으로 한 체크리스트 3가지를 작성해. " +
    "beginnerChecklist는 반드시 길이가 3인 배열이며, 각 원소는 { title: string, description: string } 형태여야 해.\n" +
    "- 1) title: \"비즈니스가 단순한가?\" / description: 회사가 무엇을 팔아 돈을 버는지 아주 쉽게 1~2문장\n" +
    "- 2) title: \"성장성에 비해 주가가 싼가?\" / description: 성장 관련 숫자/지표(가능한 경우)를 인용해 초보자 말투로\n" +
    "- 3) title: \"불황을 버틸 현금이 있는가?\" / description: 부채/유동성 관련 숫자/지표(가능한 경우)를 인용해 초보자 말투로\n" +
    "데이터에 없는 내용은 절대 단정하거나 추측하지 말고, 없는 지표는 \"데이터가 없어 판단 보류\"처럼 중립적으로만 표현해.\n\n" +
    "출력은 0~100점 종합 점수와 아래 형식의 4줄 평을 JSON으로 반환해.\n\n" +
    "verdict 형식 (줄바꿈 \\n으로 구분):\n" +
    "1줄: 신호등 이모지 + 핵심 결론 한 문장\n" +
    "2줄: 긍정 포인트 (데이터에 있는 숫자 포함)\n" +
    "3줄: 리스크 또는 주의사항\n" +
    "4줄: 투자 액션 제안\n\n" +
    '{ "stockName": string, "businessModel": string, "beginnerChecklist": [{ "title": string, "description": string }], "totalScore": number, "valueScore": number, "growthScore": number, "safetyScore": number, "verdict": string }\n\n' +
    "You MUST return ONLY a valid JSON object. Do not include any markdown formatting like ```json. " +
    "Do not include any conversational text, preamble, or postamble. Only return the raw JSON starting with { and ending with }."
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
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  const cleaned = jsonMatch ? jsonMatch[0].trim() : text.trim()
  let parsed: any
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    return {
      stockName,
      businessModel: "데이터 수집 실패",
      beginnerChecklist: [{ title: "데이터 분석 불가", description: "재무 데이터를 불러올 수 없습니다. 잠시 후 다시 시도해 주세요." }],
      totalScore: 0, valueScore: 0, growthScore: 0, safetyScore: 0,
      insight: "일시적인 데이터 연결 실패 ⚠️\nAI 응답 지연이 발생했습니다.\n잠시 후 다시 검색해 주세요.",
      recommendation: "hold",
      isDataMissing: true,
    }
  }
  return {
    stockName: parsed.stockName ?? stockName,
    businessModel: String(parsed.businessModel ?? ""),
    beginnerChecklist: Array.isArray(parsed.beginnerChecklist)
      ? parsed.beginnerChecklist.slice(0, 3).map((item: any) => ({
          title: String(item?.title ?? ""),
          description: String(item?.description ?? ""),
        })).filter((item: any) => item.title || item.description)
      : [],
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

      if (!hasMeaningfulData(data)) {
        return NextResponse.json({
          stockName: name ?? resolvedName ?? query,
          businessModel: "데이터 수집 실패",
          beginnerChecklist: [{
            title: "데이터 분석 불가",
            description: "신뢰할 수 있는 재무 지표를 확보하지 못했습니다. 티커가 정확한지 다시 확인해 주세요.",
          }],
          totalScore: 0, valueScore: 0, growthScore: 0, safetyScore: 0,
          insight: "해당 종목의 재무 데이터를 확보하지 못해 분석을 진행할 수 없습니다.\n티커를 다시 확인한 뒤 잠시 후 다시 시도해 주세요.",
          recommendation: "hold",
          isDataMissing: true,
        } satisfies QuantApiResponse)
      }

      const stockName = name !== symbol ? name : resolvedName
      const aiResult = await callClaude(stockName, symbol, { symbol, stockName, ...data })
      return NextResponse.json({ ...aiResult, stockName, symbol })
    } catch (err: any) {
      console.error("Yahoo Finance 연동 실패, Claude 단독 분석으로 폴백합니다.", err)
      const aiResult = await callClaude(query, query, {
        source: "fallback-without-yf",
        originalQuery: query,
        error: String(err?.message ?? err),
      })
      return NextResponse.json({ ...aiResult, stockName: query })
    }
  } 
  
  catch (err: any) {
    console.error("Yahoo Finance 연동 실패, 네이버로 폴백합니다.", err);
    
    // 1. 네이버에서 데이터 긁어오기 시도
    const naverData = await scrapeNaverFinance(query);
    
    if (naverData && hasMeaningfulData(naverData)) {
      // 2. 네이버 데이터가 있다면 클로드에게 분석 요청
      const aiResult = await callClaude(query, query, {
        ...naverData,
        isFromNaver: true
      });
      return NextResponse.json({ ...aiResult, stockName: query });
    } else {
      // 3. 네이버마저 실패했을 때만 정직하게 에러 반환
      return NextResponse.json({
        stockName: query,
        businessModel: "데이터 수집 실패",
        beginnerChecklist: [{ 
          title: "데이터 분석 불가", 
          description: "야후와 네이버 모두에서 데이터를 가져오지 못했습니다. 티커를 확인해주세요." 
        }],
        totalScore: 0,
        insight: "현재 실시간 재무 데이터를 확보할 수 없습니다.\n잠시 후 다시 시도해 주세요.",
        recommendation: "hold",
        isDataMissing: true
      });
    }
  }
}