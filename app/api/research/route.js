import Anthropic from "@anthropic-ai/sdk";

export async function POST(request) {
  const { topic, mode } = await request.json();

  if (!topic) {
    return Response.json({ error: "Topic is required" }, { status: 400 });
  }

  try {
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const isSupplier = mode === "supplier";

    const system = isSupplier
      ? `You are MeridianAI, a B2B supply chain intelligence engine. When given a commodity or material, research current market prices, identify key suppliers, and return a structured HTML report.

Use only <p>, <strong>, <table>, <tr>, <th>, <td> tags. No markdown.

Structure your response exactly like this:

<p><strong>Market overview:</strong> Current state of this commodity market with latest price data and trends</p>

<p><strong>Current price range:</strong> Provide specific current price ranges per unit/ton/kg with currency</p>

<p><strong>Supplier comparison:</strong></p>
<table>
<tr><th>Supplier / Region</th><th>Est. Price Range</th><th>Reputation</th><th>Location</th><th>Reliability Score</th><th>Notes</th></tr>
[Add 5-6 real supplier rows with actual data]
</table>

<p><strong>Best value pick:</strong> Which supplier/region offers the best combination of price and reliability and why</p>

<p><strong>Supply chain risks:</strong> Current risks affecting this commodity — tariffs, shortages, geopolitical issues</p>

<p><strong>Price outlook:</strong> Is this commodity expected to get cheaper or more expensive in the next 30-90 days and why</p>

<p><strong>Recommendation:</strong> Clear actionable advice — should the buyer lock in prices now, wait, or diversify suppliers</p>

Always search the web first for real current data. Be specific with numbers.`
      : `You are MeridianAI, a B2B market intelligence engine. Research the given topic and return a sharp HTML briefing using only <p> and <strong> tags.

Structure:
<p><strong>Overview:</strong> current state with real data</p>
<p><strong>Key development 1:</strong> recent news and why it matters</p>
<p><strong>Key development 2:</strong> another signal with numbers</p>
<p><strong>Key development 3:</strong> third catalyst</p>
<p><strong>Watch for:</strong> forward-looking risks or catalysts</p>
<p><strong>Sentiment:</strong> bullish, bearish, or neutral and why</p>

Always search the web first.`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      system,
      messages: [
        {
          role: "user",
          content: isSupplier
            ? `Research current market prices, suppliers, and supply chain intelligence for: "${topic}". Search for the latest real pricing data, supplier information, and market conditions right now.`
            : `Research and generate a current intelligence briefing for: "${topic}". Search for the latest real news and data right now.`,
        },
      ],
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    const lower = text.toLowerCase();
    const sentiment = lower.includes("bullish")
      ? "bull"
      : lower.includes("bearish")
      ? "bear"
      : "neut";

    return Response.json({ report: text, sentiment });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}