export const maxDuration = 60;

export async function POST(request) {
  const { topic } = await request.json();

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://meridianai.vercel.app",
        "X-Title": "MeridianAI",
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        max_tokens: 20,
        messages: [{
          role: "user",
          content: `What is the Yahoo Finance ticker symbol for "${topic}"?
          
Rules:
- Stocks: return ticker e.g. AAPL, TSLA, NVDA
- Crypto: return with -USD e.g. BTC-USD, ETH-USD
- Commodities: gold=GC=F, silver=SI=F, oil=CL=F, natural gas=NG=F, copper=HG=F, wheat=ZW=F
- Indices: S&P 500=^GSPC, Nasdaq=^IXIC, Dow=^DJI
- If no chart possible, return NONE

Return ONLY the ticker symbol or NONE. Nothing else.`
        }],
      }),
    });

    const data = await res.json();
    const symbol = data.choices?.[0]?.message?.content?.trim().toUpperCase() || "NONE";
    return Response.json({ symbol });
  } catch {
    return Response.json({ symbol: "NONE" });
  }
}