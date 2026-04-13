import Anthropic from "@anthropic-ai/sdk";

export async function POST(request) {
  const { topic } = await request.json();

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: `What is the Yahoo Finance ticker symbol for "${topic}"? 
        
        Rules:
        - For stocks: return the stock ticker e.g. AAPL, TSLA, NVDA
        - For crypto: return symbol with -USD e.g. BTC-USD, ETH-USD, SOL-USD
        - For commodities: gold=GC=F, silver=SI=F, oil=CL=F, natural gas=NG=F, copper=HG=F, wheat=ZW=F, corn=ZC=F, platinum=PL=F
        - For indices: S&P 500=^GSPC, Nasdaq=^IXIC, Dow=^DJI
        - If no chart is possible (e.g. general topics like "inflation policy"), return NONE
        
        Return ONLY the ticker symbol or NONE. Nothing else.`
      }]
    });

    const symbol = response.content[0].text.trim().toUpperCase();
    return Response.json({ symbol });
  } catch (err) {
    return Response.json({ symbol: 'NONE' });
  }
}